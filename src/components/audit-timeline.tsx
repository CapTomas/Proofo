"use client";

import { motion } from "framer-motion";
import { AuditLogEntry, DealStatus } from "@/types";
import { formatDateTime } from "@/lib/crypto";
import { FileCheck, Eye, PenLine, CheckCircle2, XCircle, Mail, FileText, Download, ShieldCheck, Link, Smartphone, Monitor, Tablet, Key } from "lucide-react";

interface AuditTimelineProps {
  logs: AuditLogEntry[];
  dealStatus?: DealStatus;
  className?: string;
  compact?: boolean;
  privacyMode?: boolean;
}

/**
 * Utility to mask emails for privacy (GDPR compliance)
 * Example: tomas@example.com -> t***@e***.com
 */
function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;
  const [local, domain] = email.split("@");
  const maskedLocal = local[0] + "***";
  const domainParts = domain.split(".");
  const maskedDomain = domainParts[0][0] + "***";
  const ext = domainParts.length > 1 ? "." + domainParts[domainParts.length - 1] : "";
  return `${maskedLocal}@${maskedDomain}${ext}`;
}

// Event type configuration
const eventConfig: Record<string, {
  label: string;
  icon: typeof FileCheck;
  color: string;
  bgColor: string;
  description: string;
  getDescription?: (metadata?: Record<string, unknown>) => string;
}> = {
  deal_created: {
    label: "Deal Created",
    icon: FileCheck,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Agreement was created and shared",
    getDescription: (metadata) => {
      const termsCount = metadata?.termsCount as number;
      return termsCount
        ? `Agreement created with ${termsCount} term${termsCount !== 1 ? "s" : ""}`
        : "Agreement was created and shared";
    },
  },
  deal_viewed: {
    label: "Deal Viewed",
    icon: Eye,
    color: "text-sky-600",
    bgColor: "bg-sky-500/10",
    description: "Recipient opened the deal link",
    getDescription: (metadata) => {
      const isFirstView = metadata?.isFirstView as boolean | undefined;
      const viewNumber = metadata?.viewNumber as number | undefined;
      const client = metadata?.client as Record<string, unknown> | undefined;

      let description = "";
      if (isFirstView === true) {
        description = "First time viewing this deal";
      } else if (viewNumber && viewNumber > 1) {
        description = `View #${viewNumber}`;
      } else {
        description = "Recipient opened the deal link";
      }

      if (client?.deviceType) {
        description += ` (${client.deviceType})`;
      }

      return description;
    },
  },
  deal_signed: {
    label: "Signature Added",
    icon: PenLine,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    description: "Recipient drew their signature",
    getDescription: (metadata) => {
      const client = metadata?.client as Record<string, unknown> | undefined;
      if (client?.deviceType) {
        return `Signature captured on ${client.deviceType}`;
      }
      return "Recipient drew their signature";
    },
  },
  deal_confirmed: {
    label: "Deal Sealed",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-500/10",
    description: "Agreement was cryptographically sealed",
  },
  deal_voided: {
    label: "Deal Voided",
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    description: "Agreement was cancelled",
  },
  email_sent: {
    label: "Email Sent",
    icon: Mail,
    color: "text-sky-600",
    bgColor: "bg-sky-500/10",
    description: "Email notification sent",
    getDescription: (metadata) => {
      const emailType = metadata?.emailType as string;
      const recipient = metadata?.recipient as string;

      // We'll mask here too if we can access the prop, but config is outside.
      // Better to handle masking inside the component where the prop is available.
      if (emailType === "receipt") {
        return recipient ? `Receipt sent to ${recipient}` : "Receipt was emailed";
      } else if (emailType === "invitation") {
        return recipient ? `Invitation sent to ${recipient}` : "Invitation email sent";
      }
      return "Email notification sent";
    },
  },
  pdf_generated: {
    label: "PDF Generated",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    description: "PDF receipt was generated",
  },
  pdf_downloaded: {
    label: "PDF Downloaded",
    icon: Download,
    color: "text-indigo-600",
    bgColor: "bg-indigo-500/10",
    description: "PDF document was downloaded",
    getDescription: (metadata) => {
      const client = metadata?.client as Record<string, unknown> | undefined;
      if (client?.browser) {
        return `PDF downloaded via ${client.browser}`;
      }
      return "PDF document was downloaded";
    },
  },
  deal_verified: {
    label: "Seal Verified",
    icon: ShieldCheck,
    color: "text-teal-600",
    bgColor: "bg-teal-500/10",
    description: "Cryptographic seal was independently verified",
    getDescription: (metadata) => {
      const result = metadata?.result as string;
      if (result === "valid") {
        return "Seal verified successfully - integrity confirmed";
      } else if (result === "invalid") {
        return "Verification failed - potential tampering detected";
      }
      return "Cryptographic seal was verified";
    },
  },
  deal_link_shared: {
    label: "Link Shared",
    icon: Link,
    color: "text-sky-600",
    bgColor: "bg-sky-500/10",
    description: "Deal link was shared",
    getDescription: (metadata) => {
      const linkType = metadata?.linkType as string;
      if (linkType === "signing") {
        return "Signing link copied to clipboard";
      } else if (linkType === "access") {
        return "Access link copied for sharing";
      }
      return "Share link was copied";
    },
  },
  token_validated: {
    label: "Token Validated",
    icon: Key,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    description: "Access token was validated",
    getDescription: (metadata) => {
      const result = metadata?.result as string;
      if (result === "valid") {
        return "Access token validated successfully";
      } else if (result === "invalid" || result === "expired") {
        return `Access token ${result}`;
      }
      return "Access token validation attempted";
    },
  },
};

