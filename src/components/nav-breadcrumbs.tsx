"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAppStore } from "@/store";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface NavBreadcrumbsProps {
  customItems?: BreadcrumbItem[];
  mobileItems?: BreadcrumbItem[]; // Optional override for mobile
}

export function NavBreadcrumbs({ customItems, mobileItems }: NavBreadcrumbsProps) {
  const pathname = usePathname();
  const { user } = useAppStore();

  // 1. Determine the trail items based on desktop vs mobile requirements
  const getDefaultItems = (isMobile: boolean): BreadcrumbItem[] => {
    // If we have custom items, we use those logic
    if (customItems) {
      if (isMobile && mobileItems) return mobileItems;
      return customItems;
    }

    // Default path-based generation
    const segments = pathname.split("/").filter(Boolean);
    const items: BreadcrumbItem[] = [];

    // Root: Dashboard (Desktop) or Home (Mobile)
    if (segments[0] === "dashboard") {
      items.push({
        label: isMobile ? "Home" : "Dashboard",
        href: "/dashboard"
      });

      // Subsequent segments
      segments.slice(1).forEach((segment: string, index: number) => {
        const path = `/${segments.slice(0, index + 2).join("/")}`;
        items.push({
          label: segment.split("-").map((w: string) => w.charAt(0).toUpperCase() + w.slice(1)).join(" "),
          href: path
        });
      });
    } else if (segments[0] === "deal" && segments[1] === "new") {
      // Dashboard/Agreements/New (Desktop) or Home/New (Mobile)
      if (user) {
        items.push({ label: isMobile ? "Home" : "Dashboard", href: "/dashboard" });
        if (!isMobile) {
          items.push({ label: "Agreements", href: "/dashboard/agreements" });
        }
      }
      items.push({ label: "New", href: "/deal/new" });
    }

    return items;
  };

  const desktopItems = getDefaultItems(false);
  const mobileIms = getDefaultItems(true);

  if (desktopItems.length === 0) return null;

  return (
    <nav className="flex items-center text-sm min-w-0 overflow-hidden select-none whitespace-nowrap">
      {/* Root Slash */}
      <span className="text-muted-foreground/40 mr-2 font-light text-lg">/</span>

      {/* Desktop View */}
      <div className="hidden sm:flex items-center text-sm">
        {desktopItems.map((item, index) => (
          <div key={`${item.label}-${index}`} className="flex items-center">
            {index > 0 && <span className="text-muted-foreground/40 mx-2 font-light">/</span>}
            {item.href && index < desktopItems.length - 1 ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-foreground text-muted-foreground truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(
                "truncate",
                index === desktopItems.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Mobile View */}
      <div className="flex sm:hidden items-center text-sm">
        {mobileIms.map((item, index) => (
          <div key={`${item.label}-mob-${index}`} className="flex items-center">
            {index > 0 && <span className="text-muted-foreground/40 mx-2 font-light">/</span>}
            {item.href && index < mobileIms.length - 1 ? (
              <Link
                href={item.href}
                className="transition-colors hover:text-foreground text-muted-foreground truncate"
              >
                {item.label}
              </Link>
            ) : (
              <span className={cn(
                "truncate",
                index === mobileIms.length - 1 ? "text-foreground font-semibold" : "text-muted-foreground"
              )}>
                {item.label}
              </span>
            )}
          </div>
        ))}
      </div>
    </nav>
  );
}
