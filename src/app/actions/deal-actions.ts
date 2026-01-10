"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { Deal, DealTerm } from "@/types";
import {
  calculateDealSeal,
  transformVerificationsForHash,
  VerificationRecord
} from "@/lib/crypto";
import { createDealSchema } from "@/lib/validations";
import {
  updateProfileSchema,
  appearancePreferencesSchema,
  doNotDisturbSchema,
  notificationPreferencesSchema,
} from "@/lib/validations/user";

import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Helper to create Supabase server client (untyped version)
// NOTE: This intentionally does NOT use the Database type to allow flexible RPC calls.
// The typed version in @/lib/supabase/server requires all RPC functions to be defined
// in the Database type, which would require regenerating types after each schema change.
// See: https://supabase.com/docs/guides/api/generating-types
async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cookies can fail during static generation or in middleware
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Cookies can fail during static generation or in middleware
          }
        },
      },
    }
  );
}

// App URL configuration
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Generate secure IDs on the server
export async function generateSecureIds(): Promise<{ publicId: string; accessToken: string }> {
  const publicId = nanoid(10);
  const accessToken = crypto.randomBytes(32).toString("hex");
  return { publicId, accessToken };
}


// Transform database deal to app Deal type
function transformDeal(dbDeal: Record<string, unknown>): Deal {
  return {
    id: dbDeal.id as string,
    publicId: dbDeal.public_id as string,
    creatorId: dbDeal.creator_id as string,
    creatorName: (dbDeal.creator_name as string) || "Unknown",
    recipientId: dbDeal.recipient_id as string | undefined,
    recipientName: dbDeal.recipient_name as string | undefined,
    recipientEmail: dbDeal.recipient_email as string | undefined,
    title: dbDeal.title as string,
    description: (dbDeal.description as string) || "",
    templateId: dbDeal.template_id as string | undefined,
    terms: dbDeal.terms as DealTerm[],
    status: dbDeal.status as Deal["status"],
    trustLevel: (dbDeal.trust_level as Deal["trustLevel"]) || "basic",
    createdAt: dbDeal.created_at as string,
    confirmedAt: dbDeal.confirmed_at as string | undefined,
    voidedAt: dbDeal.voided_at as string | undefined,
    viewedAt: dbDeal.viewed_at as string | undefined,
    signatureUrl: dbDeal.signature_url as string | undefined,
    dealSeal: dbDeal.deal_seal as string | undefined,
    lastNudgedAt: dbDeal.last_nudged_at as string | undefined,
    verifications: dbDeal.verifications as Deal["verifications"],
  };
}

// Lookup user profile by email (for registered recipient detection)
// SECURITY: Requires authentication and rate limiting to prevent email enumeration
export async function lookupUserByEmailAction(email: string): Promise<{
  found: boolean;
  profile?: { id: string; name: string; avatarUrl?: string };
  error: string | null;
}> {
  try {
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { found: false, error: null };
    }

    const supabase = await createServerSupabaseClient();

    // SECURITY: Require authentication for full profile lookup
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      // Anonymous users should use checkRecipientEmailForDealAction instead
      return { found: false, error: null };
    }

    // SECURITY: Rate limit to prevent email enumeration
    const rateLimitResult = await checkRateLimit("emailLookup", user.id);
    if (!rateLimitResult.success) {
      return { found: false, error: "Rate limit exceeded. Please try again later." };
    }

    // Use SECURITY DEFINER function to lookup profile (bypasses RLS for authenticated users)
    // This allows authenticated users to find any user when creating deals
    const { data, error } = await supabase.rpc("lookup_profile_by_email", {
      p_email: email.toLowerCase().trim(),
    });

    if (error || !data || (Array.isArray(data) && data.length === 0)) {
      // Not found is not an error, just not registered
      return { found: false, error: null };
    }

    // RPC returns array, take first result
    const profile = Array.isArray(data) ? data[0] : data;

    return {
      found: true,
      profile: {
        id: profile.id,
        name: profile.name || email.split("@")[0],
        avatarUrl: profile.avatar_url || undefined,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error looking up user by email", error);
    return { found: false, error: "Server error" };
  }
}

// SECURITY: Deal-scoped email check for anonymous users on public signing page
// Returns minimal boolean info only - no profile details exposed
export async function checkRecipientEmailForDealAction(data: {
  publicId: string;
  email: string;
}): Promise<{
  isProofoUser: boolean;
  isCreator: boolean;
  userName?: string;
  userAvatarUrl?: string;
  error: string | null;
}> {
  try {
    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!data.email || !emailRegex.test(data.email) || !data.publicId) {
      return { isProofoUser: false, isCreator: false, error: null };
    }

    const supabase = await createServerSupabaseClient();

    // SECURITY: Rate limit by IP to prevent enumeration
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = await checkRateLimit("emailLookup", `ip:${ip}`);
    if (!rateLimitResult.success) {
      return { isProofoUser: false, isCreator: false, error: "Rate limit exceeded" };
    }

    // Use SECURITY DEFINER function that bypasses RLS for anonymous users
    // This returns minimal info only (booleans + name/avatar if registered non-creator)
    const { data: result, error } = await supabase.rpc("check_email_for_deal", {
      p_public_id: data.publicId,
      p_email: data.email.toLowerCase().trim(),
    });

    if (error) {
      logger.error("Error checking email for deal", error);
      return { isProofoUser: false, isCreator: false, error: "Server error" };
    }

    // RPC returns array with one row
    const row = Array.isArray(result) && result.length > 0 ? result[0] : null;

    if (!row) {
      return { isProofoUser: false, isCreator: false, error: null };
    }

    return {
      isProofoUser: row.is_proofo_user === true,
      isCreator: row.is_creator === true,
      userName: row.user_name || undefined,
      userAvatarUrl: row.user_avatar_url || undefined,
      error: null,
    };
  } catch (error) {
    logger.error("Error checking recipient email for deal", error);
    return { isProofoUser: false, isCreator: false, error: "Server error" };
  }
}



