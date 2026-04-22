import { NextResponse, type NextRequest } from "next/server";

/**
 * Fast middleware auth check — NO network calls.
 *
 * Previous version called `supabase.auth.getUser()` which hits Supabase's
 * auth server on every request. When Supabase was slow or unreachable,
 * the middleware timed out (MIDDLEWARE_INVOCATION_TIMEOUT → 504 gateway).
 *
 * New approach: check for the presence of any Supabase auth cookie.
 * If present → let request through, client-side auth provider validates.
 * If absent → redirect to /login immediately (no network call needed).
 *
 * JWT validation happens client-side in AuthProvider via `getUser()`.
 * If the token is invalid, onAuthStateChange fires SIGNED_OUT and we
 * redirect to /login there. Middleware stays fast and never blocks.
 */
export async function updateSession(request: NextRequest) {
  const path = request.nextUrl.pathname;

  const isPublicPath =
    path.startsWith("/login") ||
    path.startsWith("/auth") ||
    path.startsWith("/_next") ||
    path.startsWith("/favicon") ||
    path.startsWith("/api");

  if (isPublicPath) {
    return NextResponse.next({ request });
  }

  // Supabase SSR stores auth in cookies named `sb-<project-ref>-auth-token`
  // (or chunked as `sb-<ref>-auth-token.0`, `.1`, etc. for large tokens).
  const allCookies = request.cookies.getAll();
  const hasAuthCookie = allCookies.some(
    (c) => c.name.startsWith("sb-") && c.name.includes("-auth-token")
  );

  if (!hasAuthCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
