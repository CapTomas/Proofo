export { supabase, isSupabaseConfigured } from "./client";
export type { Database, DealStatus, Json } from "./types";

// Auth exports
export {
  signInWithEmail,
  signInWithGoogle,
  verifyOtp,
  signOut,
  getSession,
  getCurrentUser,
  updateProfile,
  onAuthStateChange,
} from "./auth";

// Note: Server-side functions (createServerSupabaseClient, getServerUser, etc.)
// should be imported directly from "@/lib/supabase/server" in server components
// to avoid bundling server-only code in client components.

// Note: Deal operations (create, confirm, void, etc.) are now handled by
// server actions in "@/app/actions/deal-actions" for better security.
