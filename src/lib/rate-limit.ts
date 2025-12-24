/**
 * Rate Limiting Configuration
 *
 * Uses Upstash Redis for serverless-compatible rate limiting.
 * Configure UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN in .env.local
 *
 * Rate limits are applied to server actions to prevent abuse.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

// Check if Upstash is configured
const isRateLimitConfigured = process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN;

// Create Redis instance (or null if not configured)
const redis = isRateLimitConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  : null;

/**
 * Rate limiters for different operations
 * Each uses sliding window algorithm for smooth limiting
 */
export const rateLimits = {
  /**
   * Auth operations: 10 requests per minute
   * Prevents brute force login attempts
   */
  auth: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:auth",
      })
    : null,

  /**
   * Deal creation: 20 requests per hour
   * Prevents spam deal creation
   */
  dealCreate: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(20, "1 h"),
        analytics: true,
        prefix: "ratelimit:deal-create",
      })
    : null,

  /**
   * Email sending: 5 requests per hour per user
   * Prevents email spam
   */
  email: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(5, "1 h"),
        analytics: true,
        prefix: "ratelimit:email",
      })
    : null,

  /**
   * General API: 100 requests per minute
   * General rate limit for other operations
   */
  general: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(100, "1 m"),
        analytics: true,
        prefix: "ratelimit:general",
      })
    : null,
};

/**
 * Check rate limit for an identifier
 *
 * @param limiter - The rate limiter to use
 * @param identifier - Unique identifier (e.g., user ID, IP address)
 * @returns Object with success boolean and optional reset time
 */
export async function checkRateLimit(
  limiter: keyof typeof rateLimits,
  identifier: string
): Promise<{ success: boolean; reset?: number; remaining?: number }> {
  const ratelimit = rateLimits[limiter];

  // If rate limiting is not configured, allow all requests
  if (!ratelimit) {
    return { success: true };
  }

  const result = await ratelimit.limit(identifier);

  return {
    success: result.success,
    reset: result.reset,
    remaining: result.remaining,
  };
}

/**
 * Helper to get client IP from headers (for rate limiting unauthenticated requests)
 */
export function getClientIP(headers: Headers): string {
  // Check common headers in order of preference
  const xff = headers.get("x-forwarded-for");
  if (xff) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return xff.split(",")[0].trim();
  }

  const realIP = headers.get("x-real-ip");
  if (realIP) {
    return realIP;
  }

  // Fallback to a generic identifier
  return "unknown";
}
