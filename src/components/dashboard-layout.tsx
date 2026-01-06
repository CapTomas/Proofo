"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/animated-logo";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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
import { SidebarLogo } from "./sidebar-logo";
import { SidebarNavItem } from "./sidebar-nav-item";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { signOut, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import { DashboardHeader } from "./dashboard-header";
import { ErrorBoundary } from "./error-boundary";

import { useSidebarAutoCollapse } from "@/hooks/useSidebarAutoCollapse";
import { isStaleDeal } from "@/lib/dashboard-ui";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/agreements", label: "Agreements", icon: FileText },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/dashboard/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/people", label: "People", icon: Users },
  { href: "/dashboard/verify", label: "Verify", icon: Shield },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const {
    user,
    setUser,
    deals,
    setDeals,
    isSidebarCollapsed,
    setIsSidebarCollapsed,
    setSidebarUserPreference,
  } = useAppStore();

  // Use shared auto-collapse logic
  useSidebarAutoCollapse();

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  // Handle client-side mounting and hydration
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);

    // Check if desktop
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener("resize", checkDesktop);

    const timer = setTimeout(() => {
      setIsHydrated(true);
    }, 50);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("resize", checkDesktop);
    };
  }, []);

  const toggleSidebar = () => {
    const newState = !isSidebarCollapsed;
    setIsSidebarCollapsed(newState);
    // When user manually toggles, save their preference
    setSidebarUserPreference(newState ? "collapsed" : "expanded");
  };

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);

    // Clear local state first
    if (typeof window !== "undefined") {
      localStorage.removeItem("proofo-storage");
    }
    setUser(null);
    setDeals([]);

    // CRITICAL: Wait for Supabase signOut to complete BEFORE redirecting
    // This ensures auth cookies are cleared before navigation
    if (isSupabaseConfigured()) {
      try {
        await signOut();
      } catch (err) {
        console.error("Signout error:", err);
      }
    }

    // Only redirect after session is fully cleared
    router.push("/");
    setTimeout(() => setIsLoggingOut(false), 100);
  };

  const hasInboxNotifications = React.useMemo(() => {
    return deals.some(
      (d) =>
        ((user?.id && d.recipientId === user.id) || (user?.email && d.recipientEmail?.toLowerCase() === user.email.toLowerCase())) &&
        d.status === "pending"
    );
  }, [deals, user]);

  const hasAgreementsNotifications = React.useMemo(() => {
    return deals.some(
      (d) =>
        d.creatorId === user?.id &&
        !((user?.id && d.recipientId === user.id) || (user?.email && d.recipientEmail?.toLowerCase() === user.email?.toLowerCase())) &&
        isStaleDeal(d) &&
        d.status === "pending"
    );
  }, [deals, user]);

  const userName = user?.name || "Guest";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
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
          animate={{ width: isSidebarCollapsed ? 80 : 280 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="hidden lg:flex flex-col border-r bg-card dark:bg-card/50 backdrop-blur-xl z-40 shrink-0"
        >
          {/* Logo Area */}
          <SidebarLogo isCollapsed={isSidebarCollapsed} />


          {/* Navigation */}
          <nav className="flex-1 px-3 py-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar relative">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href));

              return (
                <SidebarNavItem
                  key={item.href}
                  label={item.label}
                  icon={item.icon}
                  href={item.href}
                  isActive={isActive}
                  isCollapsed={isSidebarCollapsed}
                  showDot={false}
                  hasNotification={
                    (item.label === "Inbox" && hasInboxNotifications) ||
                    (item.label === "Agreements" && hasAgreementsNotifications)
                  }
                  notificationColor={item.label === "Agreements" ? "amber" : "rose"}
                />
              );
            })}

            {/* Active indicator dot - single element that travels between items */}
            {!isSidebarCollapsed && (() => {
              const activeIndex = navItems.findIndex((item) =>
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(item.href))
              );
              if (activeIndex === -1) return null;
              // Each nav item is h-10 (40px) + gap-1 (4px)
              const itemHeight = 44;
              const navPaddingTop = 24; // py-6 = 24px
              const dotY = navPaddingTop + activeIndex * itemHeight + 20; // Center in the item (h-10/2 = 20px)
              return (
                <motion.div
                  // right-6 = nav px-3 (12px) + button internal px-3 (12px) = 24px = right-6
                  className="absolute right-6 w-1.5 h-1.5 rounded-full bg-primary pointer-events-none"
                  initial={false}
                  animate={{ top: dotY }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  style={{ marginTop: -3 }} // Center the dot vertically (1.5/2 = ~3px)
                />
              );
            })()}
          </nav>

          {/* Footer Actions */}
          <div className="p-3 space-y-3 shrink-0">
            {/* Pro Banner */}
            {user && !isPro && (
              <div
                className={cn(
                  "rounded-xl bg-linear-to-br from-primary/5 via-primary/10 to-transparent border border-primary/10 transition-all duration-300 overflow-hidden",
                  isSidebarCollapsed ? "p-0" : "px-3 py-4"
                )}
              >
                {isSidebarCollapsed ? (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        className="w-full h-10 hover:bg-primary/10 rounded-xl justify-start px-3"
                      >
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          <Crown className="h-4 w-4 text-primary" />
                        </div>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Upgrade to Pro</TooltipContent>
                  </Tooltip>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <div className="p-1.5 rounded-lg bg-background shadow-sm">
                          <Crown className="h-3.5 w-3.5 text-primary" />
                        </div>
                      </div>
                      <span className="text-xs font-semibold">Pro Plan</span>
                    </div>
                    <div className="pl-11">
                      <p className="text-[10px] text-muted-foreground mb-3 leading-relaxed">
                        Unlock unlimited history & remove watermarks.
                      </p>
                      <Button
                        size="sm"
                        className="w-full h-8 text-xs shadow-sm bg-primary text-primary-foreground hover:opacity-90 rounded-lg"
                      >
                        Upgrade
                      </Button>
                    </div>
                  </>
                )}
              </div>
            )}

            {/* User Profile */}
            <div className="border-t border-border/40 pt-3">
              {showUserSkeleton ? (
                <div className="flex items-center h-10 px-3">
                  <div className="w-8 h-8 flex items-center justify-center shrink-0">
                    <Skeleton className="h-8 w-8 rounded-full" />
                  </div>
                  {!isSidebarCollapsed && (
                    <div className="flex-1 space-y-1 ml-3">
                      <Skeleton className="h-3 w-20" />
                      <Skeleton className="h-2 w-16" />
                    </div>
                  )}
                </div>
              ) : !user ? (
                <SidebarNavItem
                  label="Sign In"
                  icon={User}
                  href="/login"
                  isCollapsed={isSidebarCollapsed}
                />
              ) : (
                <div className={cn(
                  "flex items-center rounded-xl transition-all duration-200 group overflow-hidden",
                  !isSidebarCollapsed && "hover:bg-muted/50"
                )}>
                  {isSidebarCollapsed ? (
                    <Tooltip delayDuration={0}>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          className="w-full h-10 rounded-xl justify-start px-3"
                          onClick={handleLogout}
                          disabled={isLoggingOut}
                        >
                          <div className="w-8 h-8 flex items-center justify-center shrink-0">
                            <div className="h-7 w-7 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-[10px] text-primary-foreground font-bold overflow-hidden shadow-sm">
                              {user.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={user.avatarUrl}
                                  alt={userName}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                userInitials
                              )}
                            </div>
                          </div>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>{userName}</p>
                        <p className="text-xs text-muted-foreground">Click to log out</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <>
                      <div className="flex items-center flex-1 min-w-0 px-3 h-10">
                        <div className="w-8 h-8 flex items-center justify-center shrink-0">
                          <div className="h-7 w-7 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-[10px] text-primary-foreground font-bold overflow-hidden shadow-sm">
                            {user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.avatarUrl}
                                alt={userName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              userInitials
                            )}
                          </div>
                        </div>
                        <div className="ml-3 min-w-0">
                          <p className="text-sm font-medium truncate">{userName}</p>
                          <p className="text-xs text-muted-foreground truncate">
                            {isPro ? "Pro Plan" : "Free Plan"}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive shrink-0 mr-2"
                        onClick={handleLogout}
                        disabled={isLoggingOut}
                        title="Log out"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                      </Button>
                    </>
                  )}
                </div>
              )}
            </div>




            {/* Collapse Toggle */}
            <div className="border-t border-border/40 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-10 px-3 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200"
                onClick={toggleSidebar}
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="h-4.5 w-4.5" />
                  ) : (
                    <PanelLeftClose className="h-4.5 w-4.5" />
                  )}
                </div>
                <AnimatePresence mode="popLayout">
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="ml-3 text-sm font-medium"
                    >
                      Collapse
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>
          </div>
        </motion.aside>

        {/* Main Content Column */}
        <div className="flex flex-col flex-1 min-w-0 h-full">
          {/* Static Header */}
          <DashboardHeader onMenuClick={() => setMobileMenuOpen(true)} isDesktop={isDesktop} />

          {/* Scrollable Content Area */}
          <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 lg:pb-8 w-full scroll-smooth">
            <div className="max-w-7xl mx-auto w-full">
              <ErrorBoundary showHomeButton>
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  {children}
                </motion.div>
              </ErrorBoundary>
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
                  <Link
                    href="/"
                    className="flex items-center gap-2"
                    onClick={() => setMobileMenuOpen(false)}
                  >
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
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/dashboard" && pathname.startsWith(item.href));
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className={cn(
                            "w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl",
                            isActive && "bg-primary/10 text-primary"
                          )}
                        >
                          <Icon className="h-4.5 w-4.5 shrink-0" />
                          {item.label}
                          {item.label === "Inbox" && hasInboxNotifications && (
                            <span className="ml-auto w-2 h-2 bg-rose-500 rounded-full" />
                          )}
                          {item.label === "Agreements" && hasAgreementsNotifications && (
                            <span className="ml-auto w-2 h-2 bg-amber-500 rounded-full" />
                          )}
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
                          <div className="h-8 w-8 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0 shadow-sm overflow-hidden">
                            {user.avatarUrl ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={user.avatarUrl}
                                alt={userName}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              userInitials
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{userName}</p>
                            <p className="text-xs text-muted-foreground">
                              {isPro ? "Pro Plan" : "Free Plan"}
                            </p>
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
