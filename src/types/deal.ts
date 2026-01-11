export type DealStatus = "pending" | "sealing" | "confirmed" | "voided";
export type TrustLevel = "basic" | "verified" | "strong" | "maximum";

export interface Deal {
  id: string;
  publicId: string;
  creatorId: string;
  creatorName: string;
  recipientName?: string;
  recipientEmail?: string;
  recipientId?: string;
  title: string;
  description: string;
  templateId?: string;
  terms: DealTerm[];
  status: DealStatus;
  trustLevel?: TrustLevel;
  createdAt: string;
  confirmedAt?: string;
  voidedAt?: string;
  viewedAt?: string;
  signatureUrl?: string;
  dealSeal?: string;
  accessToken?: string;
  lastNudgedAt?: string;
  verifications?: {
    verification_type: "email" | "phone";
    verified_value?: string;
    verified_at: string;
  }[];
}

export interface DealTerm {
  id: string;
  label: string;
  value: string;
  type: "text" | "number" | "date" | "currency";
}

export interface DealTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  fields: TemplateField[];
}

export interface TemplateField {
  id: string;
  label: string;
  type: "text" | "number" | "date" | "currency" | "textarea" | "checkbox";
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
}

export type TemplateTheme = "financial" | "services" | "personal" | "general";

export interface UserTemplate extends DealTemplate {
  userId: string;
  isPublic: boolean;
  theme: TemplateTheme;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isPro?: boolean;
  signatureUrl?: string;
  createdAt: string;
}

export interface CreateDealInput {
  templateId: string;
  title: string;
  recipientName: string;
  terms: Omit<DealTerm, "id">[];
}

export interface ConfirmDealInput {
  dealId: string;
  accessToken: string;
  signatureData: string;
  recipientEmail?: string;
}

export type AuditEventType =
  | "deal_created"
  | "deal_viewed"
  | "deal_signed"
  | "deal_confirmed"
  | "deal_voided"
  | "email_sent"
  | "pdf_generated"
  | "pdf_downloaded"
  | "deal_verified"
  | "deal_link_shared"
  | "token_validated"
  | "email_otp_sent"
  | "email_verified"
  | "phone_otp_sent"
  | "phone_verified";

export interface AuditLogEntry {
  id: string;
  dealId: string;
  eventType: AuditEventType;
  actorId: string | null;
  actorType: "creator" | "recipient" | "system";
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}
