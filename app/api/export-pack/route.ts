import { NextRequest, NextResponse } from "next/server";
import JSZip from "jszip";
import { createClient } from "@/lib/supabase-server";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

const MAX_SHOTS = 20;

type ProjectRow = {
  id: string;
  owner_id: string;
  name: string;
  client: string | null;
  aspect: string;
  concept_title: string | null;
  concept_hook: string | null;
  concept_palette: string[] | null;
};

type ShotRow = {
  id: string;
  order_index: number;
  sequence_name: string | null;
  title: string | null;
  ref_item_id: string | null;
  video_prompt: string | null;
  model: string | null;
  aspect: string | null;
  motion: string | null;
  duration: number | null;
  voiceover: string | null;
  status: string | null;
};

type BoardItemRow = {
  id: string;
  filename: string | null;
  tag: string | null;
  is_ref: boolean | null;
  is_generated: boolean | null;
  image_url: string | null;
  storage_path: string | null;
  image_prompt: string | null;
  video_prompt: string | null;
  video_model: string | null;
};

type ConceptRow = {
  id: string;
  title: string;
  hook: string | null;
  vibe: string[] | null;
  palette: string[] | null;
  length_seconds: number | null;
  shot_count: number | null;
  is_selected: boolean | null;
};

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "project"
  );
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function extFromUrl(url: string, fallbackMime?: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.toLowerCase();
    const m = path.match(/\.([a-z0-9]{1,5})(?:$|\?)/);
    if (m) {
      const ext = m[1];
      if (["png", "jpg", "jpeg", "webp", "gif", "svg"].includes(ext)) return ext === "jpeg" ? "jpg" : ext;
    }
  } catch {
    // ignore
  }
  if (fallbackMime) {
    if (fallbackMime.includes("png")) return "png";
    if (fallbackMime.includes("jpeg") || fallbackMime.includes("jpg")) return "jpg";
    if (fallbackMime.includes("webp")) return "webp";
    if (fallbackMime.includes("gif")) return "gif";
  }
  return "png";
}

