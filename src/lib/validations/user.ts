import { z } from "zod";

/**
 * Validation schema for updating a user profile
 */
export const updateProfileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be 100 characters or less")
    .trim()
    .optional(),
  avatarUrl: z.string().url("Invalid avatar URL").optional().or(z.literal("")),
  jobTitle: z.string().max(100, "Job title must be 100 characters or less").trim().optional(),
  location: z.string().max(100, "Location must be 100 characters or less").trim().optional(),
  currency: z.enum(["USD", "EUR", "GBP", "CAD", "AUD", "CHF", "JPY", "CNY", "CZK"]).optional(),
  signatureUrl: z.string().url("Invalid signature URL").optional().or(z.literal("")),
});

/**
 * Validation schema for email (login)
 */
export const emailSchema = z.object({
  email: z.string().email("Please enter a valid email address").trim(),
});

/**
 * Validation schema for OTP verification
 */
export const verifyOtpSchema = z.object({
  email: z.string().email("Invalid email address"),
  code: z.string().length(6, "Code must be 6 digits").regex(/^\d+$/, "Code must be numeric"),
});

/**
 * Validation schema for appearance preferences
 */
export const appearancePreferencesSchema = z.object({
  compactMode: z.boolean().optional(),
  fontScale: z
    .number()
    .min(0.8, "Font scale minimum is 0.8")
    .max(1.2, "Font scale maximum is 1.2")
    .optional(),
  reducedMotion: z.boolean().optional(),
});

/**
 * Validation schema for Do Not Disturb settings
 */
export const doNotDisturbSchema = z.object({
  enabled: z.boolean(),
  durationMinutes: z.number().min(0).max(1440).optional(), // max 24 hours
});

// Type exports
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
export type EmailInput = z.infer<typeof emailSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
export type AppearancePreferencesInput = z.infer<typeof appearancePreferencesSchema>;
export type DoNotDisturbInput = z.infer<typeof doNotDisturbSchema>;
