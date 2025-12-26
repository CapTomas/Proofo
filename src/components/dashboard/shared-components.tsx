"use client";

import React, { useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Copy, Check, Clock, RefreshCw, CheckCircle2, XCircle, FileSignature } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dashboardStyles, getStatCardClass } from "@/lib/dashboard-ui";
import { DealStatus } from "@/types";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
export {
  StatCardSkeleton,
  DealRowSkeleton,
  CardSkeleton,
  SettingsHeaderSkeleton,
  SettingsTabsSkeleton,
  SettingsCardSkeleton,
  SettingsGroupSkeleton,
  SettingsProfileSkeleton,
} from "./skeleton-components";

// =============================================================================
// SHARED CONFIGURATION
// =============================================================================

/**
 * Unified status configuration for deals
 * Used across Dashboard Home, Agreements, and Inbox pages
 */
export interface StatusStyle {
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
  bg: string;
  border: string;
  badgeVariant: "warning" | "success" | "destructive" | "secondary" | "action" | "signed";
}

export const statusConfig: Record<DealStatus, StatusStyle> = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Clock,
    badgeVariant: "warning",
  },
  sealing: {
    label: "Sealing",
    color: "text-sky-600",
    bg: "bg-sky-500/10",
    border: "border-sky-500/20",
    icon: RefreshCw,
    badgeVariant: "secondary",
  },
  confirmed: {
    label: "Sealed",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
    badgeVariant: "success",
  },
  voided: {
    label: "Voided",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    icon: XCircle,
    badgeVariant: "destructive",
  },
};

/**
 * Gets the contextual status configuration for a deal based on the current user.
 * This differentiates between "Waiting for Others" and "Action Required".
 */
export function getDealStatusConfig(deal: any, userId?: string, userEmail?: string): StatusStyle {
  const baseConfig = statusConfig[deal.status as DealStatus] || statusConfig.pending;

  if (deal.status === "pending") {
    // If the current user is the recipient and hasn't signed yet (implied by pending)
    const isRecipient =
      (userId && deal.recipientId === userId) ||
      (userEmail && deal.recipientEmail?.toLowerCase() === userEmail.toLowerCase());

    if (isRecipient) {
      return {
        ...baseConfig,
        label: "Action Required",
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        icon: FileSignature,
        badgeVariant: "action",
      };
    } else {
      return {
        ...baseConfig,
        label: "Waiting",
      };
    }
  }

  if (deal.status === "confirmed") {
    const isRecipient =
      (userId && deal.recipientId === userId) ||
      (userEmail && deal.recipientEmail?.toLowerCase() === userEmail.toLowerCase());

    if (isRecipient) {
      return {
        ...baseConfig,
        label: "Signed",
        color: "text-sky-600 dark:text-sky-400",
        bg: "bg-sky-500/10",
        border: "border-sky-500/20",
        badgeVariant: "signed",
      };
    }
  }

  return baseConfig;
}

// =============================================================================
// SHARED HOOKS
// =============================================================================

/**
 * Hook to focus search input on "/" keypress
 * Used across all dashboard pages for consistent keyboard navigation
 */
export function useSearchShortcut(inputRef: React.RefObject<HTMLInputElement | null>) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== inputRef.current) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [inputRef]);
}

// =============================================================================
// SHARED DASHBOARD COMPONENTS
// =============================================================================

/**
 * KeyboardHint - Shows a keyboard shortcut hint (e.g., ⌘/)
 * Used in search bars across all dashboard pages
 */
export const KeyboardHint = ({
  shortcut = "/",
  showCommand = true,
  className,
}: {
  shortcut?: string;
  showCommand?: boolean;
  className?: string;
}) => (
  <div
    className={cn(
      "absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none",
      className
    )}
  >
    <kbd className={dashboardStyles.keyboardHint}>
      {showCommand && <span className="text-[15px] mr-1">⌘</span>}
      {shortcut}
    </kbd>
  </div>
);

/**
 * CopyableId - A badge that copies an ID to clipboard on click
 * Used across Agreements, Inbox, and Dashboard Home
 */
export const CopyableId = ({ id, className }: { id: string; className?: string }) => {
  const { copied, copyToClipboard } = useCopyToClipboard();

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    copyToClipboard(id);
  };

  return (
    <motion.div
      animate={copied ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.3, ease: "easeInOut" }}
    >
      <Badge
        variant="outline"
        className={cn(
          "font-mono cursor-pointer hover:bg-secondary/80 transition-colors group/id gap-1.5 h-5 px-1.5 text-[10px]",
          copied && "bg-emerald-500/10 border-emerald-500/30",
          className
        )}
        onClick={handleCopy}
        title="Click to copy Deal ID"
      >
        {id}
        <div className="relative w-3 h-3 flex items-center justify-center">
          {copied ? (
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 25 }}
            >
              <Check className="h-3 w-3 text-emerald-500" />
            </motion.div>
          ) : (
            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover/id:opacity-100 transition-opacity absolute inset-0" />
          )}
        </div>
      </Badge>
    </motion.div>
  );
};