// Device icon helper
function getDeviceIcon(deviceType?: string) {
  switch (deviceType) {
    case "mobile":
      return Smartphone;
    case "tablet":
      return Tablet;
    default:
      return Monitor;
  }
}

// Enhanced metadata display component
function MetadataDisplay({
  metadata,
  privacyMode = false
}: {
  metadata: Record<string, unknown>;
  privacyMode?: boolean;
}) {
  // Filter out internal/nested objects and only show useful top-level values
  const displayItems: Array<{ key: string; value: string }> = [];

  // Extract useful metadata for display
  if (metadata.client) {
    const client = metadata.client as Record<string, unknown>;

    // In privacy mode, we hide exact technical fingerprints if they are too specific
    if (client.browser) {
      displayItems.push({ key: "Browser", value: String(client.browser) });
    }

    // Timezone is usually okay, but we could hide it if extremely paranoid.
    // For now keeping it as it helps verify "when" from "where" without exact IP.
    if (client.timezone && !privacyMode) {
      displayItems.push({ key: "Timezone", value: String(client.timezone) });
    }
  }

  // Show email type and recipient
  if (metadata.emailType) {
    displayItems.push({ key: "Type", value: String(metadata.emailType) });
  }

  if (metadata.recipient) {
    const recipient = String(metadata.recipient);
    displayItems.push({
      key: "To",
      value: privacyMode ? maskEmail(recipient) : recipient
    });
  }

  // Show verification result
  if (metadata.result) {
    displayItems.push({ key: "Result", value: String(metadata.result) });
  }

  // Show link type
  if (metadata.linkType) {
    displayItems.push({ key: "Link", value: String(metadata.linkType) });
  }

  // Show terms count
  if (metadata.termsCount) {
    displayItems.push({ key: "Terms", value: String(metadata.termsCount) });
  }

  // Show view number for deal_viewed events
  if (metadata.viewNumber && (metadata.viewNumber as number) > 1) {
    displayItems.push({ key: "View #", value: String(metadata.viewNumber) });
  }

  // Show token type for token_validated events
  if (metadata.tokenType) {
    displayItems.push({ key: "Token", value: String(metadata.tokenType) });
  }

  // If nothing useful to show, hide the component
  if (displayItems.length === 0) return null;

  return (
    <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1 flex flex-wrap gap-x-3 gap-y-0.5">
      {displayItems.map(({ key, value }) => (
        <span key={key}>
          <span className="opacity-70">{key}:</span> {value}
        </span>
      ))}
    </div>
  );
}

function formatActorType(actorType: string): string {
  switch (actorType) {
    case "creator":
      return "By creator";
    case "recipient":
      return "By recipient";
    case "system":
      return "Automatically";
    default:
      return actorType;
  }
}

