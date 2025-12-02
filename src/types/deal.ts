export type DealStatus = "pending" | "sealing" | "confirmed" | "voided";

export interface Deal {
  id: string;
  publicId: string;
  creatorId: string;
  creatorName: string;
  recipientName?: string;
  recipientEmail?: string;
  title: string;
  description: string;
  terms: DealTerm[];
  status: DealStatus;
  createdAt: string;
  confirmedAt?: string;
  voidedAt?: string;
  signatureUrl?: string;
  dealSeal?: string;
  accessToken?: string;
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
  type: "text" | "number" | "date" | "currency" | "textarea";
  placeholder?: string;
  required: boolean;
  defaultValue?: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
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
