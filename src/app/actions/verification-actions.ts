"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import crypto from "crypto";
import { Resend } from "resend";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Initialize Resend client
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Proofo <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

// Initialize Twilio client
const twilioAccountSid = process.env.TWILIO_ACCOUNT_SID;
const twilioAuthToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;
let twilioClient: ReturnType<typeof import('twilio')> | null = null;

async function getTwilioClient() {
  if (!twilioAccountSid || !twilioAuthToken) {
    return null;
  }
  if (!twilioClient) {
    const twilio = (await import('twilio')).default;
    twilioClient = twilio(twilioAccountSid, twilioAuthToken);
  }
  return twilioClient;
}

// OTP configuration
const OTP_LENGTH = 6;
const OTP_EXPIRY_MINUTES = 10;
const MAX_OTP_ATTEMPTS = 5;

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
            // Cookies can fail during static generation
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Cookies can fail during static generation
          }
        },
      },
    }
  );
}

/**
 * Generate a random 6-digit OTP code
 */
function generateOTP(): string {
  // Generate cryptographically secure random digits
  const buffer = crypto.randomBytes(4);
  const num = buffer.readUInt32BE(0) % 1000000;
  return num.toString().padStart(OTP_LENGTH, "0");
}

/**
 * Hash an OTP code for secure storage
 */
