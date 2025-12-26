"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { LucideIcon } from "lucide-react";

interface SidebarNavItemProps {
  label: string;
  icon?: LucideIcon;
  href?: string;
  onClick?: () => void;
  isActive?: boolean;
  isCollapsed: boolean;
  badge?: React.ReactNode;
  children?: React.ReactNode;
  variant?: "ghost" | "secondary";
  className?: string;
  /* For agreement steps */
  isCompleted?: boolean;
  index?: number;
  showDot?: boolean;
  hasNotification?: boolean;
  notificationColor?: "rose" | "amber";
}

export function SidebarNavItem({
  label,
  icon: Icon,
  href,
  onClick,
  isActive,
  isCollapsed,
  badge,
  children,
  variant = "ghost",
  className,
  isCompleted,
  index,
  showDot,
  hasNotification,
  notificationColor = "rose",
}: SidebarNavItemProps) {
  const content = (
    <Button
      variant={isActive || variant === "secondary" ? "secondary" : "ghost"}
      className={cn(
        "w-full justify-start h-10 px-3 rounded-xl transition-all duration-200 group overflow-hidden relative",
        isActive && "bg-primary/10 text-primary hover:bg-primary/15",
        className
      )}
      onClick={onClick}
    >
      {/* Icon/Number Container - Fixed Width to anchor center at 40px */}
      <div className="w-8 h-8 flex items-center justify-center shrink-0">
        {Icon ? (
          <div className="relative">
            <Icon className={cn("h-4.5 w-4.5 transition-colors", isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
            {hasNotification && (
              <motion.span
                className={cn(
                  "absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full border-2 border-background",
                  notificationColor === "amber" ? "bg-amber-500" : "bg-rose-500"
                )}
                animate={{
                  scale: [1, 1.2, 1],
                  opacity: [1, 0.8, 1],
                }}
                transition={{
                  duration: 2,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            )}
          </div>
        ) : typeof index === "number" ? (
          <div className={cn(
            "h-5 w-5 flex items-center justify-center text-xs font-medium shrink-0 transition-all",
            isActive ? "text-primary" :
            isCompleted ? "text-emerald-500" : "text-muted-foreground"
          )}>
             {isCompleted && children ? children : <span>{index + 1}</span>}
          </div>
        ) : null}
      </div>

      <AnimatePresence mode="popLayout">
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex items-center flex-1 min-w-0 ml-3"
          >
            <span className="text-sm font-medium truncate">{label}</span>
            {badge && <div className="ml-auto">{badge}</div>}
          </motion.div>
        )}
      </AnimatePresence>
    </Button>
  );

  const wrapper = href ? (
    <Link href={href} className="w-full">
      {content}
    </Link>
  ) : (
    content
  );

  if (isCollapsed) {
    return (
      <Tooltip delayDuration={0}>
        <TooltipTrigger asChild>{wrapper}</TooltipTrigger>
        <TooltipContent side="right" className="font-medium" sideOffset={10}>
          {label}
        </TooltipContent>
      </Tooltip>
    );
  }

  return wrapper;
}