/**
 * StatCard - Interactive stats card with optional active state
 * Used across Agreements, Inbox, People (clickable) and Dashboard Home (linkable with trend)
 */
interface StatCardProps {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
  colorClass?: string;
  delay?: number;
  // For clickable cards (Agreements, Inbox)
  isActive?: boolean;
  onClick?: () => void;
  // For linkable cards with trends (Dashboard Home)
  href?: string;
  trend?: string;
  trendDirection?: "up" | "down" | "neutral";
}

export const StatCard = ({
  label,
  value,
  icon: Icon,
  colorClass = "text-primary",
  delay = 0,
  isActive,
  onClick,
  href,
  trend,
  trendDirection = "neutral",
}: StatCardProps) => {
  const cardContent = (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className={cn(getStatCardClass(isActive ?? false), onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div
          className={cn(
            dashboardStyles.statCardIcon,
            isActive
              ? "bg-primary/10 text-primary"
              : `bg-secondary/50 group-hover:bg-primary/10 ${colorClass.replace("text-", "group-hover:text-")}`
          )}
        >
          <Icon
            className={cn(
              dashboardStyles.iconMd,
              "transition-colors",
              isActive ? "text-primary" : "text-muted-foreground group-hover:text-current"
            )}
          />
        </div>
        {trend && (
          <Badge
            variant="secondary"
            className={cn(
              "text-[10px] h-5 px-1.5 font-medium border-0",
              trendDirection === "up"
                ? "bg-emerald-500/10 text-emerald-600"
                : trendDirection === "down"
                  ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
                  : "bg-muted text-muted-foreground"
            )}
          >
            {trend}
          </Badge>
        )}
      </div>
      <div>
        <AnimatedValue value={value} delay={delay} className={dashboardStyles.statCardValue} />
        <p className={dashboardStyles.statCardLabel}>{label}</p>
      </div>
    </motion.div>
  );

  if (href) {
    return (
      <Link href={href} className="block h-full">
        {cardContent}
      </Link>
    );
  }

  return cardContent;
};

/**
 * AnimatedValue - Animates a number counting up from 0
 * Handles both pure numbers and strings with numbers (like "23%")
 */
const AnimatedValue = ({
  value,
  delay = 0,
  className,
}: {
  value: string | number;
  delay?: number;
  className?: string;
}) => {
  const [displayValue, setDisplayValue] = React.useState<string | number>(
    typeof value === "number" ? 0 : value
  );

  React.useEffect(() => {
    // Parse the target number from the value
    const strValue = String(value);
    const numericMatch = strValue.match(/^([~]?)(\d+(?:\.\d+)?)/);

    if (!numericMatch) {
      setDisplayValue(value);
      return;
    }

    const prefix = numericMatch[1] || "";
    const suffix = strValue.slice(numericMatch[0].length);
    const targetNum = parseFloat(numericMatch[2]);

    if (isNaN(targetNum) || targetNum === 0) {
      setDisplayValue(value);
      return;
    }

    // Animation timing
    const startDelay = delay * 1000 + 100;
    const duration = 600;
    const startTime = Date.now() + startDelay;

    const animate = () => {
      const now = Date.now();
      if (now < startTime) {
        setDisplayValue(`${prefix}0${suffix}`);
        requestAnimationFrame(animate);
        return;
      }

      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(targetNum * eased);

      setDisplayValue(`${prefix}${current}${suffix}`);

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value, delay]);

  return <div className={className}>{displayValue}</div>;
};

// Skeletons are now re-exported from ./skeleton-components.tsx

/**
 * HighlightText - Highlights search query matches in text
 * Used in Templates and People pages
 */
export const HighlightText = ({
  text,
  query,
  className,
}: {
  text: string;
  query: string;
  className?: string;
}) => {
  if (!query) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${query})`, "gi"));
  return (
    <span className={className}>
      {parts.map((part, i) =>
        part.toLowerCase() === query.toLowerCase() ? (
          <span key={i} className="bg-primary/20 text-foreground rounded-xs px-0.5 font-medium">
            {part}
          </span>
        ) : (
          part
        )
      )}
    </span>
  );
};
