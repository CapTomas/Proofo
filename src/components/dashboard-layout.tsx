"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/animated-logo";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Home,
  Settings,
  User,
  LogOut,
  Crown,
  LayoutTemplate,
  FileText,
  Inbox,
  Users,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { signOut, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "./dashboard-header";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/agreements", label: "Agreements", icon: FileText },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/people", label: "People", icon: Users },
  { href: "/dashboard/verify", label: "Verify", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, setDeals } = useAppStore();
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Handle client-side mounting and hydration
  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState) setIsCollapsed(savedState === "true");

    // Check if desktop
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', checkDesktop);
    };
  }, []);

  const toggleSidebar = () => {
    const newState = !isCollapsed;
    setIsCollapsed(newState);
    localStorage.setItem("sidebar-collapsed", String(newState));
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    if (typeof window !== "undefined") {
      localStorage.removeItem("proofo-storage");
    }
    setUser(null);
    setDeals([]);
    router.push("/");

    if (isSupabaseConfigured()) {
      signOut().catch((err) => console.error("Background signout error:", err));
    }
    setTimeout(() => setIsLoggingOut(false), 100);
  };

  const userName = user?.name || "Guest";
  const userInitials = userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
  const isPro = user?.isPro || false;

  const showUserSkeleton = !user && isHydrated;

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <AnimatedLogo size={48} className="text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        {/* Sidebar - Fixed Left */}
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? 80 : 280 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="hidden lg:flex flex-col border-r bg-card dark:bg-card/50 backdrop-blur-xl z-40 shrink-0"
        >
          {/* Logo Area */}
          <div className={cn(
            "h-16 flex items-center border-b border-border/40 transition-all duration-300 shrink-0",
            isCollapsed ? "justify-center px-0" : "justify-between px-6"
          )}>
            <Link href="/dashboard" className="flex items-center gap-3 group overflow-hidden">
              <AnimatedLogo size={isCollapsed ? 32 : 28} className="text-foreground shrink-0" />
              {!isCollapsed && (
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="font-bold text-lg tracking-tight whitespace-nowrap"
                >
                  Proofo
                </motion.span>
              )}
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            {navItems.map((item) => {
              const isActive = pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));
              const Icon = item.icon;

              if (isCollapsed) {
                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link href={item.href} className="flex justify-center">
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          size="icon"
                          className={cn(
                            "h-10 w-10 rounded-xl transition-all duration-200",
                            isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                          )}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="sr-only">{item.label}</span>
                        </Button>
                      </Link>
                    </TooltipTrigger>
                    <TooltipContent side="right" className="font-medium" sideOffset={10}>
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return (
                <Link key={item.href} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className={cn(
                      "w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl transition-all duration-200",
                      isActive && "bg-primary/10 text-primary hover:bg-primary/15"
                    )}
                  >
                    <Icon className="h-4.5 w-4.5 shrink-0" />
                    {item.label}
                    {isActive && (
                      <motion.div
                        layoutId="active-nav"
                        className="ml-auto w-1.5 h-1.5 rounded-full bg-primary"
                      />
                    )}
                  </Button>
                </Link>
              );
            })}
          </nav>

          {/* Footer Actions */}
          <div className="p-3 space-y-3 shrink-0">
            {/* Pro Banner */}
            {user && !isPro && (
              <div className={cn(
                "rounded-xl bg-linear-to-br from-primary/5 via-primary/10 to-transparent border border-primary/10 overflow-hidden transition-all duration-300",
                isCollapsed ? "p-2" : "p-4"
              )}>
                {isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="icon" variant="ghost" className="w-full h-8 hover:bg-primary/10">
                        <Crown className="h-4 w-4 text-primary" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Upgrade to Pro</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <div className="p-1.5 rounded-lg bg-background shadow-sm">
                        <Crown className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <span className="text-xs font-semibold">Pro Plan</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                      Unlock unlimited history & remove watermarks.
                    </p>
                    <Button size="sm" className="w-full h-8 text-xs shadow-sm bg-primary text-primary-foreground hover:opacity-90">
                      Upgrade
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* User Profile */}
            <div className="border-t border-border/40 pt-3">
              {showUserSkeleton ? (
                <div className={cn("flex items-center gap-2 rounded-xl p-2", isCollapsed && "justify-center")}>
                  <Skeleton className="h-8 w-8 rounded-full" />
                  {!isCollapsed && (
                    <div className="flex-1 space-y-1">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  )}
                </div>
              ) : !user ? (
                <div className={cn("flex items-center gap-2 rounded-xl p-2", isCollapsed && "justify-center")}>
                  <Link href="/login">
                    <Button variant="ghost" size="sm" className="w-full">
                      {isCollapsed ? <User className="h-4 w-4" /> : "Sign In"}
                    </Button>
                  </Link>
                </div>
              ) : (
                isCollapsed ? (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="w-full h-10 rounded-xl" onClick={handleLogout} disabled={isLoggingOut}>
                        <div className="h-6 w-6 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-[10px] text-primary-foreground font-bold">
                          {userInitials}
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      <p>{userName}</p>
                      <p className="text-xs text-muted-foreground">Click to log out</p>
                    </TooltipContent>
                  </Tooltip>
                ) : (
                  <div className="flex items-center justify-between gap-2 p-2 rounded-xl hover:bg-muted/50 transition-colors group">
                    <div className="flex items-center gap-3 overflow-hidden">
                      <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0 shadow-sm">
                        {userInitials}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{userName}</p>
                        <p className="text-xs text-muted-foreground truncate">{isPro ? "Pro Plan" : "Free Plan"}</p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={handleLogout}
                      disabled={isLoggingOut}
                      title="Log out"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              )}
            </div>

            {/* Collapse Toggle */}
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "w-full text-muted-foreground hover:text-foreground h-8",
                isCollapsed && "px-0"
              )}
              onClick={toggleSidebar}
            >
              {isCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <div className="flex items-center gap-2 text-xs">
                  <PanelLeftClose className="h-3.5 w-3.5" />
                  <span>Collapse</span>
                </div>
              )}
            </Button>
          </div>
        </motion.aside>

        {/* Main Content Column */}
        <div className="flex flex-col flex-1 min-w-0 h-full">
          {/* Static Header */}
          <DashboardHeader
            onMenuClick={() => setMobileMenuOpen(true)}
            isDesktop={isDesktop}
          />

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 lg:pb-8 w-full scroll-smooth">
            <div className="max-w-7xl mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {children}
              </motion.div>
            </div>
          </main>
        </div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="lg:hidden fixed inset-y-0 left-0 w-[280px] bg-card border-r z-50 flex flex-col"
              >
                <div className="h-16 flex items-center justify-between px-6 border-b shrink-0">
                  <Link href="/" className="flex items-center gap-2" onClick={() => setMobileMenuOpen(false)}>
                    <AnimatedLogo size={28} className="text-foreground" />
                    <span className="font-bold text-lg tracking-tight">Proofo</span>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setMobileMenuOpen(false)}
                    className="h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <nav className="flex-1 px-3 py-6 flex flex-col gap-1 overflow-y-auto">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link key={item.href} href={item.href} onClick={() => setMobileMenuOpen(false)}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl",
                            isActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" />
                          {item.label}
                        </Button>
                      </Link>
                    );
                  })}
                </nav>

                <div className="p-3 border-t space-y-3 shrink-0">
                  {user ? (
                    <>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0">
                            {userInitials}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{userName}</p>
                            <p className="text-xs text-muted-foreground">{isPro ? "Pro Plan" : "Free Plan"}</p>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                      >
                        <LogOut className="h-4 w-4" />
                        {isLoggingOut ? "Logging out..." : "Log out"}
                      </Button>
                    </>
                  ) : (
                    <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                      <Button variant="ghost" className="w-full justify-start gap-3">
                        <User className="h-4 w-4" />
                        Sign In
                      </Button>
                    </Link>
                  )}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </TooltipProvider>
  );
}
