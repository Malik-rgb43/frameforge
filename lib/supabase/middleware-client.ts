import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!.trim(),
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!.trim(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        // Canonical Supabase SSR pattern:
        // 1. Mutate request cookies so subsequent server code sees them.
        // 2. Rebuild supabaseResponse with the mutated request so
        //    Set-Cookie headers are included in the response.
        // 3. Copy ALL cookies from old response + new ones to keep any
        //    previously set cookies intact.
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          // Capture existing cookies before rebuilding response
          const existingCookies = supabaseResponse.cookies.getAll();
          supabaseResponse = NextResponse.next({ request });
          // Re-apply existing cookies
          existingCookies.forEach(({ name, value }) =>
            supabaseResponse.cookies.set(name, value)
          );
          // Apply new/updated cookies
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT: Use getUser() not getSession() — getUser() validates the JWT
  // with the Supabase server on every request (slower but correct/secure).
  // getSession() only reads the local cookie without server validation.
  const {
    data: { user },
    error: getUserError,
  } = await supabase.auth.getUser();

  if (getUserError) {
    console.warn("[middleware] getUser error:", getUserError.message);
  }

  const isPublicPath =
    request.nextUrl.pathname.startsWith("/login") ||
    request.nextUrl.pathname.startsWith("/auth");

  if (!user && !isPublicPath) {
    const url = request.nextUrl.clone();
    // Preserve the original path as `next` param so after login we redirect back
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    const redirectResponse = NextResponse.redirect(url);
    // Forward refreshed session cookies so they aren't lost on redirect
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie.name, cookie.value);
    });
    return redirectResponse;
  }

  return supabaseResponse;
}
