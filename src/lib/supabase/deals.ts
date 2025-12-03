import { supabase, isSupabaseConfigured } from "./client";
import { Deal, DealTerm, AuditLogEntry, AuditEventType } from "@/types";
import { generatePublicId, generateAccessToken, getTokenExpiry } from "../crypto";

// Transform database deal to app Deal type
function transformDeal(dbDeal: Record<string, unknown>): Deal {
  return {
    id: dbDeal.id as string,
    publicId: dbDeal.public_id as string,
    creatorId: dbDeal.creator_id as string,
    creatorName: dbDeal.creator_name as string || "Unknown",
    recipientId: dbDeal.recipient_id as string | undefined,
    recipientName: dbDeal.recipient_name as string | undefined,
    recipientEmail: dbDeal.recipient_email as string | undefined,
    title: dbDeal.title as string,
    description: dbDeal.description as string || "",
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

// Get all deals for the current user
export async function getUserDeals(): Promise<Deal[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("deals")
    .select(`
      *,
      creator:profiles!creator_id(name)
    `)
    .order("created_at", { ascending: false });

  if (error || !data) {
    console.error("Error fetching deals:", error);
    return [];
  }

  return (data as Record<string, unknown>[]).map((deal) => ({
    ...transformDeal(deal),
    creatorName: (deal.creator as { name: string } | null)?.name || "Unknown",
  }));
}

// Get a deal by public ID (for recipient view)
export async function getDealByPublicId(publicId: string): Promise<Deal | null> {
  if (!isSupabaseConfigured()) {
    return null;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc("get_deal_by_public_id", { p_public_id: publicId });

  if (error || !data) {
    console.error("Error fetching deal:", error);
    return null;
  }

  // Get creator name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: creator } = await (supabase as any)
    .from("profiles")
    .select("name")
    .eq("id", (data as Record<string, unknown>).creator_id)
    .single();

  return {
    ...transformDeal(data as Record<string, unknown>),
    creatorName: creator?.name || "Unknown",
  };
}

// Create a new deal
export async function createDeal(data: {
  title: string;
  description?: string;
  templateId?: string;
  recipientName: string;
  terms: Array<{ label: string; value: string; type: string }>;
}): Promise<{ deal: Deal | null; shareUrl: string | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { deal: null, shareUrl: null, error: new Error("Supabase is not configured") };
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { deal: null, shareUrl: null, error: new Error("Not authenticated") };
  }

  const publicId = generatePublicId();
  const accessToken = generateAccessToken();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: deal, error: dealError } = await (supabase as any)
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
    return { deal: null, shareUrl: null, error: new Error(dealError?.message || "Failed to create deal") };
  }

  // Create access token
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: tokenError } = await (supabase as any)
    .from("access_tokens")
    .insert({
      deal_id: deal.id,
      token: accessToken,
      expires_at: getTokenExpiry(7).toISOString(), // 7 days expiry
    });

  if (tokenError) {
    console.error("Error creating access token:", tokenError);
  }

  // Add audit log
  await addAuditLog({
    dealId: deal.id,
    eventType: "deal_created",
    actorId: user.id,
    actorType: "creator",
    metadata: {
      templateId: data.templateId,
      recipientName: data.recipientName,
    },
  });

  // Get creator name for the response
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: creator } = await (supabase as any)
    .from("profiles")
    .select("name")
    .eq("id", user.id)
    .single();

  const shareUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}/d/${publicId}`;

  return {
    deal: {
      ...transformDeal(deal as Record<string, unknown>),
      creatorName: creator?.name || "Unknown",
      accessToken,
    },
    shareUrl,
    error: null,
  };
}

// Confirm a deal (recipient signing)
export async function confirmDeal(
  dealId: string,
  token: string,
  signatureData: string,
  dealSeal: string,
  recipientEmail?: string
): Promise<{ deal: Deal | null; error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { deal: null, error: new Error("Supabase is not configured") };
  }

  // Check if user is logged in
  const { data: { user } } = await supabase.auth.getUser();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .rpc("confirm_deal_with_token", {
      p_deal_id: dealId,
      p_token: token,
      p_signature_data: signatureData,
      p_deal_seal: dealSeal,
      p_recipient_email: recipientEmail,
      p_recipient_id: user?.id,
    });

  if (error) {
    return { deal: null, error: new Error(error.message) };
  }

  // Get creator name
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: creator } = await (supabase as any)
    .from("profiles")
    .select("name")
    .eq("id", (data as Record<string, unknown>).creator_id)
    .single();

  return {
    deal: {
      ...transformDeal(data as Record<string, unknown>),
      creatorName: creator?.name || "Unknown",
    },
    error: null,
  };
}

// Void a deal
export async function voidDeal(dealId: string): Promise<{ error: Error | null }> {
  if (!isSupabaseConfigured()) {
    return { error: new Error("Supabase is not configured") };
  }

  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: new Error("Not authenticated") };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from("deals")
    .update({
      status: "voided",
      voided_at: new Date().toISOString(),
    })
    .eq("id", dealId)
    .eq("creator_id", user.id);

  if (error) {
    return { error: new Error(error.message) };
  }

  // Add audit log
  await addAuditLog({
    dealId,
    eventType: "deal_voided",
    actorId: user.id,
    actorType: "creator",
  });

  return { error: null };
}

// Mark deal as viewed
export async function markDealViewed(publicId: string): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  // Get the deal first
  const deal = await getDealByPublicId(publicId);
  if (!deal) return;

  // Update viewed_at if not already set
  if (!deal.viewedAt) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any)
      .from("deals")
      .update({ viewed_at: new Date().toISOString() })
      .eq("public_id", publicId);
  }

  // Add audit log
  const { data: { user } } = await supabase.auth.getUser();
  
  await addAuditLog({
    dealId: deal.id,
    eventType: "deal_viewed",
    actorId: user?.id || null,
    actorType: "recipient",
    metadata: {
      isLoggedIn: !!user,
    },
  });
}

// Add audit log entry
export async function addAuditLog(entry: {
  dealId: string;
  eventType: AuditEventType;
  actorId?: string | null;
  actorType: "creator" | "recipient" | "system";
  metadata?: Record<string, unknown>;
}): Promise<void> {
  if (!isSupabaseConfigured()) {
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any)
    .from("audit_log")
    .insert({
      deal_id: entry.dealId,
      event_type: entry.eventType,
      actor_id: entry.actorId,
      actor_type: entry.actorType,
      metadata: entry.metadata,
    });
}

// Get audit logs for a deal
export async function getAuditLogs(dealId: string): Promise<AuditLogEntry[]> {
  if (!isSupabaseConfigured()) {
    return [];
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("audit_log")
    .select("*")
    .eq("deal_id", dealId)
    .order("created_at", { ascending: false });

  if (error || !data) {
    return [];
  }

  return (data as Record<string, unknown>[]).map((log) => ({
    id: log.id as string,
    dealId: log.deal_id as string,
    eventType: log.event_type as AuditEventType,
    actorId: log.actor_id as string | null,
    actorType: log.actor_type as "creator" | "recipient" | "system",
    ipAddress: log.ip_address as string | undefined,
    userAgent: log.user_agent as string | undefined,
    metadata: log.metadata as Record<string, unknown> | undefined,
    createdAt: log.created_at as string,
  }));
}

// Validate access token
export async function validateAccessToken(dealId: string, token: string): Promise<boolean> {
  if (!isSupabaseConfigured()) {
    return false;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data } = await (supabase as any)
    .rpc("validate_access_token", {
      p_deal_id: dealId,
      p_token: token,
    });

  return data === true;
}
