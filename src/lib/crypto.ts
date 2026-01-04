import { nanoid } from "nanoid";
import { logger } from "./logger";


/**
 * Generate a unique public ID for a deal.
 *
 * Uses `nanoid` (10 chars) to create a short, URL-safe identifier that is
 * easy to share and type, but sufficiently collision-resistant for this scope.
 *
 * @returns {string} A 10-character alphanumeric ID (e.g., "Kj9f7L2m1p")
 */
export function generatePublicId(): string {
  return nanoid(10);
}

/**
 * Generate a secure access token for deal confirmation.
 *
 * Creates a high-entropy 32-byte hex string (64 characters).
 * Prioritizes the Web Crypto API `getRandomValues` in the browser
 * for true cryptographic randomness. Falls back to `nanoid` (64 chars)
 * for server-side environments or older browsers.
 *
 * @returns {string} A 64-character secure hexadecimal or alphanumeric string.
 */
export function generateAccessToken(): string {
  // In browser, use Web Crypto API
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    return Array.from(array)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }
  // Fallback to nanoid for server-side or environments without crypto
  return nanoid(64);
}

export interface VerificationData {
  email?: { verified: boolean; value?: string; verifiedAt?: string };
  phone?: { verified: boolean; verifiedAt?: string };
}

/**
 * Normalizes database verification records into a consistent structure for hashing.
 * CRITICAL: Normalizes timestamps to ISO format to ensure consistency between
 * Supabase client (returns "2024-01-01 12:00:00+00") and JSON/RPC (returns "2024-01-01T12:00:00+00:00")
 */
export function transformVerificationsForHash(records: any[] | null | undefined): VerificationData | undefined {
  if (!records || records.length === 0) return undefined;

  const verifications: VerificationData = {};
  for (const record of records) {
    // Handle both snake_case (DB) and camelCase (already transformed) inputs
    const type = record.verification_type || record.type;
    const value = record.verified_value || record.value;
    const rawAt = record.verified_at || record.at || record.verifiedAt;

    // CRITICAL: Normalize timestamp to ISO format for hash consistency
    const at = rawAt ? new Date(rawAt).toISOString() : undefined;

    if (type === "email") {
      verifications.email = {
        verified: true,
        value: value,
        verifiedAt: at,
      };
    } else if (type === "phone") {
      verifications.phone = {
        verified: true,
        verifiedAt: at,
      };
    }
  }
  return Object.keys(verifications).length > 0 ? verifications : undefined;
}

/**
 * Deterministically stringify an object by sorting keys.
 * This ensures {a:1, b:2} and {b:2, a:1} produce the same string.
 */
export function deterministicStringify(obj: unknown): string {
  // 1. Handle Null
  if (obj === null) return "null";

  // 2. Handle Primitives
  if (typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  // 3. Handle Arrays (keep order, but sort keys of items inside)
  if (Array.isArray(obj)) {
    return "[" + obj.map(deterministicStringify).join(",") + "]";
  }

  // 4. Handle Objects (sort keys alphabetically)
  const objRecord = obj as Record<string, unknown>;
  const sortedKeys = Object.keys(objRecord)
    .filter((key) => objRecord[key] !== undefined)
    .sort();
  const parts = sortedKeys.map((key) => {
    return `${JSON.stringify(key)}:${deterministicStringify(objRecord[key])}`;
  });

  return "{" + parts.join(",") + "}";
}

/**
 * Calculate a SHA-256 hash of deal data for cryptographic sealing.
 *
 * This is the "Seal" of the deal. It ensures that any tampering with the
 * deal ID, terms, signature, or timestamp after confirmation will result
 * in a hash mismatch during verification.
 *
 * Process:
 * 1. Normalize the timestamp to ISO string format for consistency.
 * 2. Deterministically stringify the payload (sorted keys) to ensure
 *    the same data always produces the same hash regardless of object key order.
 * 3. Use `crypto.subtle.digest` (Web Crypto) in-browser or `crypto` module in Node.js.
 *
 * @param {Object} data - The core deal data to seal.
 * @param {string} data.dealId - Internal DB ID of the deal.
 * @param {string | Object} data.terms - The final agreed-upon terms.
 * @param {string} [data.signatureUrl] - Optional base64 or URL of the recipient's signature.
 * @param {string} data.timestamp - The ISO timestamp of when the deal was sealed.
 * @param {Object} [data.verifications] - Optional verification metadata included in the seal.
 * @returns {Promise<string>} A hex-encoded SHA-256 hash string.
 * @throws {Error} If no cryptographic hashing method is available in the environment.
 */
export async function calculateDealSeal(data: {
  dealId: string;
  terms: string | any[];
  signatureUrl?: string;
  timestamp: string;
  verifications?: VerificationData;
}): Promise<string> {
  // 1. Parse terms if it's a string, so we can re-stringify it deterministically
  let termsObj;
  try {
    termsObj = typeof data.terms === "string" ? JSON.parse(data.terms) : data.terms;
  } catch {
    termsObj = data.terms;
  }

  // 2. Normalize Timestamp (CRITICAL FIX)
  // Ensure we compare "2023-01-01T00:00:00.000Z" not "2023-01-01T00:00:00+00:00"
  const normalizedTimestamp = new Date(data.timestamp).toISOString();

  // 3. Construct Payload (including verifications if present)
  const payload = deterministicStringify({
    dealId: data.dealId,
    terms: termsObj,
    signatureUrl: data.signatureUrl || "",
    timestamp: normalizedTimestamp,
    ...(data.verifications && { verifications: data.verifications }),
  });

  // Use Web Crypto API for SHA-256
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const encoder = new TextEncoder();
    const dataBuffer = encoder.encode(payload);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", dataBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
  }

  // Server-side fallback using Node.js crypto (if available)
  if (typeof globalThis !== "undefined") {
    try {
      const crypto = await import("crypto");
      return crypto.createHash("sha256").update(payload).digest("hex");
    } catch {
      // SECURITY: Don't fall back to weak hash - throw error instead
      logger.error("Crypto module not available for hashing");
      throw new Error("Cryptographic hashing not available. Cannot generate secure hash.");
    }
  }

  throw new Error("No cryptographic hashing method available");
}

/**
 * Format a date for display
 */
export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Format a date with time for display
 */
export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/**
 * Calculate time ago string
 */
export function timeAgo(date: string | Date): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  if (diffDays < 30) return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
  return formatDate(d);
}

/**
 * Get token expiry date (7 days from now by default)
 */
export function getTokenExpiry(daysFromNow: number = 7): Date {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + daysFromNow);
  return expiry;
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiryDate: string | Date): boolean {
  const expiry = typeof expiryDate === "string" ? new Date(expiryDate) : expiryDate;
  return new Date() > expiry;
}