export function AuditTimeline({
  logs,
  dealStatus,
  className = "",
  compact = false,
  privacyMode = false,
}: AuditTimelineProps) {
  // Sort logs by date (newest first for display, but we'll reverse for timeline)
  const sortedLogs = [...logs].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  if (sortedLogs.length === 0) {
    return (
      <div className={`text-center py-8 text-muted-foreground ${className}`}>
        <FileCheck className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No events recorded yet</p>
      </div>
    );
  }

  return (
    <div className={`relative pl-1 pt-1 mb-2 ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-[21px] top-1 bottom-0 w-0.5 bg-border" />

      <div className="space-y-4">
        {sortedLogs.map((log, index) => {
          const config = eventConfig[log.eventType] || eventConfig.deal_created;
          const Icon = config.icon;
          const isLast = index === sortedLogs.length - 1;

          return (
            <motion.div
              key={log.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="relative pl-12"
            >
              {/* Icon circle */}
              <div
                className={`absolute left-0 h-9 w-9 rounded-full flex items-center justify-center ${config.bgColor} ${
                  isLast ? "ring-2 ring-offset-2 ring-offset-background ring-primary/20" : ""
                }`}
              >
                <Icon className={`h-4 w-4 ${config.color}`} />
              </div>

              {/* Content */}
              <div className={compact ? "" : "pb-2"}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-sm">{config.label}</p>
                  {/* Show device type badge if available */}
                  {(() => {
                    const client = log.metadata?.client as Record<string, unknown> | undefined;
                    if (!client?.deviceType) return null;
                    const deviceType = String(client.deviceType);
                    const DeviceIcon = getDeviceIcon(deviceType);
                    return (
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground font-medium flex items-center gap-1">
                        <DeviceIcon className="h-2.5 w-2.5" />
                        {deviceType}
                      </span>
                    );
                  })()}
                  {isLast && dealStatus === "confirmed" && (
                    <span className="px-1.5 py-0.5 text-xs rounded bg-emerald-500/10 text-emerald-600 font-medium">
                      Latest
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {formatDateTime(log.createdAt)} • {formatActorType(log.actorType)}
                </p>
                {!compact && (
                  <p className="text-xs text-muted-foreground/70 mt-1">
                    {config.getDescription
                      ? config.getDescription(log.metadata as Record<string, unknown>)
                      : config.description}
                  </p>
                )}
                {/* Enhanced metadata display */}
                {!compact && log.metadata && (
                  <MetadataDisplay
                    metadata={log.metadata as Record<string, unknown>}
                    privacyMode={privacyMode}
                  />
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Status indicator at the end */}
        {dealStatus && (
          <div className="relative pl-12">
            <div
              className={`absolute left-0 h-9 w-9 rounded-full flex items-center justify-center ${
                dealStatus === "confirmed"
                  ? "bg-emerald-500/20 ring-2 ring-emerald-500/30"
                  : dealStatus === "voided"
                    ? "bg-destructive/20 ring-2 ring-destructive/30"
                    : "bg-amber-500/20 ring-2 ring-amber-500/30"
              }`}
            >
              {dealStatus === "confirmed" ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-600" />
              ) : dealStatus === "voided" ? (
                <XCircle className="h-5 w-5 text-destructive" />
              ) : (
                <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </div>
            <div>
              <p className="font-semibold text-sm">
                {dealStatus === "confirmed"
                  ? "Complete"
                  : dealStatus === "voided"
                    ? "Cancelled"
                    : "Awaiting Signature"}
              </p>
              <p className="text-xs text-muted-foreground">
                {dealStatus === "confirmed"
                  ? "This deal is sealed and verified"
                  : dealStatus === "voided"
                    ? "This deal has been voided"
                    : "Waiting for recipient to sign"}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Compact inline version for headers
export function AuditStatusBadge({ logs }: { logs: AuditLogEntry[] }) {
  const eventCount = logs.length;
  const latestEvent = logs[0];

  return (
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <div className="flex -space-x-1">
        {logs.slice(0, 3).map((log, i) => {
          const config = eventConfig[log.eventType] || eventConfig.deal_created;
          const Icon = config.icon;
          return (
            <div
              key={log.id}
              className={`h-5 w-5 rounded-full flex items-center justify-center ${config.bgColor} border-2 border-background`}
              style={{ zIndex: 3 - i }}
            >
              <Icon className={`h-2.5 w-2.5 ${config.color}`} />
            </div>
          );
        })}
      </div>
      <span>
        {eventCount} event{eventCount !== 1 ? "s" : ""}
        {latestEvent && ` • Last: ${formatDateTime(latestEvent.createdAt)}`}
      </span>
    </div>
  );
}
