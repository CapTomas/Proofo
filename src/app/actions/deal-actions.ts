"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import crypto from "crypto";
import { Deal, DealTerm } from "@/types";

// Helper to create Supabase server client
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
            // This is expected behavior in Next.js and can be safely ignored
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Cookies can fail during static generation or in middleware
            // This is expected behavior in Next.js and can be safely ignored
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

// Calculate deal seal hash on the server (secure)
export async function calculateDealSealServer(data: {
  dealId: string;
  terms: string;
  signatureUrl: string;
  timestamp: string;
}): Promise<string> {
  const payload = JSON.stringify({
    dealId: data.dealId,
    terms: data.terms,
    signatureUrl: data.signatureUrl,
    timestamp: data.timestamp,
  });
  
  return crypto.createHash("sha256").update(payload).digest("hex");
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
    createdAt: dbDeal.created_at as string,
    confirmedAt: dbDeal.confirmed_at as string | undefined,
    voidedAt: dbDeal.voided_at as string | undefined,
    viewedAt: dbDeal.viewed_at as string | undefined,
    signatureUrl: dbDeal.signature_url as string | undefined,
    dealSeal: dbDeal.deal_seal as string | undefined,
  };
}

// Create a new deal (server action)
export async function createDealAction(data: {
  title: string;
  description?: string;
  templateId?: string;
  recipientName: string;
  terms: Array<{ label: string; value: string; type: string }>;
}): Promise<{ deal: Deal | null; shareUrl: string | null; accessToken: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { deal: null, shareUrl: null, accessToken: null, error: "Not authenticated" };
    }

    // Generate secure IDs on the server
    const { publicId, accessToken } = await generateSecureIds();

    // Create the deal
    const { data: deal, error: dealError } = await supabase
      .from("deals")
      .insert({
        public_id: publicId,
        creator_id: user.id,
        title: data.title,
        description: data.description,
        template_id: data.templateId,
        recipient_name: data.recipientName,
        terms: data.terms.map((t, i) => ({
          id: `term-${i}`,
          label: t.label,
          value: t.value,
          type: t.type,
        })),
        status: "pending",
      })
      .select()
      .single();

    if (dealError || !deal) {
      console.error("Error creating deal:", dealError);
      return { deal: null, shareUrl: null, accessToken: null, error: dealError?.message || "Failed to create deal" };
    }

    // Create access token with 7-day expiry
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { error: tokenError } = await supabase
      .from("access_tokens")
      .insert({
        deal_id: deal.id,
        token: accessToken,
        expires_at: expiresAt.toISOString(),
      });

    if (tokenError) {
      console.error("Error creating access token:", tokenError);
      // Continue anyway, deal was created
    }

    // Add audit log entry
    await supabase
      .from("audit_log")
      .insert({
        deal_id: deal.id,
        event_type: "deal_created",
        actor_id: user.id,
        actor_type: "creator",
        metadata: {
          templateId: data.templateId,
          recipientName: data.recipientName,
        },
      });

    // Get creator name
    const { data: profile } = await supabase
      .from("profiles")
      .select("name")
      .eq("id", user.id)
      .single();

    const shareUrl = `${APP_URL}/d/${publicId}`;

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
    console.error("Server error creating deal:", error);
    return { deal: null, shareUrl: null, accessToken: null, error: "Server error" };
  }
}

// Get deal by public ID (for recipient view - doesn't require auth)
export async function getDealByPublicIdAction(publicId: string): Promise<{ deal: Deal | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Use the RPC function that bypasses RLS for public access
    // This function now returns JSON with creator_name included
    const { data, error } = await supabase
      .rpc("get_deal_by_public_id", { p_public_id: publicId });

    if (error || !data) {
      return { deal: null, error: error?.message || "Deal not found" };
    }

    // The function returns JSON with creator_name already included
    return {
      deal: transformDeal(data as Record<string, unknown>),
      error: null,
    };
  } catch (error) {
    console.error("Error fetching deal:", error);
    return { deal: null, error: "Server error" };
  }
}

