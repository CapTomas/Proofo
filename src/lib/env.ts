/**
 * Environment Variable Validation
 *
 * SECURITY: Validates required environment variables at runtime to prevent
 * crashes from missing configuration. This replaces unsafe `!` assertions.
 */

import { logger } from "./logger";

// Required environment variables for core functionality
const REQUIRED_VARS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
] as const;

// Optional but recommended variables
const OPTIONAL_VARS = [
  "UPSTASH_REDIS_URL",
  "UPSTASH_REDIS_TOKEN",
  "RESEND_API_KEY",
  "RESEND_FROM_EMAIL",
  "NEXT_PUBLIC_APP_URL",
] as const;

type RequiredVar = typeof REQUIRED_VARS[number];
type OptionalVar = typeof OPTIONAL_VARS[number];

// Cached validated values
let validated = false;
const envCache: Partial<Record<RequiredVar | OptionalVar, string>> = {};

/**
 * Validate all required environment variables
 * Call this at application startup
 */
export function validateEnv(): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  for (const varName of REQUIRED_VARS) {
    const value = process.env[varName];
    if (!value) {
      missing.push(varName);
    } else {
      envCache[varName] = value;
    }
  }

  // Log optional but recommended vars that are missing
  for (const varName of OPTIONAL_VARS) {
    const value = process.env[varName];
    if (value) {
      envCache[varName] = value;
    }
  }

  validated = true;

  if (missing.length > 0) {
    logger.error(`Missing required environment variables: ${missing.join(", ")}`);
    return { valid: false, missing };
  }

  return { valid: true, missing: [] };
}

/**
 * Get a required environment variable with runtime validation
 * Throws if variable is not set
 */
export function getRequiredEnv(name: RequiredVar): string {
  // Check cache first
  if (envCache[name]) {
    return envCache[name] as string;
  }

  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Required environment variable ${name} is not set. ` +
      `Please configure it in your environment or .env.local file.`
    );
  }

  envCache[name] = value;
  return value;
}

/**
 * Get an optional environment variable with fallback
 */
export function getOptionalEnv(name: OptionalVar, fallback: string = ""): string {
  // Check cache first
  if (envCache[name]) {
    return envCache[name] as string;
  }

  const value = process.env[name];
  if (value) {
    envCache[name] = value;
    return value;
  }

  return fallback;
}

/**
 * Get Supabase configuration with validation
 */
export function getSupabaseConfig(): { url: string; anonKey: string } {
  return {
    url: getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
    anonKey: getRequiredEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  };
}

/**
 * Check if Supabase is properly configured
 */
export function isSupabaseConfigured(): boolean {
  try {
    getSupabaseConfig();
    return true;
  } catch {
    return false;
  }
}

// Validate on module load in production
if (process.env.NODE_ENV === "production" && !validated) {
  const result = validateEnv();
  if (!result.valid) {
    logger.error(
      "CRITICAL: Application started with missing environment variables. " +
      "Some functionality may not work correctly."
    );
  }
}