function hashOTP(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/**
 * Send email verification OTP for a deal
 */
export async function sendEmailVerificationOTP(params: {
  dealId: string;
  email: string;
  publicId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { dealId, email, publicId } = params;

    // Basic validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return { success: false, error: "Invalid email address" };
    }

    // Rate limit by IP
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = await checkRateLimit("general", `otp:${ip}`);
    if (!rateLimitResult.success) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    const supabase = await createServerSupabaseClient();

    // Verify the deal exists and requires email verification
    const { data: deal, error: dealError } = await supabase.rpc("get_deal_by_public_id", {
      p_public_id: publicId,
    });

    if (dealError || !deal) {
      return { success: false, error: "Deal not found" };
    }

    const dealData = deal as { id: string; trust_level: string; status: string };

    // Check deal is in valid state
    if (dealData.status !== "pending") {
      return { success: false, error: "This deal is no longer available for signing" };
    }

    // Check if email verification is required
    const trustLevel = dealData.trust_level || "basic";
    if (trustLevel === "basic") {
      return { success: false, error: "This deal does not require email verification" };
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // Store OTP in database
    const { error: createError } = await supabase.rpc("create_verification_code", {
      p_deal_id: dealId,
      p_verification_type: "email",
      p_target: email.toLowerCase().trim(),
      p_code_hash: otpHash,
      p_expires_minutes: OTP_EXPIRY_MINUTES,
    });

    if (createError) {
      logger.error("Error creating verification code", createError);
      return { success: false, error: "Failed to create verification code" };
    }

    // Send email with OTP
    if (!resend) {
      // Dev mode: log OTP to console
      logger.info(`[DEV MODE] Email OTP for ${email}: ${otp}`);
      return { success: true, error: null };
    }

    const { error: emailError } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [email],
      subject: `Your Proofo verification code: ${otp}`,
      html: generateOTPEmailHTML(otp),
      text: generateOTPEmailText(otp),
    });

    if (emailError) {
      logger.error("Error sending OTP email", emailError);
      return { success: false, error: "Failed to send verification email" };
    }

    // Log audit event
    await supabase.rpc("log_audit_event", {
      p_deal_id: dealId,
      p_event_type: "email_otp_sent",
      p_actor_type: "system",
      p_metadata: { email: email.toLowerCase().trim() },
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error("Error in sendEmailVerificationOTP", error);
    return { success: false, error: "Server error" };
  }
}

/**
 * Verify email OTP for a deal
 */
export async function verifyEmailOTP(params: {
  dealId: string;
  email: string;
  otp: string;
  publicId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { dealId, email, otp, publicId } = params;

    // Basic validation
    if (!otp || otp.length !== OTP_LENGTH) {
      return { success: false, error: "Invalid verification code" };
    }

    const supabase = await createServerSupabaseClient();

    // Verify the deal exists
    const { data: deal, error: dealError } = await supabase.rpc("get_deal_by_public_id", {
      p_public_id: publicId,
    });

    if (dealError || !deal) {
      return { success: false, error: "Deal not found" };
    }

    // Hash the OTP for comparison
    const otpHash = hashOTP(otp);

    // Verify the code using RPC function
    const { data: isValid, error: verifyError } = await supabase.rpc("verify_code", {
      p_deal_id: dealId,
      p_verification_type: "email",
      p_target: email.toLowerCase().trim(),
      p_code_hash: otpHash,
    });

    if (verifyError) {
      logger.error("Error verifying code", verifyError);
      return { success: false, error: "Failed to verify code" };
    }

    if (!isValid) {
      return { success: false, error: "Invalid or expired verification code" };
    }

    // Log audit event
    await supabase.rpc("log_audit_event", {
      p_deal_id: dealId,
      p_event_type: "email_verified",
      p_actor_type: "recipient",
      p_metadata: { email: email.toLowerCase().trim() },
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error("Error in verifyEmailOTP", error);
    return { success: false, error: "Server error" };
  }
}

/**
 * Send phone verification OTP for a deal via SMS
 */
export async function sendPhoneVerificationOTP(params: {
  dealId: string;
  phone: string;
  publicId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { dealId, phone, publicId } = params;

    // Basic phone validation (E.164 format)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phone || !phoneRegex.test(phone)) {
      return { success: false, error: "Invalid phone number. Please use international format (e.g., +1234567890)" };
    }

    // Rate limit by IP
    const headersList = await headers();
    const ip = headersList.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const rateLimitResult = await checkRateLimit("general", `otp:phone:${ip}`);
    if (!rateLimitResult.success) {
      return { success: false, error: "Too many requests. Please try again later." };
    }

    const supabase = await createServerSupabaseClient();

    // Verify the deal exists and requires phone verification
    const { data: deal, error: dealError } = await supabase.rpc("get_deal_by_public_id", {
      p_public_id: publicId,
    });

    if (dealError || !deal) {
      return { success: false, error: "Deal not found" };
    }

    const dealData = deal as { id: string; trust_level: string; status: string };

    // Check deal is in valid state
    if (dealData.status !== "pending") {
      return { success: false, error: "This deal is no longer available for signing" };
    }

    // Check if phone verification is required (strong or maximum trust level)
    const trustLevel = dealData.trust_level || "basic";
    if (trustLevel !== "strong" && trustLevel !== "maximum") {
      return { success: false, error: "This deal does not require phone verification" };
    }

    // Generate OTP
    const otp = generateOTP();
    const otpHash = hashOTP(otp);

    // Store OTP in database
    const { error: createError } = await supabase.rpc("create_verification_code", {
      p_deal_id: dealId,
      p_verification_type: "phone",
      p_target: phone,
      p_code_hash: otpHash,
      p_expires_minutes: OTP_EXPIRY_MINUTES,
    });

    if (createError) {
      logger.error("Error creating phone verification code", createError);
      return { success: false, error: "Failed to create verification code" };
    }

    // Send SMS with OTP
    const twilio = await getTwilioClient();
    if (!twilio) {
      // Dev mode: log OTP to console
      logger.info(`[DEV MODE] Phone OTP for ${phone}: ${otp}`);
      return { success: true, error: null };
    }

    try {
      await twilio.messages.create({
        body: `Your Proofo verification code is: ${otp}. Valid for ${OTP_EXPIRY_MINUTES} minutes.`,
        from: twilioPhoneNumber,
        to: phone,
      });
    } catch (smsError) {
      logger.error("Error sending SMS", smsError);
      return { success: false, error: "Failed to send verification SMS. Please check your phone number." };
    }

    // Log audit event
    await supabase.rpc("log_audit_event", {
      p_deal_id: dealId,
      p_event_type: "phone_otp_sent",
      p_actor_type: "system",
      p_metadata: { phone: phone.slice(0, 4) + "****" + phone.slice(-2) }, // Mask phone for privacy
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error("Error in sendPhoneVerificationOTP", error);
    return { success: false, error: "Server error" };
  }
}

/**
 * Verify phone OTP for a deal
 */
export async function verifyPhoneOTP(params: {
  dealId: string;
  phone: string;
  otp: string;
  publicId: string;
}): Promise<{ success: boolean; error: string | null }> {
  try {
    const { dealId, phone, otp, publicId } = params;

    // Basic validation
    if (!otp || otp.length !== OTP_LENGTH) {
      return { success: false, error: "Invalid verification code" };
    }

    const supabase = await createServerSupabaseClient();

    // Verify the deal exists
    const { data: deal, error: dealError } = await supabase.rpc("get_deal_by_public_id", {
      p_public_id: publicId,
    });

    if (dealError || !deal) {
      return { success: false, error: "Deal not found" };
    }

    // Hash the OTP for comparison
    const otpHash = hashOTP(otp);

    // Verify the code using RPC function
    const { data: isValid, error: verifyError } = await supabase.rpc("verify_code", {
      p_deal_id: dealId,
      p_verification_type: "phone",
      p_target: phone,
      p_code_hash: otpHash,
    });

    if (verifyError) {
      logger.error("Error verifying phone code", verifyError);
      return { success: false, error: "Failed to verify code" };
    }

    if (!isValid) {
      return { success: false, error: "Invalid or expired verification code" };
    }

    // Log audit event
    await supabase.rpc("log_audit_event", {
      p_deal_id: dealId,
      p_event_type: "phone_verified",
      p_actor_type: "recipient",
      p_metadata: { phone: phone.slice(0, 4) + "****" + phone.slice(-2) }, // Mask phone for privacy
    });

    return { success: true, error: null };
  } catch (error) {
    logger.error("Error in verifyPhoneOTP", error);
    return { success: false, error: "Server error" };
  }
}

/**
 * Get verification status for a deal
 */
export async function getVerificationStatus(params: {
  dealId: string;
  publicId: string;
}): Promise<{
  trustLevel: string;
  emailRequired: boolean;
  emailVerified: boolean;
  phoneRequired: boolean;
  phoneVerified: boolean;
  canSign: boolean;
  error: string | null;
}> {
  try {
    const { dealId, publicId } = params;

    const supabase = await createServerSupabaseClient();

    // Use RPC to get verification status
    const { data, error } = await supabase.rpc("get_deal_verification_status", {
      p_deal_id: dealId,
    });

    if (error) {
      logger.error("Error getting verification status", error);
      return {
        trustLevel: "basic",
        emailRequired: false,
        emailVerified: false,
        phoneRequired: false,
        phoneVerified: false,
        canSign: true,
        error: "Failed to get verification status",
      };
    }

    const status = data as {
      trust_level: string;
      email_required: boolean;
      email_verified: boolean;
      phone_required: boolean;
      phone_verified: boolean;
      can_sign: boolean;
    };

    return {
      trustLevel: status.trust_level,
      emailRequired: status.email_required,
      emailVerified: status.email_verified,
      phoneRequired: status.phone_required,
      phoneVerified: status.phone_verified,
      canSign: status.can_sign,
      error: null,
    };
  } catch (error) {
    logger.error("Error in getVerificationStatus", error);
    return {
      trustLevel: "basic",
      emailRequired: false,
      emailVerified: false,
      phoneRequired: false,
      phoneVerified: false,
      canSign: true,
      error: "Server error",
    };
  }
}

/**
 * Check if recipient is a Proofo user with verified email
 * If so, they can skip email verification
 */
export async function checkProofoUserVerification(params: {
  dealId: string;
  email: string;
}): Promise<{
  isProofoUser: boolean;
  emailVerified: boolean;
  phoneVerified: boolean;
  userId?: string;
  error: string | null;
}> {
  try {
    const { dealId, email } = params;

    const supabase = await createServerSupabaseClient();

    // Check if user is authenticated
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        isProofoUser: false,
        emailVerified: false,
        phoneVerified: false,
        error: null,
      };
    }

    // Check if authenticated user's email matches
    if (user.email?.toLowerCase() !== email.toLowerCase()) {
      return {
        isProofoUser: false,
        emailVerified: false,
        phoneVerified: false,
        error: null,
      };
    }

    // Get profile to check phone verification
    const { data: profile } = await supabase
      .from("profiles")
      .select("id, phone_verified_at")
      .eq("id", user.id)
      .single();

    // Proofo users have verified email through auth
    // Phone is verified if phone_verified_at is set
    const phoneVerified = !!(profile?.phone_verified_at);

    // Auto-record email verification for Proofo users
    if (profile) {
      // Create verification record for this deal
      await supabase.from("deal_verifications").upsert({
        deal_id: dealId,
        verification_type: "email",
        verified_value: email.toLowerCase(),
        metadata: { verified_via: "proofo_account" },
      }, {
        onConflict: "deal_id,verification_type",
      });

      // If phone is verified on profile, also record that
      if (phoneVerified) {
        await supabase.from("deal_verifications").upsert({
          deal_id: dealId,
          verification_type: "phone",
          verified_value: "proofo_verified",
          metadata: { verified_via: "proofo_account" },
        }, {
          onConflict: "deal_id,verification_type",
        });
      }
    }

    return {
      isProofoUser: true,
      emailVerified: true, // Auth means email is verified
      phoneVerified,
      userId: user.id,
      error: null,
    };
  } catch (error) {
    logger.error("Error in checkProofoUserVerification", error);
    return {
      isProofoUser: false,
      emailVerified: false,
      phoneVerified: false,
      error: "Server error",
    };
  }
}

// ============================================
// Email Templates
// ============================================

function generateOTPEmailHTML(otp: string): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code - Proofo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 24px 32px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #ffffff;">Proofo</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 32px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">

              <h2 style="margin: 0 0 8px 0; font-size: 20px; font-weight: 700; color: #1f2937;">
                Verify your email
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 15px; color: #6b7280; line-height: 1.5;">
                Enter this code to verify your email address and sign the agreement.
              </p>

              <!-- OTP Code -->
              <div style="background-color: #f3f4f6; border-radius: 8px; padding: 24px; text-align: center; margin-bottom: 24px;">
                <span style="font-size: 36px; font-weight: 700; letter-spacing: 8px; color: #1f2937; font-family: monospace;">
                  ${otp}
                </span>
              </div>

              <p style="margin: 0; font-size: 13px; color: #9ca3af; text-align: center;">
                This code expires in ${OTP_EXPIRY_MINUTES} minutes.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 32px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

function generateOTPEmailText(otp: string): string {
  return `
VERIFY YOUR EMAIL

Your Proofo verification code is: ${otp}

Enter this code to verify your email address and sign the agreement.

This code expires in ${OTP_EXPIRY_MINUTES} minutes.

If you didn't request this code, you can safely ignore this email.

---
Proofo - Evidence that holds up
  `.trim();
}