async function fetchBuffer(url: string): Promise<{ buf: Buffer; ext: string } | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) return null;
    const mime = res.headers.get("content-type") || undefined;
    const ab = await res.arrayBuffer();
    return { buf: Buffer.from(ab), ext: extFromUrl(url, mime) };
  } catch {
    return null;
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const projectId = searchParams.get("project");
  if (!projectId) {
    return NextResponse.json({ error: "project query param is required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Fetch project — RLS will block non-owners/non-collaborators, but we
  // also double-check ownership/collaborator status before leaking data.
  const { data: projectData, error: projErr } = await supabase
    .from("projects")
    .select("id, owner_id, name, client, aspect, concept_title, concept_hook, concept_palette")
    .eq("id", projectId)
    .maybeSingle();
  if (projErr) {
    return NextResponse.json({ error: projErr.message }, { status: 500 });
  }
  const project = projectData as ProjectRow | null;
  if (!project) {
    return NextResponse.json({ error: "Project not found" }, { status: 404 });
  }

  // Ownership / collaborator check (defense in depth on top of RLS).
  if (project.owner_id !== user.id) {
    const email = (user.email || "").toLowerCase();
    let allowed = false;
    if (email) {
      const { data: collab } = await supabase
        .from("collaborators")
        .select("id")
        .eq("project_id", projectId)
        .eq("invited_email", email)
        .limit(1)
        .maybeSingle();
      allowed = !!collab;
    }
    if (!allowed) {
      const { data: collab2 } = await supabase
        .from("collaborators")
        .select("id")
        .eq("project_id", projectId)
        .eq("user_id", user.id)
        .limit(1)
        .maybeSingle();
      allowed = !!collab2;
    }
    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  // Concept (selected one)
  const { data: conceptsData } = await supabase
    .from("concepts")
    .select("id, title, hook, vibe, palette, length_seconds, shot_count, is_selected")
    .eq("project_id", projectId);
  const concepts = (conceptsData || []) as ConceptRow[];
  const selectedConcept =
    concepts.find((c) => c.is_selected) || concepts[0] || null;

  // Shots ordered
  const { data: shotsData, error: shotsErr } = await supabase
    .from("shots")
    .select(
      "id, order_index, sequence_name, title, ref_item_id, video_prompt, model, aspect, motion, duration, voiceover, status",
    )
    .eq("project_id", projectId)
    .order("order_index", { ascending: true });
  if (shotsErr) {
    return NextResponse.json({ error: shotsErr.message }, { status: 500 });
  }
  const shots = (shotsData || []) as ShotRow[];

  if (shots.length > MAX_SHOTS) {
    return NextResponse.json(
      {
        error: `Too many shots (${shots.length}). The editor pack is capped at ${MAX_SHOTS} shots on this plan. Trim the storyboard and try again.`,
      },
      { status: 413 },
    );
  }

  // Board items — fetch all for this project (for refs + shot images).
  const { data: itemsData } = await supabase
    .from("board_items")
    .select(
      "id, filename, tag, is_ref, is_generated, image_url, storage_path, image_prompt, video_prompt, video_model",
    )
    .eq("project_id", projectId);
  const items = (itemsData || []) as BoardItemRow[];
  const byId = new Map<string, BoardItemRow>();
  for (const it of items) byId.set(it.id, it);

  // Build ZIP
  const zip = new JSZip();

  // ── README.md
  const orientation = project.aspect || "9:16";
  const totalRuntime = shots.reduce((s, sh) => s + Number(sh.duration || 0), 0);
  const projectTitle = project.name || "Untitled project";
  const clientName = project.client || "";
  const conceptTitle = project.concept_title || selectedConcept?.title || "";
  const conceptHook = project.concept_hook || selectedConcept?.hook || "";

  const readme = [
    `# ${projectTitle}`,
    clientName ? `Client: ${clientName}` : null,
    conceptTitle ? `Concept: ${conceptTitle}` : null,
    "",
    "## Editor handoff",
    "",
    "This pack contains everything an editor needs to cut this ad in Premiere / DaVinci:",
    "",
    "- `sequence.json` — machine-readable shot list (order, model, duration, prompt, VO).",
    "- `prompts.md` — readable shot-by-shot prompts for regeneration in Seedance / Kling / etc.",
    "- `vo.txt` — voiceover lines per shot, ready to send to ElevenLabs.",
    "- `refs/` — original reference images uploaded to the board.",
    "- `shots/` — the reference image for each shot, named `shot-NN.<ext>`.",
    "",
    `**Orientation:** ${orientation}`,
    `**Total runtime:** ${totalRuntime.toFixed(1)}s`,
    `**Shots:** ${shots.length}`,
    "",
    "## Workflow",
    "",
    "1. Render each shot from its image + prompt using the model noted in `sequence.json`.",
    "2. Import clips into Premiere/DaVinci in `order` ascending.",
    "3. Use the VO lines from `vo.txt` as voice guide tracks.",
    "4. Color-match using the palette noted in `sequence.json.concept.palette`.",
    "",
    "Generated by FrameForge.",
    "",
  ]
    .filter((l) => l !== null)
    .join("\n");
  zip.file("README.md", readme);

  // ── prompts.md
  const promptsLines: string[] = [];
  promptsLines.push(`# ${projectTitle} — shot prompts`);
  if (conceptTitle) promptsLines.push(`\n_Concept: ${conceptTitle}_`);
  if (conceptHook) promptsLines.push(`\n> ${conceptHook}`);
  promptsLines.push("");
  shots.forEach((sh, i) => {
    const n = i + 1;
    const duration = Number(sh.duration ?? 0);
    const model = sh.model || "seedance-2";
    promptsLines.push(`## Shot ${pad2(n)} — ${sh.title || "Untitled"}`);
    promptsLines.push(
      `- Sequence: ${sh.sequence_name || "SEQ 1"}  |  Duration: ${duration.toFixed(1)}s  |  Model: ${model}  |  Aspect: ${sh.aspect || orientation}`,
    );
    if (sh.motion) promptsLines.push(`- Motion: ${sh.motion}`);
    promptsLines.push("");
    promptsLines.push("**Prompt:**");
    promptsLines.push("");
    promptsLines.push("```");
    promptsLines.push(sh.video_prompt || "(no prompt yet — generate from the Storyboard screen)");
    promptsLines.push("```");
    if (sh.voiceover) {
      promptsLines.push("");
      promptsLines.push(`**VO:** ${sh.voiceover}`);
    }
    promptsLines.push("");
  });
  zip.file("prompts.md", promptsLines.join("\n"));

  // ── vo.txt
  const voLines: string[] = [];
  shots.forEach((sh, i) => {
    const n = i + 1;
    const vo = (sh.voiceover || "").trim();
    voLines.push(`[${pad2(n)}] ${vo || "(no voiceover)"}`);
  });
  zip.file("vo.txt", voLines.join("\n") + "\n");

  // ── refs/ — all reference items that have images
  const refItems = items.filter((it) => it.is_ref && it.image_url);
  // Stable order by filename so ref-01 is deterministic.
  refItems.sort((a, b) => (a.filename || a.id).localeCompare(b.filename || b.id));
  const refFileMap: Array<{ id: string; name: string }> = [];
  for (let i = 0; i < refItems.length; i++) {
    const it = refItems[i];
    if (!it.image_url) continue;
    const got = await fetchBuffer(it.image_url);
    if (!got) continue;
    const name = `ref-${pad2(i + 1)}.${got.ext}`;
    zip.file(`refs/${name}`, got.buf);
    refFileMap.push({ id: it.id, name });
  }

  // ── shots/ — each shot's reference image
  const shotFileMap: Record<string, string> = {};
  for (let i = 0; i < shots.length; i++) {
    const sh = shots[i];
    const n = i + 1;
    const refId = sh.ref_item_id;
    if (!refId) continue;
    const refItem = byId.get(refId);
    if (!refItem || !refItem.image_url) continue;
    const got = await fetchBuffer(refItem.image_url);
    if (!got) continue;
    const name = `shot-${pad2(n)}.${got.ext}`;
    zip.file(`shots/${name}`, got.buf);
    shotFileMap[sh.id] = name;
  }

  // ── sequence.json
  const sequence = {
    project: {
      id: project.id,
      name: projectTitle,
      client: clientName || null,
    },
    orientation,
    total_runtime: Number(totalRuntime.toFixed(2)),
    concept: selectedConcept
      ? {
          id: selectedConcept.id,
          title: selectedConcept.title,
          hook: selectedConcept.hook,
          vibe: selectedConcept.vibe || [],
          palette: selectedConcept.palette || project.concept_palette || [],
          length_seconds: selectedConcept.length_seconds,
          shot_count: selectedConcept.shot_count,
        }
      : {
          title: project.concept_title,
          hook: project.concept_hook,
          palette: project.concept_palette || [],
        },
    shots: shots.map((sh, i) => ({
      order: i + 1,
      id: sh.id,
      title: sh.title,
      sequence: sh.sequence_name,
      image: shotFileMap[sh.id] ? `shots/${shotFileMap[sh.id]}` : null,
      model: sh.model,
      aspect: sh.aspect,
      motion: sh.motion,
      duration: Number(sh.duration ?? 0),
      prompt: sh.video_prompt,
      voiceover: sh.voiceover,
      status: sh.status,
    })),
    refs: refFileMap.map((r) => ({ id: r.id, file: `refs/${r.name}` })),
  };
  zip.file("sequence.json", JSON.stringify(sequence, null, 2));

  // Build the buffer
  const zipBuf = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE" });
  const filename = `frameforge-${slugify(projectTitle)}.zip`;

  // Copy into a fresh ArrayBuffer so the TypeScript lib's BodyInit accepts it.
  const ab = new ArrayBuffer(zipBuf.byteLength);
  new Uint8Array(ab).set(zipBuf);

  return new NextResponse(ab, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(ab.byteLength),
      "Cache-Control": "no-store",
    },
  });
}
