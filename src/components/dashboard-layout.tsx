"use client";

import { useState } from "react";
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
  RefreshCw,
  FileText,
  Inbox,
  Users,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { signOut, isSupabaseConfigured } from "@/lib/supabase";

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  showNewDealButton?: boolean;
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

export function DashboardLayout({ children, title, showNewDealButton = true }: DashboardLayoutProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, setDeals } = useAppStore();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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

  const userName = user?.name || "Guest";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPro = user?.isPro || false;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
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
            const isActive = pathname === item.href || 
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
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
        <div className="p-3 border-t">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors"
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
                >
                  <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm" size="sm">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                  <Link href="/settings">
                    <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm" size="sm">
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

      {/* Main Content */}
      <main className="flex-1 lg:pl-56">
        {/* Top Bar */}
        <header className="h-14 border-b bg-background sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-semibold text-xs">P</span>
              </div>
              <span className="font-semibold">Proofo</span>
            </Link>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-lg font-medium">{title || "Dashboard"}</h1>
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

        <div className="p-4 lg:p-6">
          {children}
        </div>
      </main>
    </div>
  );
}
