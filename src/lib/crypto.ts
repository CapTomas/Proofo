import { nanoid } from "nanoid";



/**
 * Generate a unique public ID for a deal
 * Uses nanoid with a short, URL-safe format
 */
export function generatePublicId(): string {
  return nanoid(10);
}

/**
 * Generate a secure access token for deal confirmation
 * 32-byte hex string for security
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

/**
 * Deterministically stringify an object by sorting keys
 * This ensures {a:1, b:2} and {b:2, a:1} produce the same string
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function deterministicStringify(obj: any): string {
  // 1. Handle primitives
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  // 2. Handle Arrays (keep order, but sort keys of items inside)
  if (Array.isArray(obj)) {
    return "[" + obj.map(deterministicStringify).join(",") + "]";
  }

  // 3. Handle Objects (sort keys alphabetically)
  const sortedKeys = Object.keys(obj).sort();
  const parts = sortedKeys.map((key) => {
    return `${JSON.stringify(key)}:${deterministicStringify(obj[key])}`;
  });

  return "{" + parts.join(",") + "}";
}

/**
 * Calculate SHA-256 hash of deal data for cryptographic sealing
 */
export async function calculateDealSeal(data: {
  dealId: string;
  terms: string;
  signatureUrl?: string;
  timestamp: string;
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

  // 3. Construct Payload
  const payload = deterministicStringify({
    dealId: data.dealId,
    terms: termsObj,
    signatureUrl: data.signatureUrl || "",
    timestamp: normalizedTimestamp, // Use normalized version
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
      console.warn("Crypto module not available for hashing");
      return `hash-${Date.now()}-${Math.random().toString(36).substring(2)}`;
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
