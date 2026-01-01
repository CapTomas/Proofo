/**
 * Security Utilities
 *
 * Provides security helpers for server actions including:
 * - CSRF protection via Origin header validation
 * - Request validation helpers
 */
import { headers } from "next/headers";
import { logger } from "./logger";

// Allowed origins for CSRF protection
// Only include localhost in development mode for security
const ALLOWED_ORIGINS = [
  process.env.NEXT_PUBLIC_APP_URL,
  // Only allow localhost in development
  ...(process.env.NODE_ENV === "development"
    ? ["http://localhost:3000", "http://localhost:3001"]
    : []
  ),
].filter(Boolean) as string[];

/**
 * Validate the request origin for CSRF protection
 *
 * Next.js Server Actions don't have automatic CSRF protection.
 * This function validates the Origin or Referer header against allowed origins.
 *
 * @returns Object with isValid boolean and optional error message
 */
export async function validateOrigin(): Promise<{ isValid: boolean; error?: string }> {
  try {
    const headersList = await headers();

    // Get Origin header (preferred)
    const origin = headersList.get("origin");

    // Fallback to Referer if Origin not present
    const referer = headersList.get("referer");
    let refererOrigin: string | null = null;

    if (referer) {
      try {
        const url = new URL(referer);
        refererOrigin = url.origin;
      } catch {
        // Invalid referer URL
      }
    }

    const requestOrigin = origin || refererOrigin;

    // In development, be more lenient
    if (process.env.NODE_ENV === "development") {
      // Allow localhost origins
      if (requestOrigin?.startsWith("http://localhost")) {
        return { isValid: true };
      }
    }

    // Check if origin is in allowed list
    if (requestOrigin && ALLOWED_ORIGINS.some(allowed => requestOrigin === allowed)) {
      return { isValid: true };
    }

    // No Origin header is suspicious for POST-like operations
    // But we allow it in case of same-origin requests (browser may not send Origin)
    if (!requestOrigin) {
      // Log warning but allow - same-origin requests may not have Origin header
      logger.warn("Request without Origin header - allowing but logging");
      return { isValid: true };
    }

    // Origin doesn't match allowed list
    logger.warn(`CSRF validation failed: origin ${requestOrigin} not in allowed list`);
    return {
      isValid: false,
      error: "Invalid request origin"
    };
  } catch (error) {
    logger.error("Error validating origin", error);
    // SECURITY FIX: Fail CLOSED on errors - do not allow requests when validation fails
    return { isValid: false, error: "Origin validation failed" };
  }
}

/**
 * Higher-order function to wrap server actions with CSRF protection
 *
 * Usage:
 * export const myAction = withCsrfProtection(async (data) => {
 *   // action logic
 * });
 */
export function withCsrfProtection<T extends unknown[], R>(
  action: (...args: T) => Promise<R>
): (...args: T) => Promise<R | { error: string }> {
  return async (...args: T) => {
    const { isValid, error } = await validateOrigin();

    if (!isValid) {
      return { error: error || "Invalid request" };
    }

    return action(...args);
  };
}

/**
 * Validate that a request is from an authenticated session
 * Re-validates auth to prevent race conditions in sensitive operations
 *
 * @param expectedUserId - The user ID that should be authenticated
 * @param supabase - Supabase client instance
 * @returns Object with isValid boolean
 */
export async function revalidateAuth(
  expectedUserId: string,
  supabase: { auth: { getUser: () => Promise<{ data: { user: { id: string } | null } }> } }
): Promise<{ isValid: boolean; error?: string }> {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { isValid: false, error: "Session expired" };
    }

    if (user.id !== expectedUserId) {
      return { isValid: false, error: "Session mismatch" };
    }

    return { isValid: true };
  } catch {
    return { isValid: false, error: "Authentication error" };
  }
}