// Get access token for a deal by public ID (bypasses RLS for anonymous recipients)
export async function getAccessTokenAction(dealId: string): Promise<{ token: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Use RPC function that bypasses RLS to get the token
    const { data, error } = await supabase
      .rpc("get_access_token_for_deal", { p_deal_id: dealId });

    if (error || !data) {
      console.error("Error fetching access token:", error);
      return { token: null, error: error?.message || "No valid token found" };
    }

    return { token: data as string, error: null };
  } catch (error) {
    console.error("Error fetching access token:", error);
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
    const { data, error } = await supabase
      .rpc("get_token_status_for_deal", { p_deal_id: dealId });

    if (error) {
      // If the function doesn't exist in the database, fall back to "valid" 
      // to allow the deal flow to continue. This handles the case where 
      // the user hasn't run the updated schema.sql yet.
      if (error.code === "PGRST202") {
        console.warn("get_token_status_for_deal function not found in database. Please run the updated schema.sql. Falling back to valid status.");
        return { status: "valid", expiresAt: null, error: null };
      }
      console.error("Error fetching token status:", error);
      return { status: "not_found", expiresAt: null, error: error.message };
    }

    if (!data) {
      return { status: "not_found", expiresAt: null, error: null };
    }

    const tokenData = data as { status: TokenStatus; expires_at: string };
    return { 
      status: tokenData.status, 
      expiresAt: tokenData.expires_at,
      error: null 
    };
  } catch (error) {
    console.error("Error fetching token status:", error);
    return { status: "not_found", expiresAt: null, error: "Server error" };
  }
}

