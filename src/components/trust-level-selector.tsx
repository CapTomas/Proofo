"use client";

import { TrustLevel } from "@/types";
import { cn } from "@/lib/utils";
import { Mail, Phone, ShieldCheck, Zap, Lock, BadgeCheck } from "lucide-react";
import { motion } from "framer-motion";
import { Badge } from "@/components/ui/badge";

interface TrustLevelSelectorProps {
  value: TrustLevel;
  onChange: (level: TrustLevel) => void;
  disabled?: boolean;
  className?: string;
}

interface TrustLevelConfig {
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
  borderColor: string;
  verifications: string[];
  recommended?: boolean;
  disabled?: boolean;
  comingSoon?: boolean;
}

export const trustLevelConfig: Record<TrustLevel, TrustLevelConfig> = {
  basic: {
    label: "Basic",
    description: "No verification required",
    icon: Zap,
    color: "text-muted-foreground",
    bgColor: "bg-muted/50",
    borderColor: "border-border",
    verifications: [],
  },
  verified: {
    label: "Verified",
    description: "Email verification",
    icon: Mail,
    color: "text-blue-600",
    bgColor: "bg-blue-500/5",
    borderColor: "border-blue-500/30",
    verifications: ["Email OTP"],
  },
  strong: {
    label: "Strong",
    description: "Email + Phone verification",
    icon: Phone,
    color: "text-amber-600",
    bgColor: "bg-amber-500/5",
    borderColor: "border-amber-500/30",
    verifications: ["Email OTP", "Phone OTP"],
  },
  maximum: {
    label: "Maximum",
    description: "Full identity verification",
    icon: Lock,
    color: "text-red-600",
    bgColor: "bg-red-500/5",
    borderColor: "border-red-500/30",
    verifications: ["Email OTP", "Phone OTP", "ID Upload"],
    disabled: true,
    comingSoon: true,
  },
};

const levels: TrustLevel[] = ["basic", "verified", "strong", "maximum"];

export function TrustLevelSelector({
  value,
  onChange,
  disabled = false,
  className,
}: TrustLevelSelectorProps) {
  return (
    <div className={cn("space-y-3", className)}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {levels.map((level) => {
          const config = trustLevelConfig[level];
          const isSelected = value === level;
          const isDisabled = disabled || config.disabled;
          const Icon = config.icon;

          return (
            <button
              key={level}
              type="button"
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(level)}
              className={cn(
                "relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200",
                "hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                isSelected
                  ? cn(config.borderColor, config.bgColor, "shadow-sm")
                  : "border-border bg-background hover:border-muted-foreground/30",
                isDisabled && "opacity-50 cursor-not-allowed hover:shadow-none hover:border-border"
              )}
            >
              {/* Recommended Badge */}
              {config.recommended && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 px-1.5 text-[8px] font-bold uppercase tracking-wider bg-blue-500/10 text-blue-600 border-blue-500/20"
                >
                  Rec
                </Badge>
              )}

              {/* Coming Soon Badge */}
              {config.comingSoon && (
                <Badge
                  variant="secondary"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 h-4 px-1.5 text-[8px] font-bold uppercase tracking-wider bg-muted text-muted-foreground"
                >
                  Soon
                </Badge>
              )}

              {/* Icon */}
              <div
                className={cn(
                  "h-8 w-8 rounded-lg flex items-center justify-center transition-colors",
                  isSelected ? config.bgColor : "bg-muted/50"
                )}
              >
                <Icon
                  className={cn(
                    "h-4 w-4 transition-colors",
                    isSelected ? config.color : "text-muted-foreground"
                  )}
                />
              </div>

              {/* Label */}
              <span
                className={cn(
                  "text-xs font-semibold transition-colors",
                  isSelected ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {config.label}
              </span>

              {/* Selection Indicator */}
              {isSelected && (
                <motion.div
                  layoutId="trust-level-indicator"
                  className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-6 h-1 rounded-full bg-current"
                  style={{ color: "hsl(var(--primary))" }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <div className="text-center">
        <p className="text-xs text-muted-foreground">
          {trustLevelConfig[value].description}
          {trustLevelConfig[value].verifications.length > 0 && (
            <span className="block mt-1 text-[10px] opacity-70">
              Recipient must verify: {trustLevelConfig[value].verifications.join(" → ")}
            </span>
          )}
        </p>
      </div>
    </div>
  );
}
