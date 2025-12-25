"use client";

import { AuditEventType } from "@/types";

/**
 * Client-side metadata collection for audit events
 * Captures device, browser, and screen information
 */
export interface ClientMetadata {
  platform?: string;
  language?: string;
  screenWidth?: number;
  screenHeight?: number;
  deviceType?: "mobile" | "tablet" | "desktop";
  timezone?: string;
  referrer?: string;
  userAgent?: string;
  colorScheme?: "light" | "dark";
  touchEnabled?: boolean;
}

/**
 * Determines device type based on screen width
 */
function getDeviceType(): "mobile" | "tablet" | "desktop" {
  if (typeof window === "undefined") return "desktop";
  const width = window.innerWidth;
  if (width < 768) return "mobile";
  if (width < 1024) return "tablet";
  return "desktop";
}

/**
 * Collects client-side metadata for audit logging
 * This data enriches audit events with device/browser context
 */
export function getClientMetadata(): ClientMetadata {
  if (typeof window === "undefined") {
    return {};
  }

  return {
    platform: navigator.platform || undefined,
    language: navigator.language || undefined,
    screenWidth: window.innerWidth,
    screenHeight: window.innerHeight,
    deviceType: getDeviceType(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || undefined,
    referrer: document.referrer || undefined,
    userAgent: navigator.userAgent || undefined,
    colorScheme: window.matchMedia?.("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light",
    touchEnabled:
      "ontouchstart" in window ||
      navigator.maxTouchPoints > 0,
  };
}

/**
 * Format device type for display
 */
export function formatDeviceType(deviceType?: string): string {
  if (!deviceType) return "Unknown";
  return deviceType.charAt(0).toUpperCase() + deviceType.slice(1);
}

/**
 * Get a human-readable browser name from user agent
 */
export function getBrowserName(userAgent?: string): string {
  if (!userAgent) return "Unknown";

  if (userAgent.includes("Chrome") && !userAgent.includes("Edg")) return "Chrome";
  if (userAgent.includes("Safari") && !userAgent.includes("Chrome")) return "Safari";
  if (userAgent.includes("Firefox")) return "Firefox";
  if (userAgent.includes("Edg")) return "Edge";
  if (userAgent.includes("Opera") || userAgent.includes("OPR")) return "Opera";

  return "Browser";
}

/**
 * Audit event configuration for client-side tracking
 */
export interface AuditEventConfig {
  eventType: AuditEventType;
  metadata?: Record<string, unknown>;
  includeClientMetadata?: boolean;
}

/**
 * Prepare audit event payload with client metadata
 */
export function prepareAuditEvent(config: AuditEventConfig): {
  eventType: AuditEventType;
  metadata: Record<string, unknown>;
} {
  const baseMetadata = config.metadata || {};

  if (config.includeClientMetadata !== false && typeof window !== "undefined") {
    const clientMeta = getClientMetadata();
    return {
      eventType: config.eventType,
      metadata: {
        ...baseMetadata,
        client: {
          deviceType: clientMeta.deviceType,
          platform: clientMeta.platform,
          browser: getBrowserName(clientMeta.userAgent),
          screenSize: clientMeta.screenWidth && clientMeta.screenHeight
            ? `${clientMeta.screenWidth}x${clientMeta.screenHeight}`
            : undefined,
          timezone: clientMeta.timezone,
          colorScheme: clientMeta.colorScheme,
          touchEnabled: clientMeta.touchEnabled,
        },
      },
    };
  }

  return {
    eventType: config.eventType,
    metadata: baseMetadata,
  };
}