// Create a new deal (server action)
export async function createDealAction(data: {
  title: string;
  description?: string;
  templateId?: string;
  recipientName: string;
  recipientEmail?: string;
  recipientId?: string; // Pre-linked if email matched a registered user
  terms: Array<{ label: string; value: string; type: string }>;
  trustLevel?: "basic" | "verified" | "strong" | "maximum";
}): Promise<{
  deal: Deal | null;
  shareUrl: string | null;
  accessToken: string | null;
  error: string | null;
}> {
  try {
    // Validate input with Zod
    const validation = createDealSchema.safeParse(data);
    if (!validation.success) {
      return {
        deal: null,
        shareUrl: null,
        accessToken: null,
        error: validation.error.issues[0]?.message || "Invalid input",
      };
    }
    const validatedData = validation.data;

    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { deal: null, shareUrl: null, accessToken: null, error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { deal: null, shareUrl: null, accessToken: null, error: "Not authenticated" };
    }

    // Check rate limit (20 deals per hour per user)
    const rateLimitResult = await checkRateLimit("dealCreate", user.id);
    if (!rateLimitResult.success) {
      return {
        deal: null,
        shareUrl: null,
        accessToken: null,
        error: "Rate limit exceeded. Please try again later.",
      };
    }

    // Generate secure IDs on the server
    const { publicId, accessToken } = await generateSecureIds();

    // Create the deal
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        public_id: publicId,
        creator_id: user.id,
        title: validatedData.title,
        description: validatedData.description,
        template_id: validatedData.templateId,
        recipient_name: validatedData.recipientName,
        recipient_email: validatedData.recipientEmail || null,
        recipient_id: validatedData.recipientId || null,
        terms: validatedData.terms.map((t, i) => ({
          id: `term-${i}`,
          label: t.label,
          value: t.value,
          type: t.type,
        })),
        status: "pending",
        trust_level: validatedData.trustLevel || "basic",
      })
      .select()
      .single();

    if (dealError || !deal) {
      logger.error("Error creating deal", dealError);
      return {
        deal: null,
        shareUrl: null,
        accessToken: null,
        error: dealError?.message || "Failed to create deal",
      };
    }

    // Create access token with 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: tokenError } = await supabase.from("access_tokens").insert({
      deal_id: deal.id,
      token: accessToken,
      expires_at: expiresAt.toISOString(),
    });

    if (tokenError) {
      logger.error("Error creating access token", tokenError);
      // Continue anyway, deal was created
    }

    // Add audit log entry with enhanced metadata
    await supabase.from("audit_log").insert({
      deal_id: deal.id,
      event_type: "deal_created",
      actor_id: user.id,
      actor_type: "creator",
      metadata: {
        templateId: validatedData.templateId,
        recipientName: validatedData.recipientName,
        termsCount: validatedData.terms.length,
        hasEmail: !!validatedData.recipientEmail,
        hasDescription: !!validatedData.description,
      },
    });

    // Get creator name
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const shareUrl = `${APP_URL}/d/public/${publicId}`;

    return {
      deal: {
        ...transformDeal(deal),
        creatorName: profile?.name || "Unknown",
        accessToken,
      },
      shareUrl,
      accessToken,
      error: null,
    };
  } catch (error) {
    logger.error("Server error creating deal", error);
    return { deal: null, shareUrl: null, accessToken: null, error: "Server error" };
  }
}

// Get deal by public ID (for recipient view - doesn't require auth)
export async function getDealByPublicIdAction(
  publicId: string
): Promise<{
  deal: Deal | null;
  creatorProfile?: { name: string; avatarUrl?: string };
  recipientProfile?: { name: string; avatarUrl?: string };
  error: string | null
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // Use the RPC function that bypasses RLS for public access
    // This function now returns JSON with creator_name included
    const { data, error } = await supabase.rpc("get_deal_by_public_id", { p_public_id: publicId });

    if (error || !data) {
      return { deal: null, error: error?.message || "Deal not found" };
    }

    const deal = transformDeal(data as Record<string, unknown>);

    // Fetch creator profile directly for fresh data
    // Note: profiles table has RLS that allows SELECT for authenticated users
    // For anonymous users, we rely on the RPC data which includes creator_name via JOIN
    const creatorId = (data as Record<string, unknown>).creator_id as string;
    let creatorProfile: { name: string; avatarUrl?: string } | undefined;

    // Try to fetch fresh profile data (will work for authenticated users)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", creatorId)
      .single();

    if (profileData) {
      creatorProfile = {
        name: profileData.name || deal.creatorName || "Unknown",
        avatarUrl: profileData.avatar_url,
      };
    } else {
      // Fall back to the RPC data (which now includes creator_avatar_url)
      const rpcData = data as Record<string, unknown>;
      creatorProfile = {
        name: deal.creatorName || "Unknown",
        avatarUrl: (rpcData.creator_avatar_url as string) || undefined,
      };
    }

    // Fetch recipient profile data if recipient_id exists
    // Note: This makes public profile data visible to anyone with the link
    // This is generally acceptable for deal parties, similar to creator profile
    let recipientProfile: { name: string; avatarUrl?: string } | undefined;

    if (deal.recipientId) {
      const { data: recipientData } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", deal.recipientId)
        .single();

      if (recipientData) {
        recipientProfile = {
          name: recipientData.name || deal.recipientName || "Recipient",
          avatarUrl: recipientData.avatar_url,
        };
      }
    }

    return {
      deal,
      creatorProfile,
      recipientProfile,
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching deal", error);
    return { deal: null, error: "Server error" };
  }
}

// Get deal by ID (for authenticated users - requires auth, used for duplication)
export async function getDealByIdAction(
  dealId: string
): Promise<{ deal: Deal | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { deal: null, error: "Unauthorized" };
    }

    // Fetch the deal (RLS will ensure only creator can access)
    const { data, error } = await supabase
      .from("deals")
      .select(
        `
        *,
        creator:profiles!creator_id(name)
      `
      )
      .eq("id", dealId)
      .eq("creator_id", user.id)
      .single();

    if (error || !data) {
      return { deal: null, error: error?.message || "Deal not found" };
    }

    return {
      deal: {
        ...transformDeal(data),
        creatorName: (data.creator as { name: string } | null)?.name || "Unknown",
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching deal by ID", error);
    return { deal: null, error: "Server error" };
  }
}

// Get access token for a deal (for public signing page)
// SECURITY: Requires valid publicId to prove caller has access to deal link
export async function getAccessTokenAction(
  dealId: string,
  publicId?: string
): Promise<{ token: string | null; error: string | null }> {
  try {
    // Validate inputs - dealId should be a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!dealId || typeof dealId !== "string" || !uuidRegex.test(dealId)) {
      return { token: null, error: "Invalid deal ID" };
    }

    const supabase = await createServerSupabaseClient();

    // SECURITY: If publicId provided, verify it matches the deal
    // This proves the caller has access to the public deal link
    if (publicId) {
      const { data: deal } = await supabase.rpc("get_deal_by_public_id", { p_public_id: publicId });

      if (!deal || (deal as Record<string, unknown>).id !== dealId) {
        return { token: null, error: "Deal not found" };
      }

      // Only return token for pending deals (not confirmed/voided)
      const dealStatus = (deal as Record<string, unknown>).status;
      if (dealStatus !== "pending" && dealStatus !== "sealing") {
        return { token: null, error: "Deal is not available for signing" };
      }
    } else {
      // If no publicId, require authentication
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        return { token: null, error: "Authentication required" };
      }

      // Verify user is a party to this deal
      const { data: deal } = await supabase
        .from("deals")
        .select("creator_id, recipient_id, status")
        .eq("id", dealId)
        .single();

      if (!deal || (deal.creator_id !== user.id && deal.recipient_id !== user.id)) {
        return { token: null, error: "Not authorized" };
      }
    }

    // Use RPC function that bypasses RLS to get the token
    const { data, error } = await supabase.rpc("get_access_token_for_deal", { p_deal_id: dealId });

    if (error || !data) {
      logger.error("Error fetching access token", error);
      return { token: null, error: error?.message || "No valid token found" };
    }

    return { token: data as string, error: null };
  } catch (error) {
    logger.error("Error fetching access token", error);
    return { token: null, error: "Server error" };
  }
}


// Get access token for viewing a sealed deal (includes used tokens)
// This is for creators to share the access link for confirmed deals
export async function getViewAccessTokenAction(
  dealId: string
): Promise<{ token: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication - only deal parties can get the token
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { token: null, error: "Not authenticated" };
    }

    // Verify user is a party to this deal
    const { data: deal } = await supabase
      .from("deals")
      .select("creator_id, recipient_id")
      .eq("id", dealId)
      .single();

    if (!deal || (deal.creator_id !== user.id && deal.recipient_id !== user.id)) {
      return { token: null, error: "Not authorized" };
    }

    // Get the most recent token for this deal (including used ones)
    const { data, error } = await supabase
      .from("access_tokens")
      .select("token")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return { token: null, error: "No token found for this deal" };
    }

    return { token: data.token, error: null };
  } catch (error) {
    logger.error("Error fetching view access token", error);
    return { token: null, error: "Server error" };
  }
}

