import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

// .trim() guards against trailing newlines baked in by Vercel env var editor.
// A newline in the URL causes every Supabase fetch to fail silently.
export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim()
  );
}

export type SupabaseBrowserClient = ReturnType<typeof createClient>;
