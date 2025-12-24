import { z } from "zod";
import { LIMITS } from "@/lib/constants";

/**
 * Validation schema for deal terms
 */
export const dealTermSchema = z.object({
  id: z.string().optional(),
  label: z
    .string()
    .min(1, "Term label is required")
    .max(
      LIMITS.MAX_TERM_LABEL_LENGTH,
      `Term label must be ${LIMITS.MAX_TERM_LABEL_LENGTH} characters or less`
    )
    .trim(),
  value: z
    .string()
    .min(1, "Term value is required")
    .max(
      LIMITS.MAX_TERM_VALUE_LENGTH,
      `Term value must be ${LIMITS.MAX_TERM_VALUE_LENGTH} characters or less`
    ),
  type: z.enum(["text", "number", "date", "currency"]),
});

/**
 * Validation schema for creating a new deal
 */
export const createDealSchema = z.object({
  title: z
    .string()
    .min(1, "Deal title is required")
    .max(LIMITS.MAX_TITLE_LENGTH, `Title must be ${LIMITS.MAX_TITLE_LENGTH} characters or less`)
    .trim(),
  description: z
    .string()
    .max(
      LIMITS.MAX_DESCRIPTION_LENGTH,
      `Description must be ${LIMITS.MAX_DESCRIPTION_LENGTH} characters or less`
    )
    .optional()
    .default(""),
  recipientName: z
    .string()
    .min(1, "Recipient name is required")
    .max(100, "Recipient name must be 100 characters or less")
    .trim(),
  recipientEmail: z.string().email("Invalid email address").optional().or(z.literal("")),
  terms: z.array(dealTermSchema).max(LIMITS.MAX_TERMS, `Maximum ${LIMITS.MAX_TERMS} terms allowed`),
  templateId: z.string().optional(),
});

/**
 * Validation schema for confirming a deal (recipient signing)
 */
export const confirmDealSchema = z.object({
  dealId: z.uuid("Invalid deal ID"),
  publicId: z.string().min(1, "Public ID is required").max(20),
  token: z.string().min(32, "Invalid access token"),
  signatureBase64: z
    .string()
    .regex(/^data:image\//, "Invalid signature format")
    .min(100, "Signature is too small"),
  recipientEmail: z.string().email("Invalid email").optional().or(z.literal("")),
});

/**
 * Validation schema for voiding a deal
 */
export const voidDealSchema = z.object({
  dealId: z.uuid("Invalid deal ID"),
});

/**
 * Validation schema for duplicating a deal
 */
export const duplicateDealSchema = z.object({
  dealId: z.uuid("Invalid deal ID"),
});

/**
 * Validation schema for nudging a recipient
 */
export const nudgeDealSchema = z.object({
  dealId: z.uuid("Invalid deal ID"),
});

// Type exports for use in server actions
export type CreateDealInput = z.infer<typeof createDealSchema>;
export type ConfirmDealInput = z.infer<typeof confirmDealSchema>;
export type VoidDealInput = z.infer<typeof voidDealSchema>;
export type DuplicateDealInput = z.infer<typeof duplicateDealSchema>;
export type NudgeDealInput = z.infer<typeof nudgeDealSchema>;
