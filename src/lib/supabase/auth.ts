import { supabase, isSupabaseConfigured } from "./client";
import { User } from "@/types";
import { Database } from "./types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Sign in with email (magic link + OTP)
export async function signInWithEmail(
  email: string,
  redirectTo?: string
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error("Supabase is not configured. Please set up environment variables.") };
  }

  // Send both magic link and OTP code
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo:
        redirectTo ||
        `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback`,
      shouldCreateUser: true,
      // This doesn't generate a 6-digit code by default in Supabase
      // The 6-digit code feature needs to be enabled in Supabase Dashboard:
      // Authentication > Email Templates > Enable "Use a secure 6-digit code"
    },
  });

  return { error: error ? new Error(error.message) : null };
}

// Verify OTP token
export async function verifyOtp(
  email: string,
  token: string
): Promise<{ error: Error | null; session: unknown }> {
  if (!isSupabaseConfigured()) {
    return {
      error: new Error("Supabase is not configured. Please set up environment variables."),
      session: null,
    };
  }

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: "email",
  });

  return {
    error: error ? new Error(error.message) : null,
    session: data.session,
  };
}

// Sign in with Google OAuth
export async function signInWithGoogle(redirectTo?: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error("Supabase is not configured. Please set up environment variables.") };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo:
        redirectTo ||
        `${typeof window !== "undefined" ? window.location.origin : ""}/auth/callback?next=/dashboard`,
    },
  });

  return { error: error ? new Error(error.message) : null };
}

// Sign out
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  try {
    // Use scope: 'local' for browser client - 'global' requires admin privileges
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return { error: error ? new Error(error.message) : null };
  } catch (err) {
    console.error("SignOut error:", err);
    // Even if signOut fails, we consider it successful for UX
    // The local state will be cleared anyway
    return { error: null };
  }
}

// Get current session (uses getUser for security - validates JWT server-side)
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return { session: null, user: null };
  }

  // SECURITY: Use getUser() instead of getSession() because getSession()
  // only reads cookies without validating the JWT server-side
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { session: null, user: null };
  }

  // Return user in a session-like structure for backward compatibility
  return { session: { user }, user };
}

// Get current user profile from database
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return null;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", authUser.id)
    .single();

  if (error || !profile) {
    // Return basic user info if profile doesn't exist
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

// Update user profile
export async function updateProfile(
  updates: Partial<Pick<User, "name" | "avatarUrl">>
): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error("Supabase is not configured") };
  }

  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return { error: new Error("Not authenticated") };
  }

  // Build the update object
  // Note: Using type assertion due to TypeScript inference limitations with
  // the Supabase client's generic types. This is safer than 'any' as it's scoped.
  const profileUpdate = {
    name: updates.name ?? null,
    avatar_url: updates.avatarUrl ?? null,
  } as Database["public"]["Tables"]["profiles"]["Update"];

  const { error } = await supabase
    .from("profiles")
    .update(profileUpdate as never)
    .eq("id", authUser.id);

  return { error: error ? new Error(error.message) : null };
}

// Set up auth state listener
export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else if (event === "SIGNED_OUT") {
      callback(null);
    }
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}
