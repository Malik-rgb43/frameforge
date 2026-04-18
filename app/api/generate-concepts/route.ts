import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generateText, isGeminiConfigured } from "@/lib/gemini";
import { conceptSystemPrompt, conceptUserPrompt, type Brief } from "@/lib/prompts";

interface ConceptOutput {
  title: string;
  hook: string;
  vibe: string[];
  palette: string[];
  length_seconds: number;
  shot_count: number;
}

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Add GEMINI_API_KEY to your environment." },
      { status: 503 },
    );
  }

  const { projectId, brief } = await req.json();
  if (!projectId || !brief) {
    return NextResponse.json({ error: "projectId and brief are required" }, { status: 400 });
  }

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  // Count references for context
  const { count: refCount } = await supabase
    .from("board_items")
    .select("*", { count: "exact", head: true })
    .eq("project_id", projectId)
    .eq("is_ref", true);

  let concepts: ConceptOutput[];
  try {
    const raw = await generateText(conceptSystemPrompt(), conceptUserPrompt(brief as Brief, refCount || 0), { json: true });
    concepts = JSON.parse(raw);
    if (!Array.isArray(concepts)) throw new Error("Expected JSON array");
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }

  // Delete old AI-generated concepts, replace with new set
  await supabase.from("concepts").delete().eq("project_id", projectId).eq("is_ai_generated", true);

  const rows = concepts.slice(0, 5).map((c, i) => ({
    project_id: projectId,
    title: c.title || `Concept ${i + 1}`,
    hook: c.hook || "",
    vibe: c.vibe || [],
    palette: c.palette || [],
    length_seconds: c.length_seconds || 10,
    shot_count: c.shot_count || 4,
    is_selected: i === 0,
    is_ai_generated: true,
  }));

  const { data, error } = await supabase.from("concepts").insert(rows).select();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ concepts: data });
}
