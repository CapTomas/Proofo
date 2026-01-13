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
const _APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
const _MAX_OTP_ATTEMPTS = 5;

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
    const { dealId, publicId: _publicId } = params;

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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verification Code - Proofo</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
      background-color: #0a0a0a;
      font-family: -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
    }
    table { border-collapse: collapse; mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #0a0a0a;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="#0a0a0a">
    <tr>
      <td align="center" style="padding: 60px 15px;">
        <!-- Header / Logo Section -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; margin-bottom: 32px;">
          <tr>
            <td align="center">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td valign="middle" style="padding-right: 12px;">
                    <svg width="28" height="28" viewBox="0 0 5765 5765" xmlns="http://www.w3.org/2000/svg" style="display: block;">
                      <g transform="matrix(1 0 0 -1 0 5765)">
                        <path fill="#ededed" d="M664.2,4920C664.2,4125,664.2,2560,664.2,2560C664.2,2560,664.2,910,664.2,200C664.2,149.2,688.3,95.9,724.2,60C760.1,24.1,813.4,0,864.2,0C1179.2,0,1304.2,0,1534.2,0C1764.2,0,1787.7,-7.8,1914.2,0C2016,6.2,2118.3,25.1,2214.2,60C2370.6,116.9,2516.5,212.3,2634.2,330C2772.3,468.1,2780.5,466.1,2884.2,570C2956.1,642.1,3082.4,776.8,3174.2,870C3231.9,928.6,3259.1,953.2,3334.2,1030C3349.2,1045.4,3398.2,1093.7,3414.2,1110C3426.9,1123,3490.8,1186.3,3504.2,1200C3582.6,1280.3,3663,1370.5,3765.6,1476C3823.9,1535.9,4086.5,1770.4,4154.2,1840C4469.2,2115,4664.2,2315,4772,2540C4819.6,2639.3,4872.7,2739.5,4891,2848C4918.4,3010,4918.4,3224.5,4918.4,3413C4918.4,3635,4911.4,3859.1,4862,4075C4839,4175.4,4796,4272.5,4740,4359C4613.9,4553.6,4445.2,4720.5,4268,4870C4122.8,4992.6,3934.8,5086.8,3745,5097C3319.2,5120,3718,5117,2339,5120C2339,5120,1334.2,5120,864.2,5120C812,5120,760.3,5097.7,724.2,5060C691.2,5025.5,664.2,4967.7,664.2,4920ZM3644.2,4420C3886,4402.1,4084.6,4156.8,4189,3938C4265.1,3778.6,4260,3718,4260,3413C4260,3170,4248,3038,4220,2965C4114,2687,3931.2,2520,3644.2,2410C3557.2,2376,3594.2,2381,3044.2,2380C3044.2,2380,2674.2,2380,2534.2,2380C2483.4,2380,2430,2356,2394.2,2320C2358.5,2284.1,2335,2230.7,2335,2180C2335,2015,2334.3,1873.3,2335,1670C2335.6,1483,2337.6,1293.9,2304.2,1110C2291.1,1038.1,2259.4,967.4,2214.2,910C2162.9,845,2099.9,783.6,2024.2,750C1842.7,669.6,1714.2,670,1534.2,670C1483.4,670,1430.1,694.1,1394.2,730C1358.3,765.9,1334.2,819.2,1334.2,870C1334.2,1110,1334.2,556,1334.2,2560C1334.2,4308,1334.2,3980,1334.2,4250C1334.2,4302.7,1346.9,4362.7,1384.2,4400C1421.4,4437.3,1481.5,4450,1534.2,4450C1809.2,4450,2339,4450,2339,4450C2339,4450,3239.2,4450,3644.2,4420Z" />
                      </g>
                    </svg>
                  </td>
                  <td valign="middle">
                    <span style="color: #ededed; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Proofo</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Main Card: Bento Style with Subtle Unified Border -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; background-color: #121212; border-radius: 20px; border-collapse: separate; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Heading -->
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; color: #ededed; text-align: center;">
                Verify your email
              </h1>

              <!-- Subtext -->
              <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #888888; text-align: center;">
                Enter the code below to verify your email address and sign the agreement. This code expires in ${OTP_EXPIRY_MINUTES} minutes.
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <div style="background-color: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 12px; padding: 24px; text-align: center;">
                      <span style="font-family: 'JetBrains Mono', 'Courier New', monospace; font-size: 36px; font-weight: 700; letter-spacing: 0.4em; color: #10b981;">
                        ${otp}
                      </span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center">
                    <p style="margin: 32px 0 0 0; font-size: 13px; color: #666666; text-align: center;">
                      If you didn't request this code, you can safely ignore this email.
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer (Trust indicator) -->
          <tr>
            <td style="background-color: #1a1a1a; padding: 16px; border-top: 1px solid #262626; text-align: center;">
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto;">
                <tr>
                  <td valign="middle" style="padding-right: 10px;">
                    <!-- Visible Emerald Dot -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%;">
                      <tr>
                        <td style="width: 8px; height: 8px; background-color: #10b981; border-radius: 4px; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle">
                    <span style="font-size: 13px; color: #777777; font-weight: 500; display: block; line-height: 1;">
                      Secure, encrypted verification
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Exterior Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; margin-top: 32px;">
          <tr>
            <td align="center" style="color: #444444; font-size: 12px; line-height: 1.5;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Proofo Inc. Evidence that holds up.</p>
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
© ${new Date().getFullYear()} Proofo Inc.
  `.trim();
}
