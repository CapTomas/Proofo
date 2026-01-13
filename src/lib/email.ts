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
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Sealed Agreement - Proofo</title>
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
    .button:hover {
      background-color: #ffffff !important;
      box-shadow: 0 0 15px rgba(255, 255, 255, 0.15) !important;
    }
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

        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; background-color: #121212; border-radius: 20px; border-collapse: separate; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Status Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px; place-self: anchor-center;">
                <tr>
                  <td>
                    <div style="background-color: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 50px; padding: 6px 16px;">
                      <span style="color: #10b981; font-size: 13px; font-weight: 600;">Agreement Sealed</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 12px 0; font-size: 22px; font-weight: 600; letter-spacing: -0.02em; color: #ededed; text-align: center;">
                Handshake complete
              </h1>

              <!-- Subtext -->
              <p style="margin: 0 0 32px 0; font-size: 14px; line-height: 1.6; color: #888888; text-align: center;">
                The agreement "${escapeHtml(deal.title)}" between you and ${escapeHtml(deal.creatorName)} is now cryptographically sealed.
              </p>

              <!-- Deal Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ededed;">${escapeHtml(deal.title)}</h3>
                    ${deal.description ? `<p style="margin: 8px 0 16px 0; font-size: 14px; color: #888888; line-height: 1.6;">${escapeHtml(deal.description)}</p>` : ""}

                    <!-- Terms List -->
                    ${deal.terms.length > 0 ? `
                    <div style="border-top: 1px solid #262626; padding-top: 16px; margin-top: 8px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        ${deal.terms.map(term => `
                        <tr>
                          <td style="padding: 6px 0; color: #666666; font-size: 13px;">${escapeHtml(term.label)}</td>
                          <td style="padding: 6px 0; color: #ededed; font-size: 13px; font-weight: 500; text-align: right;">${escapeHtml(term.value)}</td>
                        </tr>
                        `).join("")}
                      </table>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <!-- Agreement Metadata Section -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 32px;">
                <tr>
                  <td style="padding: 20px;">
                    <h3 style="margin: 0 0 16px 0; font-size: 12px; font-weight: 600; color: #666666; text-transform: uppercase; letter-spacing: 0.1em;">Evidence Details</h3>
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #262626;">
                          <span style="color: #888888; font-size: 13px;">Created By</span>
                        </td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #262626; text-align: right;">
                          <span style="color: #ededed; font-size: 13px; font-weight: 500;">${escapeHtml(deal.creatorName)}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #262626;">
                          <span style="color: #888888; font-size: 13px;">Recipient</span>
                        </td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #262626; text-align: right;">
                          <span style="color: #ededed; font-size: 13px; font-weight: 500;">${escapeHtml(deal.recipientName || "Handshake Partner")}</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0; border-bottom: 1px solid #262626;">
                          <span style="color: #888888; font-size: 13px;">Proofo ID</span>
                        </td>
                        <td style="padding: 10px 0; border-bottom: 1px solid #262626; text-align: right;">
                          <code style="color: #10b981; font-size: 11px; font-family: monospace; background-color: rgba(16, 185, 129, 0.05); padding: 2px 6px; border-radius: 4px;">${escapeHtml(deal.publicId)}</code>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding: 10px 0;">
                          <span style="color: #888888; font-size: 13px;">Timestamp</span>
                        </td>
                        <td style="padding: 10px 0; text-align: right;">
                          <span style="color: #ededed; font-size: 13px; font-weight: 500;">${deal.confirmedAt ? formatDateTime(deal.confirmedAt) : "N/A"}</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Integrity Seal -->
              ${deal.dealSeal ? `
              <div style="background-color: #000000; border: 1px solid #262626; border-radius: 12px; padding: 20px; margin-bottom: 32px;">
                <p style="margin: 0 0 10px 0; font-size: 11px; font-weight: 600; color: #10b981; text-transform: uppercase; letter-spacing: 0.1em;">Truth Integrity Seal</p>
                <div style="background-color: #0c0c0c; border-radius: 6px; padding: 12px; border: 1px solid #1a1a1a;">
                  <code style="font-size: 10px; color: #444444; font-family: monospace; word-break: break-all; line-height: 1.4;">${deal.dealSeal}</code>
                </div>
              </div>
              ` : ""}

              <!-- Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${APP_URL}/d/${deal.publicId}" class="button" target="_blank" style="display: block; width: 100%; padding: 14px 0; background-color: #ededed; color: #000000; text-decoration: none; font-size: 15px; font-weight: 600; border-radius: 10px; text-align: center; transition: all 0.2s;">
                      Manage Agreement &rarr;
                    </a>
                  </td>
                </tr>
                <tr>
                  <td align="center">
                    <a href="${APP_URL}/verify?id=${deal.publicId}" style="display: inline-block; padding: 10px 0; color: #666666; text-decoration: none; font-size: 12px; font-weight: 500; letter-spacing: 0.02em;">
                      VERIFY ON THE BLOCKCHAIN
                    </a>
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
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%;">
                      <tr>
                        <td style="width: 8px; height: 8px; background-color: #10b981; border-radius: 4px; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle">
                    <span style="font-size: 12px; color: #777777; font-weight: 500; display: block; line-height: 1; letter-spacing: 0.01em;">
                      SECURE CRYPTOGRAPHIC EVIDENCE
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <!-- Exterior Footer -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; margin-top: 24px;">
          <tr>
            <td align="center" style="color: #333333; font-size: 11px; line-height: 1.5;">
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
    const invitationLink = shareUrl;

    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to seal an agreement - Proofo</title>
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
    .button:hover {
      background-color: #ffffff !important;
      box-shadow: 0 0 20px rgba(255, 255, 255, 0.2) !important;
      transform: translateY(-1px);
    }
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

        <!-- Main Card -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width: 440px; background-color: #121212; border-radius: 20px; border-collapse: separate; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.5);">
          <tr>
            <td style="padding: 40px 32px;">
              <!-- Status Badge -->
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 24px; place-self: anchor-center;">
                <tr>
                  <td>
                    <div style="background-color: rgba(16, 185, 129, 0.05); border: 1px solid rgba(16, 185, 129, 0.2); border-radius: 50px; padding: 6px 16px;">
                      <span style="color: #10b981; font-size: 13px; font-weight: 600;">Signature Requested</span>
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Heading -->
              <h1 style="margin: 0 0 12px 0; font-size: 24px; font-weight: 600; letter-spacing: -0.02em; color: #ededed; text-align: center;">
                Seal the handshake
              </h1>

              <!-- Subtext -->
              <p style="margin: 0 0 32px 0; font-size: 15px; line-height: 1.6; color: #888888; text-align: center;">
                <span style="color: #10b981; font-weight: 600; font-size: 17px; display: block; margin-bottom: 8px;">${escapeHtml(deal.creatorName)}</span>
                has invited you to review and sign a new agreement on Proofo.
              </p>

              <!-- Deal Details Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #1a1a1a; border-radius: 12px; margin-bottom: 24px;">
                <tr>
                  <td style="padding: 24px;">
                    <h3 style="margin: 0 0 8px 0; font-size: 18px; font-weight: 600; color: #ededed;">${escapeHtml(deal.title)}</h3>
                    ${deal.description ? `<p style="margin: 8px 0 16px 0; font-size: 14px; color: #888888; line-height: 1.6;">${escapeHtml(deal.description)}</p>` : ""}

                    <!-- Terms Preview -->
                    ${deal.terms.length > 0 ? `
                    <div style="border-top: 1px solid #262626; padding-top: 16px; margin-top: 8px;">
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                        ${deal.terms.slice(0, 3).map(term => `
                        <tr>
                          <td style="padding: 4px 0; color: #666666; font-size: 13px;">${escapeHtml(term.label)}</td>
                          <td style="padding: 4px 0; color: #ededed; font-size: 13px; font-weight: 500; text-align: right;">${escapeHtml(term.value)}</td>
                        </tr>
                        `).join("")}
                        ${deal.terms.length > 3 ? `
                        <tr>
                          <td colspan="2" style="padding: 8px 0 0 0; color: #444444; font-size: 11px; font-style: italic;">
                            + ${deal.terms.length - 3} more terms to review
                          </td>
                        </tr>
                        ` : ""}
                      </table>
                    </div>
                    ` : ""}
                  </td>
                </tr>
              </table>

              <!-- Trust Pillars -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin-bottom: 32px;">
                <tr>
                  <td style="padding-bottom: 16px;">
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="top" style="padding-right: 12px; padding-top: 4px;">
                          <div style="width: 4px; height: 4px; background-color: #10b981; border-radius: 2px;"></div>
                        </td>
                        <td>
                          <span style="color: #ededed; font-size: 13px; font-weight: 500;">No account required</span>
                          <p style="margin: 2px 0 0 0; color: #666666; font-size: 12px;">Review and sign in seconds.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
                <tr>
                  <td>
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td valign="top" style="padding-right: 12px; padding-top: 4px;">
                          <div style="width: 4px; height: 4px; background-color: #10b981; border-radius: 2px;"></div>
                        </td>
                        <td>
                          <span style="color: #ededed; font-size: 13px; font-weight: 500;">Evidence that holds up</span>
                          <p style="margin: 2px 0 0 0; color: #666666; font-size: 12px;">Backed by secure cryptographic signatures.</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Action Buttons -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                <tr>
                  <td align="center" style="padding-bottom: 12px;">
                    <a href="${invitationLink}" class="button" target="_blank" style="display: block; width: 100%; padding: 16px 0; background-color: #ededed; color: #000000; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 12px; text-align: center; transition: all 0.2s;">
                      Review & Sign Agreement &rarr;
                    </a>
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
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="width: 8px; height: 8px; background-color: #10b981; border-radius: 50%;">
                      <tr>
                        <td style="width: 8px; height: 8px; background-color: #10b981; border-radius: 4px; box-shadow: 0 0 8px rgba(16, 185, 129, 0.6); font-size: 1px; line-height: 1px;">&nbsp;</td>
                      </tr>
                    </table>
                  </td>
                  <td valign="middle">
                    <span style="font-size: 12px; color: #777777; font-weight: 500; display: block; line-height: 1; letter-spacing: 0.05em;">
                      THE TRUTH, LOCKED FOREVER.
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
            <td align="center" style="color: #444444; font-size: 11px; line-height: 1.5;">
              <p style="margin: 0;">© ${new Date().getFullYear()} Proofo Inc. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `.trim();

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: [recipientEmail],
      subject: `Action Required: Seal your agreement with ${deal.creatorName}`,
      html,
      text: `${deal.creatorName} has invited you to review and sign a new agreement on Proofo: ${invitationLink}`,
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
