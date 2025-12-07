export { supabase, isSupabaseConfigured } from "./client";
export type { Database, DealStatus, Json } from "./types";

// Auth exports
export {
  signInWithEmail,
  signInWithGoogle,
  signOut,
  getSession,
  getCurrentUser,
  updateProfile,
  onAuthStateChange,
} from "./auth";

// Note: Server-side functions (createServerSupabaseClient, getServerUser, etc.)
// should be imported directly from "@/lib/supabase/server" in server components
// to avoid bundling server-only code in client components.

// Deals exports
export {
  getUserDeals,
  getDealByPublicId,
  createDeal,
  confirmDeal,
  voidDeal,
  markDealViewed,
  addAuditLog,
  getAuditLogs,
  validateAccessToken,
} from "./deals";

// Middleware exports
export { createSupabaseMiddlewareClient } from "./middleware";
