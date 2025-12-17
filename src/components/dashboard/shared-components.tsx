"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dashboardStyles, getStatCardClass } from "@/lib/dashboard-ui";

// =============================================================================
// SHARED DASHBOARD COMPONENTS
// =============================================================================

/**
 * CopyableId - A badge that copies an ID to clipboard on click
 * Used across Agreements, Inbox, and Dashboard Home
 */
export const CopyableId = ({ id, className }: { id: string; className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Badge
      variant="outline"
      className={cn(
        "font-mono cursor-pointer hover:bg-secondary/80 transition-colors group/id gap-1.5 h-5 px-1.5 text-[10px]",
        className
      )}
      onClick={handleCopy}
      title="Click to copy Deal ID"
    >
      {id}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover/id:opacity-100 transition-opacity" />
      )}
    </Badge>
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
      className={cn(
        getStatCardClass(isActive ?? false),
        onClick && "cursor-pointer"
      )}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-2">
        <div className={cn(
          dashboardStyles.statCardIcon,
          isActive
            ? "bg-primary/10 text-primary"
            : `bg-secondary/50 group-hover:bg-primary/10 ${colorClass.replace('text-', 'group-hover:text-')}`
        )}>
          <Icon className={cn(
            dashboardStyles.iconMd,
            "transition-colors",
            isActive ? "text-primary" : "text-muted-foreground group-hover:text-current"
          )} />
        </div>
        {trend && (
          <Badge variant="secondary" className={cn(
            "text-[10px] h-5 px-1.5 font-medium border-0",
            trendDirection === "up" ? "bg-emerald-500/10 text-emerald-600" :
            trendDirection === "down" ? "bg-amber-500/10 text-amber-600" :
            "bg-muted text-muted-foreground"
          )}>
            {trend}
          </Badge>
        )}
      </div>
      <div>
        <div className={dashboardStyles.statCardValue}>
          {value}
        </div>
        <p className={dashboardStyles.statCardLabel}>
          {label}
        </p>
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
 * HighlightText - Highlights search query matches in text
 * Used in Templates and People pages
 */
export const HighlightText = ({
  text,
  query,
  className
}: {
  text: string;
  query: string;
  className?: string;
}) => {
  if (!query) return <span className={className}>{text}</span>;

  const parts = text.split(new RegExp(`(${query})`, 'gi'));
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
