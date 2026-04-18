import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase-server";
import { generateText, isGeminiConfigured } from "@/lib/gemini";
import { videoPromptSystemPrompt, videoPromptUserPrompt } from "@/lib/prompts";

export async function POST(req: NextRequest) {
  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini API key not configured. Add GEMINI_API_KEY to your environment." },
      { status: 503 },
    );
  }

  const { shotId, conceptTitle = "Untitled" } = (await req.json()) as {
    shotId: string;
    conceptTitle?: string;
  };
  if (!shotId) return NextResponse.json({ error: "shotId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { data: shot } = await supabase.from("shots").select("id, title, duration, model").eq("id", shotId).maybeSingle();
  if (!shot) return NextResponse.json({ error: "Shot not found" }, { status: 404 });

  try {
    const prompt = await generateText(
      videoPromptSystemPrompt(),
      videoPromptUserPrompt(
        shot.title || "untitled shot",
        conceptTitle,
        shot.duration || 2,
        (shot.model === "kling-3" ? "kling-3" : "seedance-2"),
      ),
    );
    const cleaned = prompt.trim();
    await supabase.from("shots").update({ video_prompt: cleaned }).eq("id", shotId);
    return NextResponse.json({ videoPrompt: cleaned });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI generation failed";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
