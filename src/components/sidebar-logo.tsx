"use client";

import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { AnimatedLogo } from "./animated-logo";
import { cn } from "@/lib/utils";

import { useAppStore } from "@/store";

interface SidebarLogoProps {
  isCollapsed: boolean;
  className?: string;
  hideBorder?: boolean;
  homeHref?: string;
}

export function SidebarLogo({ isCollapsed, className, hideBorder, homeHref }: SidebarLogoProps) {
  const { user } = useAppStore();
  const effectiveHomeHref = homeHref || (user ? "/dashboard" : "/");
  const text = "Proofo";
  const letters = text.split("");

  // Letter animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
    exit: {
      opacity: 0,
      transition: {
        staggerChildren: 0.02,
        staggerDirection: -1 as const,
      },
    },
  };

  const letterVariants = {
    hidden: { opacity: 0, x: -5 },
    visible: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -5 },
  };

  return (
    <motion.div
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className={cn(
        "h-16 flex items-center shrink-0 px-6 overflow-hidden",
        !hideBorder && "border-b border-border/40",
        className
      )}
    >
      <Link href={effectiveHomeHref} className="flex items-center gap-3 group overflow-hidden">
        {/*
          Fixed size logo to prevent "movement" during scale transitions.
          The px-6 (24px) in expanded mode matches the centered position
          in 80px collapsed mode ( (80-32)/2 = 24px ).
        */}
        <div className="w-8 h-8 flex items-center justify-center shrink-0">
          <AnimatedLogo size={32} className="text-foreground" />
        </div>

        <AnimatePresence mode="popLayout">
          {!isCollapsed && (
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              className="flex font-bold text-xl tracking-tight whitespace-nowrap"
            >
              {letters.map((letter, index) => (
                <motion.span
                  key={`${letter}-${index}`}
                  variants={letterVariants}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                >
                  {letter}
                </motion.span>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </Link>
    </motion.div>
  );
}
