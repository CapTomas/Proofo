import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";

/**
 * OAuth/Magic Link Callback Handler
 *
 * This route handles the authentication callback from Supabase.
 * It exchanges the auth code for a session and sets proper cookies.
 *
 * The key to reliable auth is ensuring cookies are properly set
 * BEFORE the redirect happens.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard";
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  // Handle OAuth errors (e.g., user denied access)
  if (error) {
    console.error("Auth callback error:", error, errorDescription);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || "Authentication failed")}`
    );
  }

  if (!code) {
    console.error("Auth callback: No code provided");
    return NextResponse.redirect(`${origin}/login?error=no_code`);
  }

  const cookieStore = await cookies();

  // Create response first so we can set cookies on it
  const redirectUrl = new URL(next, origin);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          // Set cookie on the cookie store (will be included in response)
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.delete({ name, ...options });
        },
      },
    }
  );

  try {
    // Exchange code for session
    const { error: exchangeError, data } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth exchange error:", exchangeError.message);
      return NextResponse.redirect(
        `${origin}/login?error=exchange_failed&message=${encodeURIComponent(exchangeError.message)}`
      );
    }

    if (!data.session) {
      console.error("Auth callback: No session after exchange");
      return NextResponse.redirect(`${origin}/login?error=no_session`);
    }

    // Verify the user is properly authenticated using getUser()
    // This validates the JWT with Supabase Auth server
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error("Auth callback: User verification failed", userError?.message);
      return NextResponse.redirect(`${origin}/login?error=verification_failed`);
    }

    // Ensure user profile exists (fire-and-forget, don't block redirect)
    supabase
      .from("profiles")
      .upsert({
        id: user.id,
        email: user.email || "",
        name: user.user_metadata?.full_name || user.user_metadata?.name || null,
        avatar_url: user.user_metadata?.avatar_url || null,
      }, { onConflict: "id" })
      .then(({ error }) => {
        if (error) console.error("Profile upsert error:", error);
      });

    // Session is valid, redirect to dashboard
    // Cookies are already set via the cookie handler above
    return NextResponse.redirect(redirectUrl);

  } catch (err) {
    console.error("Auth callback exception:", err);
    return NextResponse.redirect(`${origin}/login?error=callback_exception`);
  }
}
