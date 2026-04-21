import { NextResponse } from "next/server";
import { callNanoBanana, isNanoBananaConfigured } from "@/lib/ai/nanobanana";
import { logGeneration, getSessionWorkspaceId } from "@/lib/supabase/service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const internalKey = process.env.INTERNAL_API_KEY;
  if (internalKey && req.headers.get("x-internal-key") !== internalKey) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isNanoBananaConfigured()) {
    return NextResponse.json(
      { error: "NanoBanana not configured. Add GOOGLE_GENAI_API_KEY env var." },
      { status: 503 }
    );
  }

  const started = Date.now();
  const workspaceId = await getSessionWorkspaceId();
  let body: {
    prompt?: string;
    modelId?: "nanobanana-pro" | "nanobanana-2" | "nanobanana-flash";
    aspectRatio?: "9:16" | "1:1" | "16:9" | "4:5" | "3:4";
    refImages?: Array<{ base64: string; mimeType: string }>;
    thinkingLevel?: "LOW" | "HIGH";
    seed?: number;
    projectId?: string | null;
    nodeId?: string | null;
    action?: string;
  } = {};

  try {
    body = await req.json();
    const { prompt, modelId, aspectRatio, refImages, thinkingLevel, seed, projectId, nodeId, action } = body;
    if (typeof prompt !== "string" || !prompt.trim()) {
      return NextResponse.json({ error: "prompt required" }, { status: 400 });
    }

    // Enforce an explicit 55s timeout so callers get a clear error message instead
    // of a silent Vercel 504 when the Gemini API hangs near the 60s maxDuration limit.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(new Error("NanaBanana timed out after 55s")), 55_000);
    const result = await callNanoBanana(prompt, {
      modelId,
      aspectRatio,
      refImages,
      thinkingLevel,
      seed,
      signal: controller.signal,
    }).finally(() => clearTimeout(timeoutId));

    // Fire-and-forget log
    logGeneration({
      workspace_id: workspaceId ?? undefined,
      project_id: projectId ?? null,
      node_id: nodeId ?? null,
      action: action ?? "image.generate",
      model: result.usage.model,
      images_generated: result.usage.imagesGenerated,
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
      node_id: body?.nodeId ?? null,
      action: body?.action ?? "image.generate",
      model: body?.modelId ?? "nanobanana-pro",
      duration_ms: Date.now() - started,
      status: "error",
      error_message: msg,
    });
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
