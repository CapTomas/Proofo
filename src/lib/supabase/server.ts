import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { Database } from "./types";
import { User } from "@/types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

/**
 * Creates a Supabase client for Server Components, Server Actions, and Route Handlers.
 * This is the recommended way to access Supabase in server-side code.
 */
export async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
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
          } catch {
            // Ignore - can fail during SSG or middleware
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Ignore - can fail during SSG or middleware
          }
        },
      },
    }
  );
}

/**
 * Get the authenticated user from the server.
 * Uses getUser() which validates the JWT with Supabase Auth server.
 * This is the secure way to check authentication.
 */
export async function getServerUser(): Promise<User | null> {
  const supabase = await createServerSupabaseClient();

  // getUser() validates the JWT with Supabase - always use this for security
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  if (error || !authUser) {
    return null;
  }

  // Fetch profile data
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (!profile) {
    // Return basic user info if no profile yet
    return {
      id: authUser.id,
      email: authUser.email || "",
      name:
        authUser.user_metadata?.full_name ||
        authUser.user_metadata?.name ||
        authUser.email?.split("@")[0] ||
        "User",
      avatarUrl: authUser.user_metadata?.avatar_url,
      createdAt: authUser.created_at,
    };
  }

  const typedProfile = profile as Profile;
  return {
    id: typedProfile.id,
    email: typedProfile.email,
    name: typedProfile.name || typedProfile.email.split("@")[0],
    avatarUrl: typedProfile.avatar_url || undefined,
    isPro: typedProfile.is_pro,
    signatureUrl: typedProfile.signature_url || undefined,
    createdAt: typedProfile.created_at,
  };
}

/**
 * Get the authenticated session from the server.
 * Returns both user and session for convenience.
 */
export async function getServerSession() {
  const supabase = await createServerSupabaseClient();

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, session: null };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  return { user, session };
}

/**
 * Check if Supabase is configured
 */
export function isSupabaseConfiguredServer(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
}