// Upload signature to Supabase Storage
export async function uploadSignatureAction(
  dealId: string,
  signatureBase64: string
): Promise<{ signatureUrl: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Convert base64 to buffer
    const base64Data = signatureBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const filename = `${dealId}/${nanoid(10)}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("signatures")
      .upload(filename, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: false,
      });

    if (uploadError) {
      // No base64 fallback - storage must be properly configured
      // Base64 storage in database causes performance issues and is bad practice
      console.error("Error uploading signature:", uploadError);
      return { signatureUrl: null, error: `Failed to upload signature: ${uploadError.message}` };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("signatures")
      .getPublicUrl(filename);

    return { signatureUrl: urlData.publicUrl, error: null };
  } catch (error) {
    console.error("Error in uploadSignatureAction:", error);
    return { signatureUrl: null, error: "Failed to upload signature. Please try again." };
  }
}

// Confirm deal with token validation and server-side sealing
export async function confirmDealAction(data: {
  dealId: string;
  token: string;
  signatureBase64: string;
  recipientEmail?: string;
}): Promise<{ deal: Deal | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    // Check if current user is logged in
    const { data: { user } } = await supabase.auth.getUser();

    // First upload the signature
    const { signatureUrl, error: uploadError } = await uploadSignatureAction(
      data.dealId,
      data.signatureBase64
    );

    if (uploadError || !signatureUrl) {
      // If storage upload fails, return an error instead of using base64 fallback
      // Base64 storage in database would cause performance issues
      console.error("Signature upload failed:", uploadError);
      return { deal: null, error: "Failed to upload signature. Please try again." };
    }

    const finalSignatureUrl = signatureUrl;

    // Calculate seal on the server
    const timestamp = new Date().toISOString();
    
    // We'll get the deal data separately for the seal calculation
    const { data: dealForSeal } = await supabase
      .from("deals")
      .select("terms")
      .eq("id", data.dealId)
      .single();

    const dealSeal = await calculateDealSealServer({
      dealId: data.dealId,
      terms: JSON.stringify(dealForSeal?.terms || []),
      signatureUrl: finalSignatureUrl,
      timestamp,
    });

    // Use the confirm_deal_with_token function
    const { data: confirmedDeal, error: confirmError } = await supabase
      .rpc("confirm_deal_with_token", {
        p_deal_id: data.dealId,
        p_token: data.token,
        p_signature_data: finalSignatureUrl,
        p_deal_seal: dealSeal,
        p_recipient_email: data.recipientEmail || null,
        p_recipient_id: user?.id || null,
      });

    if (confirmError) {
      console.error("Error confirming deal:", confirmError);
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
    console.error("Server error confirming deal:", error);
    return { deal: null, error: "Server error" };
  }
}

// Void a deal
export async function voidDealAction(dealId: string): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
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
      return { error: error.message };
    }

    // Add audit log
    await supabase
      .from("audit_log")
      .insert({
        deal_id: dealId,
        event_type: "deal_voided",
        actor_id: user.id,
        actor_type: "creator",
      });

    return { error: null };
  } catch (error) {
    console.error("Error voiding deal:", error);
    return { error: "Server error" };
  }
}

// Mark deal as viewed
export async function markDealViewedAction(publicId: string): Promise<void> {
  try {
    const supabase = await createServerSupabaseClient();

    // Get the deal first
    const { data: deal } = await supabase
      .rpc("get_deal_by_public_id", { p_public_id: publicId });

    if (!deal) return;

    const dealData = deal as Record<string, unknown>;

    // Update viewed_at if not already set
    if (!dealData.viewed_at) {
      // We need to use a function or service role for this update
      // For now, we'll skip the RLS check by using the deal ID
      await supabase
        .from("deals")
        .update({ viewed_at: new Date().toISOString() })
        .eq("public_id", publicId);
    }

    // Add audit log
    const { data: { user } } = await supabase.auth.getUser();

    await supabase
      .from("audit_log")
      .insert({
        deal_id: dealData.id as string,
        event_type: "deal_viewed",
        actor_id: user?.id || null,
        actor_type: "recipient",
        metadata: {
          isLoggedIn: !!user,
          viewedAt: new Date().toISOString(),
        },
      });
  } catch (error) {
    console.error("Error marking deal viewed:", error);
  }
}

// Ensure user profile exists in database (upsert)
export async function ensureProfileExistsAction(): Promise<{ 
  profile: { id: string; email: string; name: string | null; hasCompletedOnboarding: boolean } | null; 
  error: string | null 
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { profile: null, error: "Not authenticated" };
    }

    // Try to get existing profile
    const { data: existingProfile, error: selectError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (existingProfile && !selectError) {
      // Profile exists - check if onboarding is needed
      const hasValidName = !!existingProfile.name && existingProfile.name.trim() !== "";
      return {
        profile: {
          id: existingProfile.id,
          email: existingProfile.email,
          name: existingProfile.name,
          hasCompletedOnboarding: hasValidName,
        },
        error: null,
      };
    }

    // Profile doesn't exist, create it
    const defaultName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        "";
    
    // Check if we have a meaningful name (not just email prefix)
    const hasValidDefaultName = !!defaultName && defaultName.trim() !== "";
    
    const { data: newProfile, error: insertError } = await supabase
      .from("profiles")
      .insert({
        id: user.id,
        email: user.email || "",
        name: defaultName || null,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Error creating profile:", insertError);
      return { profile: null, error: insertError.message };
    }

    return {
      profile: {
        id: newProfile.id,
        email: newProfile.email,
        name: newProfile.name,
        // Mark onboarding complete if user came with a valid name from OAuth (e.g., Google)
        hasCompletedOnboarding: hasValidDefaultName,
      },
      error: null,
    };
  } catch (error) {
    console.error("Error ensuring profile exists:", error);
    return { profile: null, error: "Server error" };
  }
}

// Update user profile
export async function updateProfileAction(updates: {
  name?: string;
  avatarUrl?: string;
}): Promise<{ error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // First ensure profile exists
    const { error: ensureError } = await ensureProfileExistsAction();
    if (ensureError) {
      return { error: ensureError };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name: updates.name,
        avatar_url: updates.avatarUrl,
      })
      .eq("id", user.id);

    if (error) {
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    console.error("Error updating profile:", error);
    return { error: "Server error" };
  }
}

// Upload avatar to Supabase Storage
export async function uploadAvatarAction(
  avatarBase64: string
): Promise<{ avatarUrl: string | null; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { avatarUrl: null, error: "Not authenticated" };
    }

    // Convert base64 to buffer
    const base64Data = avatarBase64.replace(/^data:image\/\w+;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Generate unique filename
    const filename = `${user.id}/${nanoid(10)}.png`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filename, buffer, {
        contentType: "image/png",
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return { avatarUrl: null, error: uploadError.message };
    }

    // Get public URL
    const { data: urlData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filename);

    // Update profile with new avatar URL
    await supabase
      .from("profiles")
      .update({ avatar_url: urlData.publicUrl })
      .eq("id", user.id);

    return { avatarUrl: urlData.publicUrl, error: null };
  } catch (error) {
    console.error("Error uploading avatar:", error);
    return { avatarUrl: null, error: "Server error" };
  }
}

// Get user's deals from database
export async function getUserDealsAction(): Promise<{ deals: Deal[]; error: string | null }> {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { deals: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("deals")
      .select(`
        *,
        creator:profiles!creator_id(name)
      `)
      .or(`creator_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order("created_at", { ascending: false });

    if (error) {
      return { deals: [], error: error.message };
    }

    const deals = (data || []).map((deal) => ({
      ...transformDeal(deal),
      creatorName: (deal.creator as { name: string } | null)?.name || "Unknown",
    }));

    return { deals, error: null };
  } catch (error) {
    console.error("Error fetching deals:", error);
    return { deals: [], error: "Server error" };
  }
}

// Get audit logs for a deal
export async function getAuditLogsAction(dealId: string): Promise<{
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

    const { data, error } = await supabase
      .from("audit_log")
      .select("*")
      .eq("deal_id", dealId)
      .order("created_at", { ascending: true });

    if (error) {
      return { logs: [], error: error.message };
    }

    const logs = (data || []).map((log) => ({
      id: log.id,
      dealId: log.deal_id,
      eventType: log.event_type,
      actorId: log.actor_id,
      actorType: log.actor_type,
      metadata: log.metadata as Record<string, unknown> | null,
      createdAt: log.created_at,
    }));

    return { logs, error: null };
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    return { logs: [], error: "Server error" };
  }
}
