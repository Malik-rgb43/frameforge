"use client";

import type { Brief } from "./prompts";

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data && typeof data.error === "string" && data.error) || `Request failed: ${res.status}`);
  }
  return data as T;
}

export function generateConcepts(projectId: string, brief: Brief) {
  return post<{ concepts: unknown[] }>("/api/generate-concepts", { projectId, brief });
}

export function generateShots(projectId: string, args: {
  referenceItemId?: string;
  count?: number;
  conceptTitle?: string;
  conceptHook?: string;
  productDescription?: string;
}) {
  return post<{ created: unknown[]; errors: string[] }>("/api/generate-shots", { projectId, ...args });
}

export function generateVideoPrompt(shotId: string, conceptTitle?: string) {
  return post<{ videoPrompt: string }>("/api/generate-video-prompt", { shotId, conceptTitle });
}

export function exportPack(projectId: string) {
  return fetch(`/api/export-pack?project=${encodeURIComponent(projectId)}`, { method: "GET" });
}
