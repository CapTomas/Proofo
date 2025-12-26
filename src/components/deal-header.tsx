"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedLogo } from "@/components/animated-logo";
import { SidebarLogo } from "@/components/sidebar-logo";
import { useAppStore } from "@/store";
import {
  ArrowLeft,
  LayoutDashboard,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useSidebarAutoCollapse } from "@/hooks/useSidebarAutoCollapse";
import { NavBreadcrumbs } from "./nav-breadcrumbs";

// Magnetic Wrapper for header buttons
const HeaderMagneticWrapper = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * 0.15);
    y.set((clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
};

interface DealHeaderProps {
  title?: string;
  backHref?: string;
  showBack?: boolean;
  hideLogo?: boolean;
  homeHref?: string;
  breadcrumbItems?: { label: string; href?: string }[];
  mobileBreadcrumbItems?: { label: string; href?: string }[];
}

export function DealHeader({
  title,
  backHref = "/dashboard",
  showBack = true,
  hideLogo = false,
  homeHref = "/dashboard",
  breadcrumbItems,
  mobileBreadcrumbItems,
}: DealHeaderProps) {
  const { user, isSidebarCollapsed } = useAppStore();

  // Use shared auto-collapse logic
  useSidebarAutoCollapse();

  return (
    <header className="h-16 flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl z-30 sticky top-0 w-full supports-backdrop-filter:bg-background/60">
      <div className="h-full flex items-center justify-between gap-0">
        <div className="flex items-center h-full flex-1 min-w-0">
          {/* Logo Box - On pages with sidebar (hideLogo=true), show only on mobile.
              On all other pages, show on all screen sizes */}
          <div className={cn(hideLogo && "lg:hidden")}>
            <SidebarLogo
              isCollapsed={isSidebarCollapsed}
              hideBorder
              homeHref={homeHref}
              className="border-r border-border/40 bg-card/50 transition-all duration-300"
            />
          </div>

          {/* Responsive Breadcrumbs */}
          <div className="flex items-center px-4 sm:px-6 overflow-hidden">
            <NavBreadcrumbs customItems={breadcrumbItems} mobileItems={mobileBreadcrumbItems} />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3 px-4 sm:px-6 shrink-0 h-full border-l lg:border-l-0 border-border/40">
          <ThemeToggle />

          {/* Desktop Auth/Dashboard */}
          <div className="hidden sm:flex items-center gap-2">
            {showBack && (
              <Link href={backHref}>
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-sm font-medium h-9 text-muted-foreground hover:text-foreground gap-2 transition-colors"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {user ? "Back" : "Home"}
                </Button>
              </Link>
            )}

            <Link href={user ? "/dashboard" : "/login"}>
              <HeaderMagneticWrapper>
                <Button
                  size="sm"
                  className="h-9 gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 font-medium ml-1"
                >
                  {user ? (
                    <>
                      <LayoutDashboard className="h-4 w-4" />
                      Dashboard
                    </>
                  ) : (
                    <>
                      <User className="h-4 w-4" />
                      Log In
                    </>
                  )}
                </Button>
              </HeaderMagneticWrapper>
            </Link>
          </div>

          {/* Mobile Auth (Icons) */}
          <div className="sm:hidden flex items-center gap-1.5">
            {showBack && (
              <Link href={backHref}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:text-foreground transition-all"
                >
                  <ArrowLeft className="h-4 w-4" />
                  <span className="sr-only">Back</span>
                </Button>
              </Link>
            )}

            <Link href={user ? "/dashboard" : "/login"}>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl bg-secondary/50 text-foreground hover:bg-secondary/60 border border-transparent hover:border-border/30 transition-all backdrop-blur-sm"
              >
                {user ? <LayoutDashboard className="h-4 w-4" /> : <User className="h-4 w-4" />}
                <span className="sr-only">{user ? "Dashboard" : "Log In"}</span>
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </header>
  );
}
