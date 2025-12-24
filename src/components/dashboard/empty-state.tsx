"use client";

import { ReactNode } from "react";
import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { dashboardStyles } from "@/lib/dashboard-ui";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(dashboardStyles.emptyState, className)}
    >
      <div className={dashboardStyles.emptyStateIcon}>
        <Icon className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className={dashboardStyles.emptyStateTitle}>{title}</h3>
      <p className={dashboardStyles.emptyStateDescription}>
        {description}
      </p>
      {action && (
        <div className="mt-4">
          {action}
        </div>
      )}
    </motion.div>
  );
}
