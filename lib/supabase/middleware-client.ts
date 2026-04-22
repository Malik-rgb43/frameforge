import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Middleware session handler.
 *
 * Strategy:
 * 1. Skip entirely for public paths (login, auth callbacks, static assets).
 * 2. Cheap cookie presence check — if no Supabase auth cookie at all, redirect
 *    to /login immediately (no network call needed).
 * 3. If auth cookie exists, call `getUser()` to validate+refresh the token,
 *    BUT with a strict 2.5s timeout so middleware NEVER hangs. Vercel kills
 *    middleware at 25s, producing 504 MIDDLEWARE_INVOCATION_TIMEOUT; we fail
 *    open (let the request through) if Supabase is slow and let the client
 *    re-check auth.
 * 4. On invalid/missing user → redirect to /login with ?next= preserved.
 *
 * Cookies set by Supabase during getUser() (session refresh) are forwarded
 * to every response so the client sees the refreshed tokens.
 */

const GETUSER_TIMEOUT_MS = 2500;

function isPublicPath(path: string): boolean {
  return (
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api") ||
    path === "/robots.txt" ||
    path === "/sitemap.xml"
  );
}

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((c) => c.name.startsWith("sb-") && c.name.includes("-auth-token"));
}

function redirectToLogin(request: NextRequest, carryCookiesFrom?: NextResponse) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", request.nextUrl.pathname);
  const redirect = NextResponse.redirect(url);
  if (carryCookiesFrom) {
    carryCookiesFrom.cookies.getAll().forEach((c) => {
      redirect.cookies.set(c.name, c.value);
    });
  }
  return redirect;
}

/** Race a promise against a timeout — returns `{ timedOut: true }` if slow. */
async function withTimeout<T>(
  p: Promise<T>,
  ms: number
): Promise<{ timedOut: false; value: T } | { timedOut: true }> {
  return Promise.race([
    p.then((value) => ({ timedOut: false as const, value })),
    new Promise<{ timedOut: true }>((resolve) =>
      setTimeout(() => resolve({ timedOut: true as const }), ms)
    ),
  ]);
}

export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  // 1. Public paths — no auth check, no Supabase call
  if (isPublicPath(path)) {
    return NextResponse.next({ request });
  }

  // 2. No auth cookie at all → redirect immediately, skip network call
  if (!hasSupabaseAuthCookie(request)) {
    return redirectToLogin(request);
  }

  // 3. Auth cookie present → validate with Supabase (with timeout)
  let response = NextResponse.next({ request });

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  // If env vars are missing, fail open — let the client handle it
  if (!url || !key) {
    console.error("[middleware] Supabase env vars missing");
    return response;
  }

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(
        cookiesToSet: {
          name: string;
          value: string;
          options?: Record<string, unknown>;
        }[]
      ) {
        // Mutate request cookies so subsequent code sees refreshed values
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        // Preserve any cookies already set on the response
        const existing = response.cookies.getAll();
        response = NextResponse.next({ request });
        existing.forEach(({ name, value }) => {
          response.cookies.set(name, value);
        });
        // Apply new/updated cookies
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(
            name,
            value,
            options as Parameters<typeof response.cookies.set>[2]
          );
        });
      },
    },
  });

  // Race getUser against timeout — NEVER let middleware hang
  const result = await withTimeout(supabase.auth.getUser(), GETUSER_TIMEOUT_MS);

  if (result.timedOut) {
    // Supabase is slow — fail open, let client re-validate
    console.warn("[middleware] getUser timed out after", GETUSER_TIMEOUT_MS, "ms — letting request through");
    return response;
  }

  const { data, error } = result.value;

  if (error) {
    // Token invalid/expired → redirect to login
    return redirectToLogin(request, response);
  }

  if (!data.user) {
    return redirectToLogin(request, response);
  }

  return response;
}
