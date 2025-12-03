import { supabase, isSupabaseConfigured } from "./client";
import { User } from "@/types";
import { Database } from "./types";

type Profile = Database["public"]["Tables"]["profiles"]["Row"];

// Sign in with email (magic link)
export async function signInWithEmail(email: string, redirectTo?: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error("Supabase is not configured. Please set up environment variables.") };
  }

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  });

  return { error: error ? new Error(error.message) : null };
}

// Sign in with Google OAuth
export async function signInWithGoogle(redirectTo?: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error("Supabase is not configured. Please set up environment variables.") };
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: redirectTo || `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`,
    },
  });

  return { error: error ? new Error(error.message) : null };
}

// Sign out
export async function signOut(): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: null };
  }

  // Use scope: 'global' to ensure session is cleared everywhere
  const { error } = await supabase.auth.signOut({ scope: "global" });
  return { error: error ? new Error(error.message) : null };
}

// Get current session
export async function getSession() {
  if (!isSupabaseConfigured()) {
    return { session: null, user: null };
  }

  const { data: { session }, error } = await supabase.auth.getSession();
  
  if (error || !session) {
    return { session: null, user: null };
  }

  return { session, user: session.user };
}

// Get current user profile from database
export async function getCurrentUser(): Promise<User | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  const { data: { user: authUser } } = await supabase.auth.getUser();
  
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
      name: authUser.user_metadata?.full_name || authUser.user_metadata?.name || authUser.email?.split("@")[0] || "User",
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
    createdAt: typedProfile.created_at,
  };
}

// Update user profile
export async function updateProfile(updates: Partial<Pick<User, "name" | "avatarUrl">>): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error("Supabase is not configured") };
  }

  const { data: { user: authUser } } = await supabase.auth.getUser();
  
  if (!authUser) {
    return { error: new Error("Not authenticated") };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("profiles")
    .update({
      name: updates.name,
      avatar_url: updates.avatarUrl,
    })
    .eq("id", authUser.id);

  return { error: error ? new Error(error.message) : null };
}

// Set up auth state listener
export function onAuthStateChange(callback: (user: User | null) => void) {
  if (!isSupabaseConfigured()) {
    return { unsubscribe: () => {} };
  }

  const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === "SIGNED_IN" && session?.user) {
      const user = await getCurrentUser();
      callback(user);
    } else if (event === "SIGNED_OUT") {
      callback(null);
    }
  });

  return { unsubscribe: () => subscription.unsubscribe() };
}
