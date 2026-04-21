import { NextResponse } from "next/server";
import { callGemini, isGeminiConfigured } from "@/lib/ai/gemini";
import { logGeneration, getSessionWorkspaceId } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (internalKey && req.headers.get("x-internal-key") !== internalKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isGeminiConfigured()) {
    return NextResponse.json(
      { error: "Gemini not configured. Add GOOGLE_GENAI_API_KEY env var." },
      { status: 503 }
    );
  }

  const started = Date.now();
  const workspaceId = await getSessionWorkspaceId();
  let body: {
    systemPrompt?: string;
    userPrompt?: string;
    model?: "gemini-3-pro" | "gemini-3-flash";
    temperature?: number;
    responseMimeType?: "application/json" | "text/plain";
    images?: Array<{ inlineData: { mimeType: string; data: string } }>;
    projectId?: string | null;
    action?: string;
  } = {};

  try {
    body = await req.json();
    const { systemPrompt, userPrompt, model, temperature, responseMimeType, images, projectId, action } = body;
    if (typeof systemPrompt !== "string" || systemPrompt.trim().length === 0 || typeof userPrompt !== "string" || userPrompt.trim().length === 0) {
      return NextResponse.json(
        { error: "systemPrompt and userPrompt required" },
        { status: 400 }
      );
    }

    // Enforce an explicit 55s timeout so callers get a clear error message instead
    // of a silent Vercel 504 when the Gemini API hangs near the 60s maxDuration limit.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("Gemini timed out after 55s")), 55_000);
    const result = await callGemini(systemPrompt, userPrompt, {
      model,
      temperature,
      responseMimeType,
      images,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    logGeneration({
      workspace_id: workspaceId ?? undefined,
      project_id: projectId ?? null,
      action: action ?? "text.generate",
      model: result.usage.model,
      input_tokens: result.usage.inputTokens,
      output_tokens: result.usage.outputTokens,
      cost_usd: result.usage.costUsd,
      duration_ms: result.usage.durationMs,
      status: "ok",
    });

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "unknown error";
    logGeneration({
      workspace_id: workspaceId ?? undefined,
      project_id: body?.projectId ?? null,
      action: body?.action ?? "text.generate",
      model: body?.model ?? "gemini-3-pro",
      duration_ms: Date.now() - started,
      status: "error",
      error_message: msg,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
