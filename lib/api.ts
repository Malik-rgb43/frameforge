// Wrapper for internal API calls — adds x-internal-key header when configured.
// Set NEXT_PUBLIC_INTERNAL_API_KEY in your environment to lock down /api/* routes.

export function internalFetch(input: string, init?: RequestInit): Promise<Response> {
  const key = process.env.NEXT_PUBLIC_INTERNAL_API_KEY;
  if (!key) return fetch(input, init);
  return fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      "x-internal-key": key,
    },
  });
}
