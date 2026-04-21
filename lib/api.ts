// Wrapper for internal API calls — adds x-internal-key header when configured.
// Set NEXT_PUBLIC_INTERNAL_API_KEY in your environment to lock down /api/* routes.
// Hard 58s client-side timeout prevents browser fetch from hanging indefinitely
// when the server is unreachable or takes longer than the 60s Vercel maxDuration.

export function internalFetch(input: string, init?: RequestInit): Promise<Response> {
  const key = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
  const headers: Record<string, string> = {
    ...(init?.headers as Record<string, string> ?? {}),
    ...(key ? { "x-internal-key": key } : {}),
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 58_000);

  return fetch(input, {
    ...init,
    headers,
    signal: controller.signal,
  }).finally(() => clearTimeout(timeoutId));
}
