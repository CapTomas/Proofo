"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Plus,
  Home,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Crown,
  LayoutTemplate,
  FileCheck,
  Inbox,
  Users,
  Shield,
  RefreshCw,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { signOut, isSupabaseConfigured } from "@/lib/supabase";

interface NavItem {
  href: string;
  label: string;
  icon: typeof Home;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Home", icon: Home },
  { href: "/agreements", label: "Agreements", icon: FileCheck },
  { href: "/inbox", label: "Inbox", icon: Inbox },
  { href: "/templates", label: "Templates", icon: LayoutTemplate },
  { href: "/people", label: "People", icon: Users },
  { href: "/verify", label: "Verify", icon: Shield },
  { href: "/settings", label: "Settings", icon: Settings },
];

interface DashboardLayoutProps {
  children: React.ReactNode;
  title: string;
  showNewDealButton?: boolean;
}

export function DashboardLayout({ children, title, showNewDealButton = true }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, setDeals } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close user menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle logout
  const handleLogout = useCallback(async () => {
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
  }, [router, setUser, setDeals]);

  const userName = user?.name || "Guest";
  const userInitials = userName
    .split(" ")
    .filter((n) => n.length > 0)
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPro = user?.isPro || false;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-56 flex-col fixed inset-y-0 z-40 border-r bg-background">
        {/* Logo */}
        <div className="h-14 flex items-center px-4 border-b">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
              <span className="text-background font-semibold text-xs">P</span>
            </div>
            <span className="font-semibold">Proofo</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={isActive ? "secondary" : "ghost"}
                  className="w-full justify-start gap-2 h-9 text-sm"
                >
                  <Icon className="h-4 w-4" />
                  {item.label}
                </Button>
              </Link>
            );
          })}
        </nav>

        {/* Pro Upgrade Banner */}
        {!isPro && (
          <div className="px-3 pb-3">
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Go Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Remove watermarks & keep deals forever
              </p>
              <Button size="sm" className="w-full h-7 text-xs">
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {/* User Menu */}
        <div className="p-3 border-t" ref={userMenuRef}>
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors"
              aria-expanded={showUserMenu}
              aria-haspopup="menu"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {userInitials || "G"}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{isPro ? "Pro" : "Free"}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-0 right-0 mb-1 p-1 bg-popover border rounded-lg shadow-lg"
                  role="menu"
                >
                  <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm" size="sm" role="menuitem">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                  <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm" size="sm" role="menuitem">
                      <Settings className="h-4 w-4" />
                      Settings
                    </Button>
                  </Link>
                  <div className="my-1 border-t" />
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-2 h-8 text-sm text-destructive hover:text-destructive"
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                    role="menuitem"
                  >
                    {isLoggingOut ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {showMobileMenu && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 z-40 lg:hidden"
              onClick={() => setShowMobileMenu(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 20 }}
              className="fixed inset-y-0 left-0 w-64 bg-background border-r z-50 lg:hidden flex flex-col"
            >
              {/* Mobile Logo */}
              <div className="h-14 flex items-center justify-between px-4 border-b">
                <Link href="/" className="flex items-center gap-2" onClick={() => setShowMobileMenu(false)}>
                  <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                    <span className="text-background font-semibold text-xs">P</span>
                  </div>
                  <span className="font-semibold">Proofo</span>
                </Link>
                <Button variant="ghost" size="icon" onClick={() => setShowMobileMenu(false)}>
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Mobile Navigation */}
              <nav className="flex-1 px-3 py-4 space-y-1">
                {navItems.map((item) => {
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link key={item.href} href={item.href} onClick={() => setShowMobileMenu(false)}>
                      <Button
                        variant={isActive ? "secondary" : "ghost"}
                        className="w-full justify-start gap-2 h-9 text-sm"
                      >
                        <Icon className="h-4 w-4" />
                        {item.label}
                      </Button>
                    </Link>
                  );
                })}
              </nav>

              {/* Mobile Pro Banner */}
              {!isPro && (
                <div className="px-3 pb-3">
                  <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Crown className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">Go Pro</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      Remove watermarks & keep deals forever
                    </p>
                    <Button size="sm" className="w-full h-7 text-xs">
                      Upgrade
                    </Button>
                  </div>
                </div>
              )}

              {/* Mobile User */}
              <div className="p-3 border-t">
                <div className="flex items-center gap-2 p-2">
                  <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                    {userInitials || "G"}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{userName}</p>
                    <p className="text-xs text-muted-foreground">{isPro ? "Pro" : "Free"}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 h-8 text-sm text-destructive hover:text-destructive mt-2"
                  size="sm"
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                >
                  {isLoggingOut ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                  {isLoggingOut ? "Logging out..." : "Log Out"}
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 lg:pl-56">
        {/* Top Bar */}
        <header className="h-14 border-b bg-background sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-3">
            {/* Mobile Menu Button */}
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setShowMobileMenu(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>

            {/* Mobile Logo */}
            <Link href="/" className="lg:hidden flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-semibold text-xs">P</span>
              </div>
              <span className="font-semibold">Proofo</span>
            </Link>

            {/* Desktop Page Title */}
            <h1 className="hidden lg:block text-lg font-medium">{title}</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            {showNewDealButton && (
              <Link href="/deal/new">
                <Button size="sm">
                  <Plus className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">New Deal</span>
                </Button>
              </Link>
            )}
          </div>
        </header>

        {/* Page Content */}
        <div className="p-4 lg:p-6">{children}</div>
      </main>
    </div>
  );
}
