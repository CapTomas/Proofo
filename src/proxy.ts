import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

/**
 * Middleware for authentication and route protection.
 *
 * This middleware:
 * 1. Refreshes the auth session (keeps cookies fresh)
 * 2. Protects dashboard routes from unauthenticated access
 * 3. Redirects authenticated users away from login page
 */
export default async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static files and assets - skip entirely
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|gif|webp|css|js|woff|woff2|ttf|eot|map)$/)
  ) {
    return NextResponse.next();
  }

  // Public routes that don't require authentication
  const publicRoutes = ["/", "/login", "/deal/new", "/demo", "/privacy", "/terms", "/verify"];
  const publicPrefixes = ["/d/public/", "/auth/", "/api/"];

  const isPublicRoute = publicRoutes.includes(pathname);
  const isPublicPrefix = publicPrefixes.some((prefix) => pathname.startsWith(prefix));

  // Check if Supabase is configured
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    // Demo mode - allow all access
    return NextResponse.next();
  }

  // Create response that we'll modify with refreshed cookies
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  // Create Supabase client with cookie handling
  const supabase = createServerClient(supabaseUrl, supabaseKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        // Set on request for downstream use
        request.cookies.set({ name, value, ...options });
        // Create new response with updated cookies
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        // Set on response to send to browser
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  // CRITICAL: Use getUser() not getSession() for security
  // getUser() validates the JWT with Supabase Auth server
  // This also refreshes the session if needed
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  // For public routes, allow access but still refresh session
  if (isPublicRoute || isPublicPrefix) {
    // Special case: redirect authenticated users from login to dashboard
    if (pathname === "/login" && user && !error) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/dashboard";
      return NextResponse.redirect(redirectUrl);
    }
    return response;
  }

  // Protected routes - require authentication
  if (!user || error) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // User is authenticated, allow access
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all paths except static files
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
