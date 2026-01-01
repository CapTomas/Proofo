/**
 * Rate Limiting Configuration
 *
 * Uses Upstash Redis for serverless-compatible rate limiting.
 * Configure UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN in .env.local
 *
 * Rate limits are applied to server actions to prevent abuse.
 *
 * SECURITY: When Upstash is not configured, an in-memory fallback is used.
 * This provides basic protection but is NOT suitable for multi-instance deployments.
 */
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { logger } from "./logger";

// Check if Upstash is configured
const isRateLimitConfigured = !!(process.env.UPSTASH_REDIS_URL && process.env.UPSTASH_REDIS_TOKEN);

// Log warning if rate limiting is not configured in production
if (!isRateLimitConfigured && process.env.NODE_ENV === "production") {
  logger.warn(
    "SECURITY WARNING: Upstash Redis not configured. Using in-memory rate limiting fallback. " +
    "This is NOT suitable for production multi-instance deployments. " +
    "Set UPSTASH_REDIS_URL and UPSTASH_REDIS_TOKEN environment variables."
  );
}

// Create Redis instance (or null if not configured)
const redis = isRateLimitConfigured
  ? new Redis({
      url: process.env.UPSTASH_REDIS_URL!,
      token: process.env.UPSTASH_REDIS_TOKEN!,
    })
  : null;

/**
 * In-memory rate limit store (fallback when Redis not configured)
 * Key: "limiter:identifier", Value: { count, resetAt }
 *
 * WARNING: This is process-local and won't work correctly with multiple
 * serverless instances. Only use as a fallback for development/single instance.
 */
const memoryStore = new Map<string, { count: number; resetAt: number }>();

// Rate limit configurations (matching Upstash definitions)
const RATE_LIMIT_CONFIG = {
  auth: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
  dealCreate: { maxRequests: 20, windowMs: 60 * 60 * 1000 }, // 20 per hour
  email: { maxRequests: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
  general: { maxRequests: 100, windowMs: 60 * 1000 }, // 100 per minute
  emailLookup: { maxRequests: 10, windowMs: 60 * 1000 }, // 10 per minute
} as const;

/**
 * Fallback in-memory rate limiter
 * Provides basic protection when Redis is not configured
 */
function checkMemoryRateLimit(
  limiter: keyof typeof RATE_LIMIT_CONFIG,
  identifier: string
): { success: boolean; reset?: number; remaining?: number } {
  const config = RATE_LIMIT_CONFIG[limiter];
  const key = `${limiter}:${identifier}`;
  const now = Date.now();

  const entry = memoryStore.get(key);

  // If no entry or window expired, create new entry
  if (!entry || now >= entry.resetAt) {
    const resetAt = now + config.windowMs;
    memoryStore.set(key, { count: 1, resetAt });
    return { success: true, reset: resetAt, remaining: config.maxRequests - 1 };
  }

  // Check if limit exceeded
  if (entry.count >= config.maxRequests) {
    return { success: false, reset: entry.resetAt, remaining: 0 };
  }

  // Increment count
  entry.count++;
  memoryStore.set(key, entry);
  return {
    success: true,
    reset: entry.resetAt,
    remaining: config.maxRequests - entry.count
  };
}

// Periodic cleanup of expired entries (every 5 minutes)
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of memoryStore.entries()) {
      if (now >= entry.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000);
}

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

  /**
   * Email lookup: 10 requests per minute per user/IP
   * Prevents email enumeration attacks
   */
  emailLookup: redis
    ? new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(10, "1 m"),
        analytics: true,
        prefix: "ratelimit:email-lookup",
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

  // If Upstash rate limiting is not configured, use in-memory fallback
  if (!ratelimit) {
    return checkMemoryRateLimit(limiter, identifier);
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

/**
 * Check if rate limiting is properly configured (for health checks)
 */
export function isRateLimitingConfigured(): boolean {
  return isRateLimitConfigured;
}
