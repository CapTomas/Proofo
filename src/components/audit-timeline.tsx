"use client";

import { motion } from "framer-motion";
import { AuditLogEntry, DealStatus } from "@/types";
import { formatDateTime } from "@/lib/crypto";
import {
  FileCheck,
  Eye,
  PenLine,
  CheckCircle2,
  XCircle,
  Mail,
  FileText,
} from "lucide-react";

interface AuditTimelineProps {
  logs: AuditLogEntry[];
  dealStatus?: DealStatus;
  className?: string;
  compact?: boolean;
}

// Event type configuration
const eventConfig = {
  deal_created: {
    label: "Deal Created",
    icon: FileCheck,
    color: "text-primary",
    bgColor: "bg-primary/10",
    description: "Agreement was created and shared",
  },
  deal_viewed: {
    label: "Deal Viewed",
    icon: Eye,
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    description: "Recipient opened the deal link",
  },
  deal_signed: {
    label: "Signature Added",
    icon: PenLine,
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    description: "Recipient drew their signature",
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
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
    description: "Receipt was emailed to recipient",
  },
  pdf_generated: {
    label: "PDF Generated",
    icon: FileText,
    color: "text-purple-600",
    bgColor: "bg-purple-500/10",
    description: "PDF receipt was generated",
  },
};

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

export function AuditTimeline({ logs, dealStatus, className = "", compact = false }: AuditTimelineProps) {
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
    <div className={`relative ${className}`}>
      {/* Timeline line */}
      <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-border" />

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
              className="relative pl-10"
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
                    {config.description}
                  </p>
                )}
                {!compact && log.metadata && Object.keys(log.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-muted-foreground bg-muted/50 rounded px-2 py-1">
                    {Object.entries(log.metadata).slice(0, 3).map(([key, value]) => (
                      <span key={key} className="mr-3">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}

        {/* Status indicator at the end */}
        {dealStatus && (
          <div className="relative pl-10">
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
export function AuditStatusBadge({ logs, dealStatus }: { logs: AuditLogEntry[]; dealStatus: DealStatus }) {
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
