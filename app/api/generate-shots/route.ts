import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { fetchAsInlineData, generateImage, isGeminiConfigured } from "@/lib/gemini";
import { shotImagePrompt, variantImagePrompt } from "@/lib/prompts";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Add GEMINI_API_KEY to your environment." },
      { status: 503 },
    );
  }

  const body = await req.json();
  const { projectId, referenceItemId, count = 3, conceptTitle = "Untitled", conceptHook = "", productDescription = "a premium product" } = body as {
    projectId: string;
    referenceItemId?: string;
    count?: number;
    conceptTitle?: string;
    conceptHook?: string;
    productDescription?: string;
  };
  if (!projectId) return NextResponse.json({ error: "projectId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  type RefRow = { id: string; image_url: string | null; canvas_x: number; canvas_y: number };
  let ref: RefRow | null = null;
  if (referenceItemId) {
    const { data } = await supabase.from("board_items").select("id, image_url, canvas_x, canvas_y").eq("id", referenceItemId).maybeSingle();
    ref = (data as RefRow | null) ?? null;
  }
  if (!ref) {
    const { data } = await supabase.from("board_items").select("id, image_url, canvas_x, canvas_y").eq("project_id", projectId).eq("is_ref", true).limit(1).maybeSingle();
    ref = (data as RefRow | null) ?? null;
  }

  const refImages = ref && ref.image_url ? [await fetchAsInlineData(ref.image_url)] : undefined;
  const basePrompt = shotImagePrompt(conceptTitle, conceptHook, 1, count, productDescription);

  const created: unknown[] = [];
  const errors: string[] = [];

  for (let i = 0; i < Math.min(count, 4); i++) {
    const prompt = variantImagePrompt(basePrompt, i, count);
    try {
      const img = await generateImage(prompt, refImages);
      const storagePath = `${projectId}/gen-${crypto.randomUUID()}.png`;
      const buf = Buffer.from(img.base64, "base64");
      const { error: uploadErr } = await supabase.storage
        .from("product-shots")
        .upload(storagePath, buf, { contentType: img.mimeType, upsert: false });
      if (uploadErr) throw uploadErr;
      const { data: urlData } = supabase.storage.from("product-shots").getPublicUrl(storagePath);
      const baseX = ref?.canvas_x ?? 100;
      const baseY = ref?.canvas_y ?? 100;
      const { data, error: insertErr } = await supabase
        .from("board_items")
        .insert({
          project_id: projectId,
          canvas_x: baseX + 40 + i * 200,
          canvas_y: baseY + 320,
          width: 180,
          height: 220,
          kind: "bottle",
          tone: "matte-black",
          filename: `gen-${i + 1}.png`,
          tag: "Gen",
          is_generated: true,
          image_url: urlData.publicUrl,
          storage_path: storagePath,
          image_prompt: prompt,
          status: "ready",
          source_item_id: ref?.id ?? null,
        })
        .select()
        .single();
      if (insertErr) throw insertErr;
      created.push(data);

      // Also create a "variant" connection from ref → new item
      if (ref?.id) {
        await supabase.from("connections").insert({
          project_id: projectId,
          from_item_id: ref.id,
          to_item_id: (data as { id: string }).id,
          relation_type: "variant",
        });
      }
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  return NextResponse.json({ created, errors });
}
