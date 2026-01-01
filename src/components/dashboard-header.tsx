"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { NavBreadcrumbs } from "@/components/nav-breadcrumbs";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Search, Plus, Menu, Bell, Command } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface DashboardHeaderProps {
  onMenuClick: () => void;
  isDesktop?: boolean;
}

export function DashboardHeader({ onMenuClick }: DashboardHeaderProps) {
  const pathname = usePathname();

  const showNewDeal = !pathname.startsWith("/deal/new");

  return (
    <header className="h-16 flex-none border-b border-border/40 bg-background/80 backdrop-blur-xl z-30 sticky top-0 w-full supports-backdrop-filter:bg-background/60">
      <div className="h-full px-4 sm:px-6 flex items-center justify-between gap-4">
        {/* Left: Navigation & Breadcrumbs */}
        <div className="flex items-center gap-2 sm:gap-4 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="lg:hidden shrink-0 -ml-2 text-muted-foreground hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>

          <NavBreadcrumbs />
        </div>

        {/* Right: Actions & Tools */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Search Bar - Visual QoL Improvement */}
          <div className="hidden md:flex relative group">
            <Button
              variant="outline"
              size="sm"
              className="w-56 justify-between text-muted-foreground bg-secondary/30 hover:bg-secondary/50 border-transparent hover:border-border/50 transition-all text-xs font-normal h-9 shadow-none"
            >
              <span className="flex items-center gap-2">
                <Search className="h-3.5 w-3.5 opacity-70" />
                <span>Search...</span>
              </span>
              <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-70 group-hover:opacity-100 transition-opacity">
                <Command className="h-2.5 w-2.5" />K
              </kbd>
            </Button>
          </div>

          {/* Mobile Search Icon */}
          <Button variant="ghost" size="icon" className="md:hidden text-muted-foreground h-9 w-9">
            <Search className="h-5 w-5" />
          </Button>

          <div className="h-4 w-px bg-border/50 mx-1 hidden sm:block" />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Notifications - QoL: Added Badge */}
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:text-foreground hidden sm:flex h-9 w-9 relative"
                >
                  <Bell className="h-5 w-5" />
                  <span className="absolute top-2 right-2.5 h-2 w-2 rounded-full bg-primary border-2 border-background" />
                  <span className="sr-only">Notifications</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">Notifications</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          {/* New Deal Button - Primary Action */}
          {showNewDeal && (
            <Link href="/deal/new">
              <Button
                size="sm"
                className="h-9 gap-1.5 shadow-sm bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 ml-1 font-medium"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">New Deal</span>
                <span className="sm:hidden">New</span>
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
