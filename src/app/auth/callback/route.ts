import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/dashboard";

  if (code) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
          set(name: string, value: string, options: CookieOptions) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch (error) {
              // In Next.js 15, cookies().set() might fail during certain phases
              // Log but don't block the auth flow
              console.warn('Failed to set cookie:', name, error);
            }
          },
          remove(name: string, options: CookieOptions) {
            try {
              cookieStore.delete({ name, ...options });
            } catch (error) {
              // In Next.js 15, cookies().delete() might fail during certain phases
              // Log but don't block the auth flow
              console.warn('Failed to delete cookie:', name, error);
            }
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Session was successfully created
      // Force a redirect with revalidation to ensure fresh data
      const response = NextResponse.redirect(`${origin}${next}`);
      // Add cache control headers to prevent stale data
      response.headers.set('Cache-Control', 'no-store, must-revalidate');
      return response;
    } else {
      console.error("Auth error:", error);
    }
  }

  // Return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=auth_callback_error`);
}
