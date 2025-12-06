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
