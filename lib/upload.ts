"use client";
import { createClient } from "./supabase-client";

export interface UploadResult {
  storagePath: string;
  publicUrl: string;
  filename: string;
}

export async function uploadProductShot(
  file: File,
  projectId: string,
): Promise<UploadResult> {
  const supabase = createClient();
  const ext = file.name.split(".").pop() || "png";
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-60);
  const key = `${projectId}/${crypto.randomUUID()}-${safeName || `upload.${ext}`}`;

  const { error } = await supabase.storage
    .from("product-shots")
    .upload(key, file, { contentType: file.type, upsert: false });
  if (error) throw error;

  const { data } = supabase.storage.from("product-shots").getPublicUrl(key);
  return { storagePath: key, publicUrl: data.publicUrl, filename: file.name };
}

export async function deleteProductShot(storagePath: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase.storage.from("product-shots").remove([storagePath]);
  if (error) throw error;
}
