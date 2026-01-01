"use server";

import { Resend } from "resend";
import { Deal } from "@/types";
import { formatDateTime } from "./crypto";
import { logger } from "./logger";

// Initialize Resend client
// Note: RESEND_API_KEY should be set in environment variables
const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

// Email configuration
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "Proofo <onboarding@resend.dev>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

/**
 * Email template for deal receipt
 */
function generateReceiptEmailHTML(deal: Deal): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sealed Agreement - Proofo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 40px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Proofo</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.8);">Evidence that holds up</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">

              <!-- Success Badge -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; background-color: #ecfdf5; border: 1px solid #10b981; border-radius: 50px; padding: 8px 20px;">
                      <span style="color: #059669; font-size: 14px; font-weight: 600;">✓ Agreement Sealed</span>
                    </div>
                  </td>
                </tr>
              </table>

              <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1f2937;">
                Your agreement has been sealed!
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                The agreement "${escapeHtml(deal.title)}" with ${escapeHtml(deal.creatorName)} has been cryptographically sealed and is now enforceable.
              </p>

              <!-- Deal Summary Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 16px; font-weight: 600; color: #374151;">Agreement Details</h3>

                    <table role="presentation" style="width: 100%; border-collapse: collapse;">
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Title</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${escapeHtml(deal.title)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Creator</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${escapeHtml(deal.creatorName)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb;">
                          <span style="color: #6b7280; font-size: 14px;">Deal ID</span>
                        </td>
                        <td style="padding: 8px 0; border-bottom: 1px solid #e5e7eb; text-align: right;">
                          <code style="color: #4f46e5; font-size: 12px; font-family: monospace; background-color: #eef2ff; padding: 2px 6px; border-radius: 4px;">${escapeHtml(deal.publicId)}</code>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 8px 0;">
                          <span style="color: #6b7280; font-size: 14px;">Sealed At</span>
                        </td>
                        <td style="padding: 8px 0; text-align: right;">
                          <span style="color: #1f2937; font-size: 14px; font-weight: 500;">${deal.confirmedAt ? formatDateTime(deal.confirmedAt) : "N/A"}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Terms Section -->
              ${
                deal.terms.length > 0
                  ? `
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td>
                    <h3 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600; color: #374151;">Terms</h3>
                    ${deal.terms
                      .map(
                        (term, index) => `
                    <div style="padding: 8px 0; ${index < deal.terms.length - 1 ? "border-bottom: 1px solid #e5e7eb;" : ""}">
                      <span style="color: #6b7280; font-size: 13px;">${escapeHtml(term.label)}:</span>
                      <span style="color: #1f2937; font-size: 13px; font-weight: 500; margin-left: 8px;">${escapeHtml(term.value)}</span>
                    </div>
                    `
                      )
                      .join("")}
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- SHA-256 Hash -->
              ${
                deal.dealSeal
                  ? `
              <table role="presentation" style="width: 100%; border-collapse: collapse; margin-bottom: 24px;">
                <tr>
                  <td style="background-color: #f3f4f6; border-radius: 6px; padding: 12px;">
                    <p style="margin: 0 0 4px 0; font-size: 12px; font-weight: 600; color: #374151;">🔒 Cryptographic Seal (SHA-256)</p>
                    <code style="font-size: 10px; color: #6b7280; font-family: monospace; word-break: break-all;">${deal.dealSeal}</code>
                  </td>
                </tr>
              </table>
              `
                  : ""
              }

              <!-- CTA Buttons -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px;">
                    <a href="${APP_URL}/d/${deal.publicId}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600;">
                      View Agreement
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center" style="padding: 8px;">
                    <a href="${APP_URL}/verify?id=${deal.publicId}" style="display: inline-block; color: #6366f1; text-decoration: none; font-size: 14px; font-weight: 500;">
                      Verify Agreement →
                    </a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-align: center;">
                This is an automated message from Proofo. Please do not reply to this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                © ${new Date().getFullYear()} Proofo. Evidence that holds up.
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

/**
 * Generate plain text version of the email
 */
function generateReceiptEmailText(deal: Deal): string {
  return `
Your agreement has been sealed!

The agreement "${deal.title}" with ${deal.creatorName} has been cryptographically sealed and is now enforceable.

AGREEMENT DETAILS
-----------------
Title: ${deal.title}
Creator: ${deal.creatorName}
Deal ID: ${deal.publicId}
Sealed At: ${deal.confirmedAt ? formatDateTime(deal.confirmedAt) : "N/A"}

${
  deal.terms.length > 0
    ? `TERMS
-----
${deal.terms.map((term) => `${term.label}: ${term.value}`).join("\n")}`
    : ""
}

${
  deal.dealSeal
    ? `CRYPTOGRAPHIC SEAL (SHA-256)
${deal.dealSeal}`
    : ""
}

VIEW YOUR AGREEMENT:
${APP_URL}/d/${deal.publicId}

VERIFY THIS AGREEMENT:
${APP_URL}/verify?id=${deal.publicId}

---
This is an automated message from Proofo.
© ${new Date().getFullYear()} Proofo. Evidence that holds up.
  `.trim();
}

/**
 * HTML escape helper
 */
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Send deal receipt email to recipient
 */
export async function sendDealReceiptEmail(params: {
  deal: Deal;
  recipientEmail: string;
  pdfBase64?: string;
  pdfFilename?: string;
}): Promise<{ success: boolean; error: string | null; emailId?: string }> {
  const { deal, recipientEmail, pdfBase64, pdfFilename } = params;

  // Check if Resend is configured
  if (!resend) {
    logger.warn("Resend API key not configured. Email not sent.");
    return {
      success: false,
      error: "Email service not configured. Please set RESEND_API_KEY environment variable.",
    };
  }

  // Validate email with proper regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!recipientEmail || !emailRegex.test(recipientEmail)) {
    return { success: false, error: "Invalid recipient email address" };
  }

  try {
    // Build email options
    const emailOptions: {
      from: string;
      to: string[];
      subject: string;
      html: string;
      text: string;
      attachments?: Array<{ filename: string; content: string }>;
    } = {
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject: `Your Sealed Agreement: ${deal.title} - Proofo`,
      html: generateReceiptEmailHTML(deal),
      text: generateReceiptEmailText(deal),
    };

    // Add PDF attachment if provided
    if (pdfBase64 && pdfFilename) {
      emailOptions.attachments = [
        {
          filename: pdfFilename,
          content: pdfBase64,
        },
      ];
    }

    // Send email
    const { data, error } = await resend.emails.send(emailOptions);

    if (error) {
      logger.error("Resend error", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      error: null,
      emailId: data?.id,
    };
  } catch (error) {
    logger.error("Email send error", error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}

/**
 * Send deal invitation email (when deal is created)
 */
export async function sendDealInvitationEmail(params: {
  deal: Deal;
  recipientEmail: string;
  shareUrl: string;
}): Promise<{ success: boolean; error: string | null; emailId?: string }> {
  const { deal, recipientEmail, shareUrl } = params;

  // Check if Resend is configured
  if (!resend) {
    logger.warn("Resend API key not configured. Email not sent.");
    return {
      success: false,
      error: "Email service not configured. Please set RESEND_API_KEY environment variable.",
    };
  }

  // Validate email with proper regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!recipientEmail || !emailRegex.test(recipientEmail)) {
    return { success: false, error: "Invalid recipient email address" };
  }

  try {
    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject: `${deal.creatorName} sent you an agreement to sign - Proofo`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Sign Agreement - Proofo</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table role="presentation" style="width: 100%; border-collapse: collapse;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" style="width: 100%; max-width: 600px; border-collapse: collapse;">

          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%); padding: 30px 40px; border-radius: 12px 12px 0 0;">
              <h1 style="margin: 0; font-size: 28px; font-weight: 700; color: #ffffff;">Proofo</h1>
              <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.8);">Evidence that holds up</p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="background-color: #ffffff; padding: 40px; border-left: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb;">

              <h2 style="margin: 0 0 8px 0; font-size: 24px; font-weight: 700; color: #1f2937;">
                You've been sent an agreement
              </h2>
              <p style="margin: 0 0 24px 0; font-size: 16px; color: #6b7280; line-height: 1.6;">
                ${escapeHtml(deal.creatorName)} has sent you an agreement to sign on Proofo.
              </p>

              <!-- Deal Summary Card -->
              <table role="presentation" style="width: 100%; border-collapse: collapse; background-color: #f9fafb; border-radius: 8px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #374151;">${escapeHtml(deal.title)}</h3>
                    ${deal.description ? `<p style="margin: 0; font-size: 14px; color: #6b7280;">${escapeHtml(deal.description)}</p>` : ""}
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table role="presentation" style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td align="center" style="padding: 8px;">
                    <a href="${shareUrl}" style="display: inline-block; background-color: #6366f1; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 16px; font-weight: 600;">
                      Review & Sign Agreement
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin: 24px 0 0 0; font-size: 13px; color: #9ca3af; text-align: center;">
                No account needed - just click the button to review and sign.
              </p>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px 40px; border-radius: 0 0 12px 12px; border: 1px solid #e5e7eb; border-top: none;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; text-align: center;">
                This is an automated message from Proofo. Please do not reply to this email.
              </p>
              <p style="margin: 0; font-size: 12px; color: #9ca3af; text-align: center;">
                © ${new Date().getFullYear()} Proofo. Evidence that holds up.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim(),
      text: `
${deal.creatorName} has sent you an agreement to sign on Proofo.

AGREEMENT: ${deal.title}
${deal.description ? `Description: ${deal.description}` : ""}

CLICK HERE TO REVIEW & SIGN:
${shareUrl}

No account needed - just click the link to review and sign.

---
This is an automated message from Proofo.
© ${new Date().getFullYear()} Proofo. Evidence that holds up.
      `.trim(),
    });

    if (error) {
      logger.error("Resend error", error);
      return { success: false, error: error.message };
    }

    return {
      success: true,
      error: null,
      emailId: data?.id,
    };
  } catch (error) {
    logger.error("Email send error", error as Error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send email",
    };
  }
}