// Token status types
export type TokenStatus = "valid" | "expired" | "used" | "not_found";

// Get detailed token status for a deal
export async function getTokenStatusAction(dealId: string): Promise<{
  status: TokenStatus;
  expiresAt: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the token details directly
    const { data, error } = await supabase.rpc("get_token_status_for_deal", { p_deal_id: dealId });

    if (error) {
      // If the function doesn't exist in the database, fall back to "valid"
      // to allow the deal flow to continue. This handles the case where
      // the user hasn't run the updated schema.sql yet.
      if (error.code === "PGRST202") {
        logger.warn(
          "get_token_status_for_deal function not found in database. Please run the updated schema.sql. Falling back to valid status."
        );
        return { status: "valid", expiresAt: null, error: null };
      }
      logger.error("Error fetching token status", error);
      return { status: "not_found", expiresAt: null, error: "Failed to get token status" };
    }

    if (!data) {
      return { status: "not_found", expiresAt: null, error: null };
    }

    const tokenData = data as { status: TokenStatus; expires_at: string };
    return {
      status: tokenData.status,
      expiresAt: tokenData.expires_at,
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching token status", error);
    return { status: "not_found", expiresAt: null, error: "Server error" };
  }
}

// Validate access token for viewing a sealed deal
// NOTE: Used tokens should still grant view access for confirmed deals (they were used to sign)
export async function validateViewTokenAction(
  dealId: string,
  token: string,
  publicId?: string // Optional - used to bypass RLS for checking deal status
): Promise<{ isValid: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // First, try the RPC function for unused tokens
    const { data: rpcResult, error: rpcError } = await supabase.rpc("validate_access_token", {
      p_deal_id: dealId,
      p_token: token,
    });

    // If RPC says valid, return true
    if (!rpcError && rpcResult === true) {
      // Log successful token validation
      await supabase.from("audit_log").insert({
        deal_id: dealId,
        event_type: "token_validated",
        actor_id: null,
        actor_type: "system",
        metadata: {
          result: "valid",
          tokenType: "access",
          timestamp: new Date().toISOString(),
        },
      });
      return { isValid: true, error: null };
    }

    // If RPC returns false, check if the token was used (for a signed deal)
    // We need to check: 1) token exists and is "used" status 2) deal is confirmed
    const { data: tokenStatus } = await supabase.rpc("get_token_status_for_deal", {
      p_deal_id: dealId,
    });

    if (tokenStatus && (tokenStatus as { status: string }).status === "used" && publicId) {
      // Token was used - check if deal is confirmed using RPC that bypasses RLS
      const { data: dealData } = await supabase.rpc("get_deal_by_public_id", {
        p_public_id: publicId,
      });

      // If deal is confirmed, allow access with the used token
      // NOTE: This is slightly permissive but tokens are unique per deal
      if (dealData && (dealData as { status: string }).status === "confirmed") {
        // Log successful validation of used token
        await supabase.from("audit_log").insert({
          deal_id: dealId,
          event_type: "token_validated",
          actor_id: null,
          actor_type: "system",
          metadata: {
            result: "valid",
            tokenType: "used_access",
            timestamp: new Date().toISOString(),
          },
        });
        return { isValid: true, error: null };
      }
    }

    // Log failed token validation - but only if a token was actually provided
    if (token) {
      await supabase.from("audit_log").insert({
        deal_id: dealId,
        event_type: "token_validated",
        actor_id: null,
        actor_type: "system",
        metadata: {
          result: "invalid",
          tokenType: "access",
          timestamp: new Date().toISOString(),
        },
      });
    }

    return { isValid: false, error: null };
  } catch (error) {
    logger.error("Error validating access token", error);
    return { isValid: false, error: "Server error" };
  }
}

// Upload signature to Supabase Storage
// SECURITY: Added input validation and file size limit
const MAX_SIGNATURE_SIZE = 1024 * 1024; // 1MB max signature size

