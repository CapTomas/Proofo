wholefile:
"use client";

import { useState, useEffect } from "react";
import * as React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
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
  ChevronLeft,
  Crown,
  LayoutTemplate,
  RefreshCw,
  FileText,
  Inbox,
  Users,
  Shield,
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  ChevronRight,
  Search,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { signOut, isSupabaseConfigured } from "@/lib/supabase";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/dashboard/agreements", label: "Agreements", icon: FileText },
  { href: "/dashboard/inbox", label: "Inbox", icon: Inbox },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/dashboard/people", label: "People", icon: Users },
  { href: "/verify", label: "Verify", icon: Shield },
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

  // Determine if "New Deal" button should be shown based on current path
  const showNewDealButton = !["/settings", "/templates", "/verify"].some(path => pathname.startsWith(path));

  // Handle client-side mounting and hydration
  useEffect(() => {
    setMounted(true);
    const savedState = localStorage.getItem("sidebar-collapsed");
    if (savedState) setIsCollapsed(savedState === "true");

    // Check if desktop
    const checkDesktop = () => setIsDesktop(window.innerWidth >= 1024);
    checkDesktop();
    window.addEventListener('resize', checkDesktop);

    // Give Zustand time to rehydrate from localStorage
    // This is a small delay to let the persisted state load
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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isCollapsed]);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (isSupabaseConfigured()) {
        await signOut();
      }
      setUser(null);
      setDeals([]);
      if (typeof window !== "undefined") {
        localStorage.removeItem("proofo-storage");
      }
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Show loading state during server rendering or before hydration
  const isLoading = !mounted || !isHydrated;

  const userName = user?.name || "Guest";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPro = user?.isPro || false;

  const breadcrumbs = pathname
    .split("/")
    .filter(Boolean)
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1));

  // If not mounted yet, render a minimal shell to prevent hydration issues
  if (!mounted) {
    return (
      <div className="min-h-screen bg-background flex">
        <div className="flex-1 flex items-center justify-center">
          <div className="animate-pulse">
            <AnimatedLogo size={48} className="text-muted-foreground" />
          </div>
        </div>
      </div>
    );
  }

  // Show skeleton for user profile area while user data is loading
  const showUserSkeleton = !user && isHydrated;

  return (
    <TooltipProvider delayDuration={0}>
      <div className="min-h-screen bg-background flex overflow-hidden">
        {/* Sidebar */}
        <motion.aside
          initial={false}
          animate={{ width: isCollapsed ? 80 : 280 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="hidden lg:flex flex-col fixed inset-y-0 z-40 border-r bg-card/50 backdrop-blur-xl"
        >
          {/* Logo Area */}
          <div className={cn(
            "h-16 flex items-center border-b border-border/40 transition-all duration-300",
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
          <div className="p-3 space-y-3">
            {/* Pro Banner */}
            {user && !isPro && (
              <div className={cn(
                "rounded-xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/10 overflow-hidden transition-all duration-300",
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
                // Skeleton Loader for User Profile while loading
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
                // No user after hydration - show login link
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
                      <Button variant="ghost" size="icon" className="w-full h-10 rounded-xl" onClick={handleLogout}>
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-[10px] text-primary-foreground font-bold">
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
                      <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0 shadow-sm">
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

        {/* Main Content Wrapper */}
        <motion.div
          className="flex-1 flex flex-col min-w-0"
          animate={{ paddingLeft: isDesktop ? (isCollapsed ? 80 : 280) : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          <div className="lg:pl-0 w-full">
            {/* Top Header */}
            <header className="h-16 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-8 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all supports-[backdrop-filter]:bg-background/60">
              {/* Mobile Logo & Breadcrumbs */}
              <div className="flex items-center gap-4 flex-1">
                <div className="lg:hidden flex items-center gap-2 mr-2">
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <AnimatedLogo size={24} className="text-foreground" />
                    <span className="font-bold text-base tracking-tight">Proofo</span>
                  </Link>
                </div>

                {/* Breadcrumbs */}
                <nav className="hidden sm:flex items-center text-sm">
                  <div className="h-4 w-[1px] bg-border/60 mx-3 rotate-[15deg]" />
                  <div className="flex items-center text-muted-foreground">
                    {breadcrumbs.length === 0 ? (
                      <span className="text-foreground font-medium">Dashboard</span>
                    ) : (
                      breadcrumbs.map((crumb, index) => (
                        <React.Fragment key={crumb}>
                          {index > 0 && <ChevronRight className="h-3.5 w-3.5 mx-1.5 opacity-40" />}
                          <span className={cn(
                            "transition-colors",
                            index === breadcrumbs.length - 1
                              ? "font-medium text-foreground"
                              : "hover:text-foreground/80"
                          )}>
                            {crumb}
                          </span>
                        </React.Fragment>
                      ))
                    )}
                  </div>
                </nav>
              </div>

              {/* Right Actions */}
              <div className="flex items-center gap-2 sm:gap-3">
                <Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground hidden sm:flex hover:bg-muted/50">
                  <Search className="h-4 w-4" />
                </Button>

                <ThemeToggle />

                {showNewDealButton && (
                  <Link href="/deal/new">
                    <Button size="sm" className="h-9 gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95">
                      <Plus className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline font-medium">New Deal</span>
                    </Button>
                  </Link>
                )}
              </div>
            </header>

            {/* Page Content */}
            <main className="p-4 sm:p-8 pb-20 lg:pb-8 max-w-7xl mx-auto w-full">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                {children}
              </motion.div>
            </main>
          </div>
        </motion.div>

        {/* Mobile Menu Drawer */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <>
              {/* Backdrop */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setMobileMenuOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
              />
              {/* Drawer */}
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 30, stiffness: 300 }}
                className="lg:hidden fixed inset-y-0 left-0 w-[280px] bg-card border-r z-50 flex flex-col"
              >
                {/* Header */}
                <div className="h-16 flex items-center justify-between px-6 border-b">
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

                {/* Navigation */}
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

                {/* Footer with User & Logout */}
                <div className="p-3 border-t space-y-3">
                  {user ? (
                    <>
                      <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-muted/50">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-xs text-primary-foreground font-bold shrink-0">
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

        {/* Mobile Bottom Nav */}
        <div className="lg:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t z-30 flex items-center justify-around">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="flex flex-col items-center justify-center gap-1 h-full text-muted-foreground hover:text-foreground hover:bg-transparent flex-1"
          >
            <Menu className="h-5 w-5" />
            <span className="text-[10px] font-medium">Menu</span>
          </Button>
          {[navItems[0], navItems[1], navItems[2]].map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href} className="flex-1">
                <div className={cn(
                  "flex flex-col items-center justify-center h-full py-1 gap-1 text-[10px] font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}>
                  <Icon className={cn("h-5 w-5", isActive && "fill-primary/20")} />
                  <span>{item.label}</span>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </TooltipProvider>
  );
}
