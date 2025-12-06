import { type NextRequest } from "next/server";
import { createSupabaseMiddlewareClient } from "@/lib/supabase/middleware";
import { isSupabaseConfigured } from "@/lib/supabase/client";

export async function middleware(request: NextRequest) {
  // Skip middleware for public routes, API routes, and static files
  const { pathname } = request.nextUrl;
  
  const publicRoutes = [
    "/",
    "/login",
    "/deal/new",
    "/demo",
    "/d/",
    "/auth/callback",
    "/privacy",
    "/terms",
  ];
  
  const isPublicRoute = publicRoutes.some(route => pathname === route || pathname.startsWith(route));
  const isApiRoute = pathname.startsWith("/api");
  const isStaticFile = pathname.startsWith("/_next") || pathname.includes(".");
  
  if (isPublicRoute || isApiRoute || isStaticFile) {
    return;
  }

  // If Supabase is not configured, allow access (demo mode)
  if (!isSupabaseConfigured()) {
    return;
  }

  // Check authentication for protected routes
  const { supabase, response } = createSupabaseMiddlewareClient(request);
  
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // If user is not authenticated, redirect to login
  if (!user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("redirect", pathname);
    return Response.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