export async function uploadSignatureAction(
  dealId: string,
  signatureBase64: string
): Promise<{ signatureUrl: string | null; error: string | null }> {
  try {
    // Validate dealId
    // Validate dealId - should be a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!dealId || typeof dealId !== "string" || !uuidRegex.test(dealId)) {
      return { signatureUrl: null, error: "Invalid deal ID" };
    }

    // Validate signature exists and is a base64 image
    if (!signatureBase64 || typeof signatureBase64 !== "string") {
      return { signatureUrl: null, error: "Signature is required" };
    }

    // SECURITY: Strict MIME type validation - only allow PNG and JPEG
    const allowedMimeTypes = ["data:image/png;base64,", "data:image/jpeg;base64,", "data:image/jpg;base64,"];
    const hasValidMime = allowedMimeTypes.some(mime => signatureBase64.startsWith(mime));
    if (!hasValidMime) {
      return { signatureUrl: null, error: "Invalid signature format. Only PNG and JPEG allowed." };
    }

    // SECURITY: Rate limit by IP to prevent upload abuse
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = await checkRateLimit("general", `upload:${ip}`);
    if (!rateLimitResult.success) {
      return { signatureUrl: null, error: "Rate limit exceeded. Please try again later." };
    }

    const supabase = await createServerSupabaseClient();

    // Convert base64 to buffer
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // SECURITY: Validate file size to prevent DoS
    if (buffer.length > MAX_SIGNATURE_SIZE) {
      return { signatureUrl: null, error: "Signature file is too large (max 1MB)" };
    }


    // Generate unique filename
    // Detect the actual MIME type from the base64 header
    const isPng = signatureBase64.startsWith("data:image/png");
    const extension = isPng ? "png" : "jpg";
    const contentType = isPng ? "image/png" : "image/jpeg";
    const filename = `${dealId}/${nanoid(10)}.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filename, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      // No base64 fallback - storage must be properly configured
      // Base64 storage in database causes performance issues and is bad practice
      logger.error("Error uploading signature", uploadError);
      return { signatureUrl: null, error: "Failed to upload signature. Please try again." };
    }


    // Get public URL
    const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(filename);

    return { signatureUrl: urlData.publicUrl, error: null };
  } catch (error) {
    logger.error("Error in uploadSignatureAction", error);
    return { signatureUrl: null, error: "Failed to upload signature. Please try again." };
  }
}

// Update the input type to include publicId
export async function confirmDealAction(data: {
  dealId: string;
  publicId: string;
  token: string;
  signatureBase64: string;
  recipientEmail?: string;
}): Promise<{ deal: Deal | null; error: string | null }> {
  try {
    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { deal: null, error: originCheck.error || "Invalid request" };
    }

    // SECURITY: Rate limit by IP to prevent deal confirmation abuse
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = await checkRateLimit("general", `confirm:${ip}`);
    if (!rateLimitResult.success) {
      return { deal: null, error: "Rate limit exceeded. Please try again later." };
    }

    const supabase = await createServerSupabaseClient();

    // Check if current user is logged in
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // First upload the signature
    const { signatureUrl, error: uploadError } = await uploadSignatureAction(
      data.dealId,
      data.signatureBase64
    );

    if (uploadError || !signatureUrl) {
      logger.error("Signature upload failed", new Error(uploadError || "Unknown upload error"));
      return { deal: null, error: "Failed to upload signature. Please try again." };
    }

    const finalSignatureUrl = signatureUrl;

    // Calculate seal on the server
    const timestamp = new Date().toISOString();

    // CRITICAL FIX: Fetch terms using RPC to bypass RLS for anonymous users
    const { data: dealData, error: fetchError } = await supabase.rpc("get_deal_by_public_id", {
      p_public_id: data.publicId,
    });

    if (fetchError || !dealData) {
      logger.error("Error fetching deal terms for sealing", fetchError);
      return { deal: null, error: "Failed to fetch deal data for sealing" };
    }

    // Verify ID matches to prevent tampering - dealData is JSON type from RPC
    const dealDataJson = dealData as { id: string; terms: unknown[] };
    if (dealDataJson.id !== data.dealId) {
      return { deal: null, error: "Deal ID mismatch" };
    }

    const terms = dealDataJson.terms || [];

    // Fetch verification records for this deal (if any)
    // These are included in the seal to create a tamper-proof record of identity verification
    // CRITICAL: Use RPC function to bypass RLS - anonymous recipients can't SELECT from deal_verifications
    const { data: verificationRecords } = await supabase.rpc("get_deal_verifications", {
      p_deal_id: data.dealId,
    });

    // RPC returns JSON array or null, need to handle both
    const verifications = transformVerificationsForHash(verificationRecords as VerificationRecord[] | null);

    const dealSeal = await calculateDealSeal({
      dealId: data.dealId,
      terms: JSON.stringify(terms),
      signatureUrl: finalSignatureUrl,
      timestamp,
      verifications,
    });

    // Use the confirm_deal_with_token function
    const { data: confirmedDeal, error: confirmError } = await supabase.rpc(
      "confirm_deal_with_token",
      {
        p_deal_id: data.dealId,
        p_token: data.token,
        p_signature_data: finalSignatureUrl,
        p_deal_seal: dealSeal,
        p_recipient_email: data.recipientEmail || null,
        p_recipient_id: user?.id || null,
        p_confirmed_at: timestamp,
      }
    );

    if (confirmError) {
      logger.error("Error confirming deal", confirmError);
      return { deal: null, error: confirmError.message };
    }

    if (!confirmedDeal) {
      return { deal: null, error: "Failed to confirm deal" };
    }

    // Get creator name
    const { data: creator } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", (confirmedDeal as Record<string, unknown>).creator_id)
      .single();

    return {
      deal: {
        ...transformDeal(confirmedDeal as Record<string, unknown>),
        creatorName: creator?.name || "Unknown",
      },
      error: null,
    };
  } catch (error) {
    logger.error("Server error confirming deal", error);
    return { deal: null, error: "Server error" };
  }
}

// Void a deal
// SECURITY: Added CSRF protection and input validation
export async function voidDealAction(dealId: string): Promise<{ error: string | null }> {
  try {
    // Validate input - dealId should be a valid UUID
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!dealId || typeof dealId !== "string" || !uuidRegex.test(dealId)) {
      return { error: "Invalid deal ID" };
    }

    // SECURITY: Validate request origin
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();


    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("deals")
      .update({
        status: "voided",
        voided_at: new Date().toISOString(),
      })
      .eq("id", dealId)
      .eq("creator_id", user.id);

    if (error) {
      return { error: "Failed to void deal" };
    }

    // Add audit log
    await supabase.from("audit_log").insert({
      deal_id: dealId,
      event_type: "deal_voided",
      actor_id: user.id,
      actor_type: "creator",
    });

    return { error: null };
  } catch (error) {
    logger.error("Error voiding deal", error);
    return { error: "Server error" };
  }
}

// Mark deal as viewed
export async function markDealViewedAction(publicId: string): Promise<void> {
  try {
    // Validate input
    if (!publicId || typeof publicId !== "string" || publicId.length < 5 || publicId.length > 20) {
      logger.warn("Invalid publicId in markDealViewedAction");
      return;
    }

    const supabase = await createServerSupabaseClient();


    // Get the deal first using RPC to bypass RLS
    const { data: deal } = await supabase.rpc("get_deal_by_public_id", { p_public_id: publicId });

    if (!deal) return;

    const dealData = deal as Record<string, unknown>;
    const isFirstView = !dealData.viewed_at;

    // Update viewed_at if not already set (shortcut on deal table)
    if (isFirstView) {
      await supabase
        .from("deals")
        .update({ viewed_at: new Date().toISOString() })
        .eq("public_id", publicId);
    }

    // Count how many times this deal has been viewed for the view number
    const { count: viewCount } = await supabase
      .from("audit_log")
      .select("*", { count: "exact", head: true })
      .eq("deal_id", dealData.id as string)
      .eq("event_type", "deal_viewed");

    // Get the current user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    // Determine actor type based on who is viewing
    // If it's the deal creator, mark as creator. Otherwise assume recipient/public viewer.
    const isCreator = user?.id === dealData.creator_id;
    const actorType = isCreator ? "creator" : "recipient";

    // Get request headers for IP and User Agent
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Use RPC to log the event securely (bypassing RLS for anonymous view logging)
    await supabase.rpc("log_audit_event", {
      p_deal_id: dealData.id as string,
      p_event_type: "deal_viewed",
      p_actor_type: actorType,
      p_actor_id: user?.id || null,
      p_ip_address: ip,
      p_user_agent: userAgent,
      p_metadata: {
        isLoggedIn: !!user,
        isFirstView,
        viewNumber: (viewCount || 0) + 1,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error("Error marking deal viewed", error);
  }
}

// Ensure user profile exists in database (upsert)
export async function ensureProfileExistsAction(): Promise<{
  profile: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    hasCompletedOnboarding: boolean;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { profile: null, error: "Not authenticated" };
    }

    // Extract OAuth metadata (from Google, etc.)
    const oauthName = user.user_metadata?.full_name || user.user_metadata?.name || "";
    const oauthAvatarUrl = user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

    // Try to get existing profile
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existingProfile && !selectError) {
      // Profile exists - check if we should update it with newer OAuth data
      const shouldUpdateAvatar = oauthAvatarUrl && !existingProfile.avatar_url;
      const shouldUpdateName = oauthName && !existingProfile.name;

      if (shouldUpdateAvatar || shouldUpdateName) {
        // Update profile with OAuth data if missing
        const updates: Record<string, unknown> = {};
        if (shouldUpdateAvatar) updates.avatar_url = oauthAvatarUrl;
        if (shouldUpdateName) updates.name = oauthName;

        await supabase.from("profiles").update(updates).eq("id", user.id);
      }

      const hasValidName = !!(existingProfile.name || oauthName)?.trim();
      return {
        profile: {
          id: existingProfile.id,
          email: existingProfile.email,
          name: existingProfile.name || oauthName || null,
          avatarUrl: existingProfile.avatar_url || oauthAvatarUrl,
          hasCompletedOnboarding: hasValidName,
        },
        error: null,
      };
    }

    // Profile doesn't exist, create it with OAuth data
    const hasValidDefaultName = !!oauthName?.trim();

    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email || "",
        name: oauthName || null,
        avatar_url: oauthAvatarUrl,
      })
      .select()
      .single();

    if (insertError) {
      logger.error("Error creating profile", insertError);
      return { profile: null, error: insertError.message };
    }

    return {
      profile: {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        avatarUrl: newProfile.avatar_url,
        // Mark onboarding complete if user came with a valid name from OAuth (e.g., Google)
        hasCompletedOnboarding: hasValidDefaultName,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error ensuring profile exists", error);
    return { profile: null, error: "Server error" };
  }
}

// Update user profile
export async function updateProfileAction(updates: {
  name?: string;
  avatarUrl?: string;
  jobTitle?: string;
  location?: string;
  currency?: string;
}): Promise<{ error: string | null }> {
  try {
    // Validate input with Zod
    const validation = updateProfileSchema.safeParse(updates);
    if (!validation.success) {
      return { error: validation.error.issues[0]?.message || "Invalid input" };
    }
    const validatedUpdates = validation.data;

    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // First ensure profile exists
    const { error: ensureError } = await ensureProfileExistsAction();
    if (ensureError) {
      return { error: ensureError };
    }

    // Build update object with snake_case keys for database
    const dbUpdates: Record<string, unknown> = {};
    if (validatedUpdates.name !== undefined) dbUpdates.name = validatedUpdates.name;
    if (validatedUpdates.avatarUrl !== undefined) dbUpdates.avatar_url = validatedUpdates.avatarUrl;
    if (validatedUpdates.jobTitle !== undefined) dbUpdates.job_title = validatedUpdates.jobTitle;
    if (validatedUpdates.location !== undefined) dbUpdates.location = validatedUpdates.location;
    if (validatedUpdates.currency !== undefined) dbUpdates.currency = validatedUpdates.currency;

    const { error } = await supabase.from("profiles").update(dbUpdates).eq("id", user.id);

    if (error) {
      return { error: "Failed to update profile" };
    }

    return { error: null };
  } catch (error) {
    logger.error("Error updating profile", error);
    return { error: "Server error" };
  }
}

// Upload avatar to Supabase Storage
// SECURITY: Added size limit and MIME type validation
const MAX_AVATAR_SIZE = 2 * 1024 * 1024; // 2MB max avatar size

export async function uploadAvatarAction(
  avatarBase64: string
): Promise<{ avatarUrl: string | null; error: string | null }> {
  try {
    // Validate input
    if (!avatarBase64 || typeof avatarBase64 !== "string") {
      return { avatarUrl: null, error: "Avatar is required" };
    }

    // SECURITY: Strict MIME type validation
    const allowedMimeTypes = ["data:image/png;base64,", "data:image/jpeg;base64,", "data:image/jpg;base64,", "data:image/webp;base64,"];
    const hasValidMime = allowedMimeTypes.some(mime => avatarBase64.startsWith(mime));
    if (!hasValidMime) {
      return { avatarUrl: null, error: "Invalid avatar format. Only PNG, JPEG, and WebP allowed." };
    }

    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { avatarUrl: null, error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { avatarUrl: null, error: "Not authenticated" };
    }

    // Convert base64 to buffer
    const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // SECURITY: Validate file size
    if (buffer.length > MAX_AVATAR_SIZE) {
      return { avatarUrl: null, error: "Avatar file is too large (max 2MB)" };
    }

    // Generate unique filename
    const filename = `${user.id}/${nanoid(10)}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage.from("avatars").upload(filename, buffer, {
      contentType: "image/png",
      cacheControl: "3600",
      upsert: true,
    });

    if (uploadError) {
      return { avatarUrl: null, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(filename);

    // Update profile with new avatar URL
    await supabase.from("profiles").update({ avatar_url: urlData.publicUrl }).eq("id", user.id);

    return { avatarUrl: urlData.publicUrl, error: null };
  } catch (error) {
    logger.error("Error uploading avatar", error);
    return { avatarUrl: null, error: "Server error" };
  }
}

// Get user's deals from database
export async function getUserDealsAction(): Promise<{ deals: Deal[]; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { deals: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("deals")
      .select(
        `
        *,
        creator:profiles!creator_id(name)
      `
      )
      .or(`creator_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      return { deals: [], error: "Failed to load deals" };
    }

    const deals = (data || []).map((deal) => ({
      ...transformDeal(deal),
      creatorName: (deal.creator as { name: string } | null)?.name || "Unknown",
    }));

    return { deals, error: null };
  } catch (error) {
    logger.error("Error fetching deals", error);
    return { deals: [], error: "Server error" };
  }
}

// Get audit logs for a deal (permission check: creator, recipient, or valid token)
export async function getAuditLogsAction(dealId: string, token?: string): Promise<{
  logs: Array<{
    id: string;
    dealId: string;
    eventType: string;
    actorId: string | null;
    actorType: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // Use RPC to fetch logs securely based on auth OR token
    const { data, error } = await supabase.rpc("get_deal_audit_logs", {
      p_deal_id: dealId,
      p_token: token || null
    });

    if (error) {
      return { logs: [], error: "Failed to load audit logs" };
    }

    const logs = ((data as Record<string, unknown>[]) || []).map((log) => ({
      id: log.id as string,
      dealId: log.deal_id as string,
      eventType: log.event_type as string,
      actorId: log.actor_id as string | null,
      actorType: log.actor_type as string,
      metadata: log.metadata as Record<string, unknown> | null,
      createdAt: log.created_at as string,
    }));

    return { logs, error: null };
  } catch (error) {
    logger.error("Error fetching audit logs", error);
    return { logs: [], error: "Server error" };
  }
}

// Log an audit event with enhanced metadata (centralized logging action)
export async function logAuditEventAction(data: {
  dealId: string;
  publicId?: string;
  eventType: "deal_created" | "deal_viewed" | "deal_signed" | "deal_confirmed" | "deal_voided" | "email_sent" | "pdf_generated" | "pdf_downloaded" | "deal_verified" | "deal_link_shared" | "token_validated" | "email_otp_sent" | "email_verified" | "phone_otp_sent" | "phone_verified";
  actorType: "creator" | "recipient" | "system";
  metadata?: Record<string, unknown>;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get request headers for IP and User Agent
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for") || "unknown";
    const userAgent = headersList.get("user-agent") || "unknown";

    // Get the current user if authenticated
    const { data: { user } } = await supabase.auth.getUser();

    // If we have a publicId but no dealId, resolve the dealId
    let dealId = data.dealId;
    if (!dealId && data.publicId) {
      const { data: dealData } = await supabase.rpc("get_deal_by_public_id", { p_public_id: data.publicId });
      if (dealData) {
        dealId = (dealData as Record<string, unknown>).id as string;
      }
    }

    if (!dealId) {
      return { success: false, error: "Deal ID required" };
    }

    // Build enhanced metadata
    const enhancedMetadata = {
      ...data.metadata,
      timestamp: new Date().toISOString(),
    };

    // Use RPC to bypass RLS for inserting audit logs
    // This allows anonymous recipients to log events like deal_signed
    const { error: insertError } = await supabase.rpc("log_audit_event", {
      p_deal_id: dealId,
      p_event_type: data.eventType,
      p_actor_type: data.actorType,
      p_metadata: enhancedMetadata,
      p_actor_id: user?.id || null,
      p_ip_address: ip,
      p_user_agent: userAgent,
    });

    if (insertError) {
      logger.error("Error inserting audit log", insertError);
      return { success: false, error: insertError.message };
    }

    return { success: true, error: null };
  } catch (error) {
    logger.error("Error logging audit event", error);
    return { success: false, error: "Server error" };
  }
}

// Get private deal details (only for authorized parties: creator or recipient)
export async function getPrivateDealAction(publicId: string): Promise<{
  deal: Deal | null;
  auditLogs: Array<{
    id: string;
    dealId: string;
    eventType: string;
    actorId: string | null;
    actorType: string;
    metadata: Record<string, unknown> | null;
    createdAt: string;
  }>;
  creatorProfile: { name: string; avatarUrl?: string } | null;
  recipientProfile: { name: string; avatarUrl?: string } | null;
  isCreator: boolean;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check authentication
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return {
        deal: null,
        auditLogs: [],
        creatorProfile: null,
        recipientProfile: null,
        isCreator: false,
        error: "Authentication required",
      };
    }

    // Get the deal using RPC to bypass RLS
    const { data: dealData, error: fetchError } = await supabase.rpc("get_deal_by_public_id", {
      p_public_id: publicId,
    });

    if (fetchError || !dealData) {
      return {
        deal: null,
        auditLogs: [],
        creatorProfile: null,
        recipientProfile: null,
        isCreator: false,
        error: "Deal not found",
      };
    }

    const deal = transformDeal(dealData as Record<string, unknown>);

    // Authorization check: user must be creator OR recipient
    const isCreator = deal.creatorId === user.id;
    const isRecipient =
      deal.recipientId === user.id ||
      (deal.recipientEmail && deal.recipientEmail.toLowerCase() === user.email?.toLowerCase());

    if (!isCreator && !isRecipient) {
      return {
        deal: null,
        auditLogs: [],
        creatorProfile: null,
        recipientProfile: null,
        isCreator: false,
        error: "Unauthorized - you are not a party to this deal",
      };
    }

    // Fetch creator profile
    const { data: creatorData } = await supabase
      .from("profiles")
      .select("name, avatar_url")
      .eq("id", deal.creatorId)
      .single();

    const creatorProfile = creatorData
      ? { name: creatorData.name || "Unknown", avatarUrl: creatorData.avatar_url }
      : null;

    // Fetch recipient profile if they have an account
    let recipientProfile: { name: string; avatarUrl?: string } | null = null;
    if (deal.recipientId) {
      const { data: recipientData } = await supabase
        .from("profiles")
        .select("name, avatar_url")
        .eq("id", deal.recipientId)
        .single();

      recipientProfile = recipientData
        ? { name: recipientData.name || deal.recipientName || "Unknown", avatarUrl: recipientData.avatar_url }
        : null;
    } else if (deal.recipientName) {
      // Use recipient name from deal if no profile
      recipientProfile = { name: deal.recipientName };
    }

    // Fetch audit logs
    const { logs } = await getAuditLogsAction(deal.id);

    return {
      deal,
      auditLogs: logs,
      creatorProfile,
      recipientProfile,
      isCreator,
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching private deal", error);
    return {
      deal: null,
      auditLogs: [],
      creatorProfile: null,
      recipientProfile: null,
      isCreator: false,
      error: "Server error",
    };
  }
}

// Send deal receipt email (called after confirmation)
export async function sendDealReceiptAction(data: {
  dealId: string;
  publicId?: string; // Optional - used to bypass RLS for anonymous users
  recipientEmail: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get user or use IP for rate limiting
    const { data: { user } } = await supabase.auth.getUser();
    let rateLimitId: string;

    if (user) {
      rateLimitId = user.id;
    } else {
      // For anonymous users, use IP-based rate limiting
      const headersList = await headers();
      rateLimitId = `ip:${headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"}`;
    }

    // SECURITY: Rate limit email sending to prevent spam
    const rateLimitResult = await checkRateLimit("email", rateLimitId);
    if (!rateLimitResult.success) {
      return { success: false, error: "Rate limit exceeded. Please try again later." };
    }

    // Try normal select first (works for authenticated users)
    let dealData = null;
    let creatorName = "Unknown";

    const { data: selectData, error: selectError } = await supabase
      .from("deals")
      .select(
        `
        *,
        creator:profiles!creator_id(name)
      `
      )
      .eq("id", data.dealId)
      .single();

    if (!selectError && selectData) {
      dealData = selectData;
      creatorName = (dealData.creator as { name: string } | null)?.name || "Unknown";
    } else if (data.publicId) {
      // Fallback: Use RPC to bypass RLS (for anonymous users after signing)
      const { data: rpcData, error: rpcError } = await supabase.rpc("get_deal_by_public_id", {
        p_public_id: data.publicId,
      });

      if (rpcError || !rpcData) {
        return { success: false, error: "Deal not found" };
      }

      dealData = rpcData;

      // Fetch creator name separately
      const { data: creator } = await supabase
        .from("profiles")
        .select("name")
        .eq("id", (dealData as Record<string, unknown>).creator_id)
        .single();

      creatorName = creator?.name || "Unknown";
    } else {
      return { success: false, error: "Deal not found" };
    }

    const deal: Deal = {
      ...transformDeal(dealData as Record<string, unknown>),
      creatorName,
    };

    // Import email function dynamically to avoid bundling issues
    const { sendDealReceiptEmail } = await import("@/lib/email");

    // Send the email
    const { success, error: emailError } = await sendDealReceiptEmail({
      deal,
      recipientEmail: data.recipientEmail,
      pdfBase64: data.pdfBase64,
      pdfFilename: data.pdfFilename,
    });

    if (!success) {
      logger.error("Email send failed", new Error(emailError || "Unknown email error"));
      return { success: false, error: emailError || "Failed to send email" };
    }

    // Add audit log entry
    await supabase.from("audit_log").insert({
      deal_id: data.dealId,
      event_type: "email_sent",
      actor_type: "system",
      metadata: {
        emailType: "receipt",
        recipient: data.recipientEmail,
        hasPdfAttachment: !!data.pdfBase64,
      },
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error("Error sending receipt email", error);
    return { success: false, error: "Server error" };
  }
}

// Send deal invitation/nudge email
export async function sendDealInvitationAction(data: {
  dealId: string;
  recipientEmail: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { success: false, error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();

    // Get authenticated user (invitations require auth)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // SECURITY: Rate limit email sending to prevent spam
    const rateLimitResult = await checkRateLimit("email", user.id);
    if (!rateLimitResult.success) {
      return { success: false, error: "Rate limit exceeded. Please try again later." };
    }

    // Fetch the deal with creator info
    const { data: dealData, error: fetchError } = await supabase
      .from("deals")
      .select(
        `
        *,
        creator:profiles!creator_id(name)
      `
      )
      .eq("id", data.dealId)
      .single();

    if (fetchError || !dealData) {
      return { success: false, error: "Deal not found" };
    }

    const deal: Deal = {
      ...transformDeal(dealData),
      creatorName: (dealData.creator as { name: string } | null)?.name || "Unknown",
    };

    // Check deal status
    if (deal.status !== "pending") {
      return { success: false, error: "Can only send invitations for pending deals" };
    }

    // Construct share URL
    const shareUrl = `${APP_URL}/d/public/${deal.publicId}`;

    // Import email function dynamically
    const { sendDealInvitationEmail } = await import("@/lib/email");

    // Send the email
    const { success, error: emailError } = await sendDealInvitationEmail({
      deal,
      recipientEmail: data.recipientEmail,
      shareUrl,
    });

    if (!success) {
      logger.error("Invitation email send failed", new Error(emailError || "Unknown email error"));
      return { success: false, error: emailError || "Failed to send email" };
    }

    // Add audit log entry
    await supabase.from("audit_log").insert({
      deal_id: data.dealId,
      event_type: "email_sent",
      actor_type: "system",
      metadata: {
        emailType: "invitation",
        recipient: data.recipientEmail,
      },
    });

    // Update last_nudged_at on the deal
    await supabase
      .from("deals")
      .update({ last_nudged_at: new Date().toISOString() })
      .eq("id", data.dealId);

    return { success: true, error: null };
  } catch (error) {
    logger.error("Error sending invitation email", error);
    return { success: false, error: "Server error" };
  }
}

// Get user profile with extended fields
export async function getUserProfileAction(): Promise<{
  profile: {
    id: string;
    email: string;
    name: string | null;
    avatarUrl: string | null;
    jobTitle: string | null;
    location: string | null;
    currency: string | null;
    signatureUrl: string | null;
    isPro: boolean;
  } | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { profile: null, error: "Not authenticated" };
    }

    const { data, error } = await supabase.from("profiles").select("*").eq("id", user.id).single();

    if (error || !data) {
      return { profile: null, error: error?.message || "Profile not found" };
    }

    return {
      profile: {
        id: data.id,
        email: data.email,
        name: data.name,
        avatarUrl: data.avatar_url,
        jobTitle: data.job_title,
        location: data.location,
        currency: data.currency,
        signatureUrl: data.signature_url,
        isPro: data.is_pro || false,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching profile", error);
    return { profile: null, error: "Server error" };
  }
}

// Notification preferences type
export type NotificationPreferences = {
  notifyDealViewed: boolean;
  notifyDealSigned: boolean;
  notifyDealExpiring: boolean;
  notifyDealComments: boolean;
  notifyMessages: boolean;
  notifyMentions: boolean;
  notifyDeadlines: boolean;
  notifyFollowups: boolean;
  notifySecurity: boolean;
  notifyProductUpdates: boolean;
  emailFrequency: "instant" | "daily" | "weekly";
  channelEmail: boolean;
  channelPush: boolean;
  channelMobile: boolean;
};

// Get notification preferences
export async function getNotificationPreferencesAction(): Promise<{
  preferences: NotificationPreferences | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { preferences: null, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .single();

    // If no preferences exist yet, return defaults
    if (error && error.code === "PGRST116") {
      return {
        preferences: {
          notifyDealViewed: true,
          notifyDealSigned: true,
          notifyDealExpiring: true,
          notifyDealComments: true,
          notifyMessages: true,
          notifyMentions: true,
          notifyDeadlines: true,
          notifyFollowups: false,
          notifySecurity: true,
          notifyProductUpdates: false,
          emailFrequency: "instant",
          channelEmail: true,
          channelPush: true,
          channelMobile: false,
        },
        error: null,
      };
    }

    if (error || !data) {
      return { preferences: null, error: error?.message || "Failed to load preferences" };
    }

    return {
      preferences: {
        notifyDealViewed: data.notify_deal_viewed,
        notifyDealSigned: data.notify_deal_signed,
        notifyDealExpiring: data.notify_deal_expiring,
        notifyDealComments: data.notify_deal_comments,
        notifyMessages: data.notify_messages,
        notifyMentions: data.notify_mentions,
        notifyDeadlines: data.notify_deadlines,
        notifyFollowups: data.notify_followups,
        notifySecurity: data.notify_security,
        notifyProductUpdates: data.notify_product_updates,
        emailFrequency: data.email_frequency as "instant" | "daily" | "weekly",
        channelEmail: data.channel_email,
        channelPush: data.channel_push,
        channelMobile: data.channel_mobile,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching notification preferences", error);
    return { preferences: null, error: "Server error" };
  }
}

// Update notification preferences (upsert)
export async function updateNotificationPreferencesAction(
  preferences: Partial<NotificationPreferences>
): Promise<{ error: string | null }> {
  try {
    // Validate input with Zod
    const validation = notificationPreferencesSchema.safeParse(preferences);
    if (!validation.success) {
      return { error: validation.error.issues[0]?.message || "Invalid input" };
    }
    const validatedPrefs = validation.data;

    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();


    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Build update object with snake_case keys
    const dbUpdates: Record<string, unknown> = { user_id: user.id };
    if (validatedPrefs.notifyDealViewed !== undefined)
      dbUpdates.notify_deal_viewed = validatedPrefs.notifyDealViewed;
    if (validatedPrefs.notifyDealSigned !== undefined)
      dbUpdates.notify_deal_signed = validatedPrefs.notifyDealSigned;
    if (validatedPrefs.notifyDealExpiring !== undefined)
      dbUpdates.notify_deal_expiring = validatedPrefs.notifyDealExpiring;
    if (validatedPrefs.notifyDealComments !== undefined)
      dbUpdates.notify_deal_comments = validatedPrefs.notifyDealComments;
    if (validatedPrefs.notifyMessages !== undefined)
      dbUpdates.notify_messages = validatedPrefs.notifyMessages;
    if (validatedPrefs.notifyMentions !== undefined)
      dbUpdates.notify_mentions = validatedPrefs.notifyMentions;
    if (validatedPrefs.notifyDeadlines !== undefined)
      dbUpdates.notify_deadlines = validatedPrefs.notifyDeadlines;
    if (validatedPrefs.notifyFollowups !== undefined)
      dbUpdates.notify_followups = preferences.notifyFollowups;
    if (preferences.notifySecurity !== undefined)
      dbUpdates.notify_security = preferences.notifySecurity;
    if (preferences.notifyProductUpdates !== undefined)
      dbUpdates.notify_product_updates = preferences.notifyProductUpdates;
    if (preferences.emailFrequency !== undefined)
      dbUpdates.email_frequency = preferences.emailFrequency;
    if (preferences.channelEmail !== undefined) dbUpdates.channel_email = preferences.channelEmail;
    if (preferences.channelPush !== undefined) dbUpdates.channel_push = preferences.channelPush;
    if (preferences.channelMobile !== undefined)
      dbUpdates.channel_mobile = preferences.channelMobile;

    // Upsert the preferences
    const { error } = await supabase
      .from("user_preferences")
      .upsert(dbUpdates, { onConflict: "user_id" });

    if (error) {
      return { error: "Failed to update preferences" };
    }

    return { error: null };
  } catch (error) {
    logger.error("Error updating notification preferences", error);
    return { error: "Server error" };
  }
}

// Delete user account (cascade delete via DB constraints)
export async function deleteUserAccountAction(): Promise<{ error: string | null }> {
  try {
    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();


    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Delete the user from auth (this will cascade to profiles and related data)
    // Note: This requires the service role key, so we use admin API
    // For client-side, we can delete the profile which will cascade, then sign out

    // First, delete all user's deals where they are creator
    const { error: dealsError } = await supabase.from("deals").delete().eq("creator_id", user.id);

    if (dealsError) {
      logger.error("Error deleting user deals", dealsError);
      // Continue anyway - we'll try to delete what we can
    }

    // Delete user preferences
    await supabase.from("user_preferences").delete().eq("user_id", user.id);

    // Delete contacts
    await supabase.from("contacts").delete().eq("user_id", user.id);

    // Delete profile (will cascade from auth.users FK constraint)
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", user.id);

    if (profileError) {
      logger.error("Error deleting profile", profileError);
      return { error: "Failed to delete account. Please contact support." };
    }

    // Sign out the user
    await supabase.auth.signOut();

    return { error: null };
  } catch (error) {
    logger.error("Error deleting user account", error);
    return { error: "Server error" };
  }
}

// Appearance preferences type
export type AppearancePreferences = {
  compactMode: boolean;
  fontScale: number;
  reducedMotion: boolean;
};

// Get appearance preferences
export async function getAppearancePreferencesAction(): Promise<{
  preferences: AppearancePreferences | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { preferences: null, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("compact_mode, font_scale, reduced_motion")
      .eq("user_id", user.id)
      .single();

    // If no preferences exist yet, return defaults
    if (error && error.code === "PGRST116") {
      return {
        preferences: {
          compactMode: false,
          fontScale: 1.0,
          reducedMotion: false,
        },
        error: null,
      };
    }

    if (error || !data) {
      return { preferences: null, error: error?.message || "Failed to load preferences" };
    }

    return {
      preferences: {
        compactMode: data.compact_mode ?? false,
        fontScale: data.font_scale ?? 1.0,
        reducedMotion: data.reduced_motion ?? false,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching appearance preferences", error);
    return { preferences: null, error: "Server error" };
  }
}

// Update appearance preferences (upsert)
export async function updateAppearancePreferencesAction(
  preferences: Partial<AppearancePreferences>
): Promise<{ error: string | null }> {
  try {
    // Validate input
    const validation = appearancePreferencesSchema.safeParse(preferences);
    if (!validation.success) {
      return { error: validation.error.issues[0]?.message || "Invalid input" };
    }

    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Build update object with snake_case keys
    const dbUpdates: Record<string, unknown> = { user_id: user.id };
    if (preferences.compactMode !== undefined) dbUpdates.compact_mode = preferences.compactMode;
    if (preferences.fontScale !== undefined) dbUpdates.font_scale = preferences.fontScale;
    if (preferences.reducedMotion !== undefined)
      dbUpdates.reduced_motion = preferences.reducedMotion;

    // Upsert the preferences
    const { error } = await supabase
      .from("user_preferences")
      .upsert(dbUpdates, { onConflict: "user_id" });

    if (error) {
      return { error: "Failed to update preferences" };
    }

    return { error: null };
  } catch (error) {
    logger.error("Error updating appearance preferences", error);
    return { error: "Server error" };
  }
}

// Do Not Disturb type (extended notification preferences)
export type DoNotDisturbStatus = {
  enabled: boolean;
  expiresAt: string | null;
};

// Get Do Not Disturb status
export async function getDoNotDisturbStatusAction(): Promise<{
  status: DoNotDisturbStatus | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { status: null, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_preferences")
      .select("do_not_disturb, dnd_expires_at")
      .eq("user_id", user.id)
      .single();

    // If no preferences exist yet, return defaults
    if (error && error.code === "PGRST116") {
      return {
        status: { enabled: false, expiresAt: null },
        error: null,
      };
    }

    if (error || !data) {
      return { status: null, error: error?.message || "Failed to load status" };
    }

    // Check if DND has expired
    const isExpired = data.dnd_expires_at && new Date(data.dnd_expires_at) < new Date();

    return {
      status: {
        enabled: isExpired ? false : (data.do_not_disturb ?? false),
        expiresAt: isExpired ? null : data.dnd_expires_at,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error fetching DND status", error);
    return { status: null, error: "Server error" };
  }
}

// Toggle Do Not Disturb (with optional duration in minutes)
export async function toggleDoNotDisturbAction(
  enabled: boolean,
  durationMinutes?: number
): Promise<{ error: string | null }> {
  try {
    // Validate input
    const validation = doNotDisturbSchema.safeParse({ enabled, durationMinutes });
    if (!validation.success) {
      return { error: validation.error.issues[0]?.message || "Invalid input" };
    }

    // SECURITY: Validate request origin (CSRF protection)
    const { validateOrigin } = await import("@/lib/security");
    const originCheck = await validateOrigin();
    if (!originCheck.isValid) {
      return { error: originCheck.error || "Invalid request" };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Calculate expiry time if duration provided
    let expiresAt: string | null = null;
    if (enabled && durationMinutes && durationMinutes > 0) {
      const expiry = new Date();
      expiry.setMinutes(expiry.getMinutes() + durationMinutes);
      expiresAt = expiry.toISOString();
    }

    // Upsert the preferences
    const { error } = await supabase.from("user_preferences").upsert(
      {
        user_id: user.id,
        do_not_disturb: enabled,
        dnd_expires_at: expiresAt,
      },
      { onConflict: "user_id" }
    );

    if (error) {
      return { error: "Failed to update schedule" };
    }

    return { error: null };
  } catch (error) {
    logger.error("Error toggling DND", error);
    return { error: "Server error" };
  }
}

// Upload signature to user profile
// SECURITY: Added size limit and MIME type validation
export async function uploadProfileSignatureAction(
  signatureBase64: string
): Promise<{ signatureUrl: string | null; error: string | null }> {
  try {
    // Validate input
    if (!signatureBase64 || typeof signatureBase64 !== "string") {
      return { signatureUrl: null, error: "Signature is required" };
    }

    // SECURITY: Strict MIME type validation - only allow PNG and JPEG
    const allowedMimeTypes = ["data:image/png;base64,", "data:image/jpeg;base64,", "data:image/jpg;base64,"];
    const hasValidMime = allowedMimeTypes.some(mime => signatureBase64.startsWith(mime));
    if (!hasValidMime) {
      return { signatureUrl: null, error: "Invalid signature format. Only PNG and JPEG allowed." };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return { signatureUrl: null, error: "Not authenticated" };
    }

    // Convert base64 to buffer
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // SECURITY: Validate file size (reuse MAX_SIGNATURE_SIZE)
    if (buffer.length > MAX_SIGNATURE_SIZE) {
      return { signatureUrl: null, error: "Signature file is too large (max 1MB)" };
    }

    // Generate unique filename for user's signature
    const filename = `${user.id}/profile-signature-${nanoid(10)}.png`;

    // Upload to Supabase Storage (signatures bucket)
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filename, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true, // Allow overwriting previous signature
      });

    if (uploadError) {
      return { signatureUrl: null, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage.from("signatures").getPublicUrl(filename);

    // Update profile with new signature URL
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ signature_url: urlData.publicUrl })
      .eq("id", user.id);

    if (updateError) {
      logger.error("Error updating profile signature URL", updateError);
      // Still return the URL since the image was uploaded successfully
    }

    return { signatureUrl: urlData.publicUrl, error: null };
  } catch (error) {
    logger.error("Error uploading profile signature", error);
    return { signatureUrl: null, error: "Server error" };
  }
}

// Download user data (GDPR/Backup)
export async function downloadUserDataAction(): Promise<{
  data: string | null;
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { data: null, error: "Not authenticated" };
    }

    // SECURITY: Rate limit data export to prevent abuse
    const rateLimitResult = await checkRateLimit("general", `export:${user.id}`);
    if (!rateLimitResult.success) {
      return { data: null, error: "Rate limit exceeded. Please try again later." };
    }

    // Fetch all user data in parallel
    const [
      { data: profile },
      { data: prefs },
      { data: contacts },
      { data: deals },
      { data: auditLogs },
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("user_preferences").select("*").eq("user_id", user.id).single(),
      supabase.from("contacts").select("*").eq("user_id", user.id),
      supabase.from("deals").select("*").eq("creator_id", user.id),
      // Fetch audit logs where user is actor
      supabase.from("audit_log").select("*").eq("actor_id", user.id),
    ]);

    // Build sanitized export data - only include safe fields
    // Excludes: tokens, internal auth metadata, session data
    const safeUserInfo = {
      id: user.id,
      email: user.email,
      created_at: user.created_at,
      updated_at: user.updated_at,
    };

    const exportData = {
      exportInfo: {
        generatedAt: new Date().toISOString(),
        environment: process.env.NODE_ENV,
        version: "1.0",
      },
      user: { ...safeUserInfo, profile },
      preferences: prefs || {},
      contacts: contacts || [],
      deals: deals || [],
      activityLog: auditLogs || [],
    };

    return { data: JSON.stringify(exportData, null, 2), error: null };
  } catch (error) {
    logger.error("Error downloading user data", error);
    return { data: null, error: "Failed to generate export" };
  }
}
