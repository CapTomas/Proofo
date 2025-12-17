/**
 * Dashboard UI Shared Constants
 * 
 * This file contains standardized styling constants, animation variants,
 * and helper functions for dashboard pages to ensure visual consistency.
 */

import { Variants } from "framer-motion";

// =============================================================================
// ANIMATION VARIANTS
// =============================================================================

/**
 * Standard container animation variants for staggered children
 */
export const containerVariants: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

/**
 * Standard item animation variants for cards and list items
 * Uses scale/opacity animation (not bottom-up slide)
 */
export const itemVariants: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  show: { 
    opacity: 1, 
    scale: 1, 
    transition: { 
      type: "spring", 
      stiffness: 400, 
      damping: 25 
    } 
  },
  exit: { 
    opacity: 0, 
    scale: 0.95, 
    transition: { duration: 0.15 } 
  }
};

/**
 * Standard card flip animation transition
 */
export const cardFlipTransition = {
  duration: 0.6,
  ease: [0.23, 1, 0.32, 1] as const,
};

// =============================================================================
// STYLE CLASSES
// =============================================================================

/**
 * Standard classes for dashboard pages
 */
export const dashboardStyles = {
  // Page container
  pageContainer: "space-y-6 pb-20",
  
  // Page header with title and description
  pageHeader: "flex items-center justify-between gap-4 pb-2 border-b border-border/40",
  pageTitle: "text-xl sm:text-2xl font-bold tracking-tight truncate",
  pageDescription: "text-muted-foreground text-xs sm:text-sm",
  
  // Filter bar container
  filterBar: "bg-background/50 border border-border/50 shadow-sm rounded-2xl p-2 flex flex-col sm:flex-row gap-2 sticky top-0 z-20 backdrop-blur-xl",
  
  // Search input within filter bar
  searchInputContainer: "relative flex-1 group",
  searchInput: "pl-9 h-10 border-transparent bg-secondary/50 focus:bg-background transition-colors rounded-xl",
  searchIcon: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors",
  
  // Toggle button groups (view mode, filters)
  toggleGroup: "flex bg-secondary/50 p-1 rounded-xl shrink-0",
  toggleButton: "p-1.5 rounded-lg transition-all",
  toggleButtonActive: "bg-background text-foreground shadow-sm",
  toggleButtonInactive: "text-muted-foreground hover:text-foreground hover:bg-background/50",
  
  // Filter pills
  filterPill: "px-3 py-1.5 text-xs font-medium rounded-lg transition-all whitespace-nowrap",
  filterPillActive: "bg-background text-foreground shadow-sm",
  filterPillInactive: "text-muted-foreground hover:text-foreground hover:bg-background/50",
  
  // Tab buttons
  tabButton: "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
  tabButtonActive: "bg-background text-foreground shadow-sm",
  tabButtonInactive: "text-muted-foreground hover:text-foreground",
  
  // Grid layouts
  gridContainer: "grid gap-4 sm:gap-6",
  gridCols3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
  gridCols4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
  gridCols1: "grid-cols-1",
  
  // Card styling
  cardBase: "h-full border hover:border-primary/30 transition-all duration-300 hover:shadow-card overflow-hidden bg-card rounded-2xl cursor-pointer",
  cardContent: "p-4 flex flex-col h-full",
  cardFooter: "mt-auto p-4 pt-3 border-t border-border/40 flex items-center justify-between gap-2 bg-secondary/30",
  
  // Empty state container
  emptyState: "flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/60 rounded-2xl bg-muted/10",
  emptyStateIcon: "h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4",
  emptyStateTitle: "text-lg font-semibold",
  emptyStateDescription: "text-muted-foreground text-sm max-w-xs mx-auto mt-1 mb-6",
  
  // Stat cards
  statCard: "group relative h-full bg-card hover:bg-card/80 border transition-all duration-200 rounded-2xl p-4 flex flex-col justify-between cursor-pointer",
  statCardActive: "border-primary/50 shadow-md ring-1 ring-primary/10",
  statCardInactive: "border-border/50 hover:border-primary/20 shadow-sm hover:shadow-md",
  statCardIcon: "p-2 rounded-xl transition-colors",
  statCardValue: "text-2xl font-bold tracking-tight text-foreground group-hover:translate-x-0.5 transition-transform",
  statCardLabel: "text-xs text-muted-foreground font-medium mt-0.5 group-hover:text-foreground/80 transition-colors truncate",
  
  // Action buttons
  syncButton: "text-muted-foreground hover:text-foreground h-9 px-2 sm:px-3 rounded-xl",
  
  // Icon sizes
  iconSm: "h-3.5 w-3.5",
  iconMd: "h-4 w-4",
  iconLg: "h-5 w-5",
  
  // Divider
  divider: "w-px h-6 bg-border/50 hidden sm:block shrink-0",
  
  // Badge styling
  categoryBadge: "text-[10px] h-5 px-1.5 font-medium bg-background text-muted-foreground border-border/50",
  
  // Keyboard shortcut hint
  keyboardHint: "h-5 px-1.5 bg-background border border-border/50 rounded text-[10px] font-mono text-muted-foreground flex items-center shadow-sm",
  
} as const;

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get grid column class based on view mode
 */
export function getGridClass(viewMode: "grid" | "list", columns: 3 | 4 = 3): string {
  if (viewMode === "list") {
    return dashboardStyles.gridCols1;
  }
  return columns === 4 ? dashboardStyles.gridCols4 : dashboardStyles.gridCols3;
}

/**
 * Get stat card classes based on active state
 */
export function getStatCardClass(isActive: boolean): string {
  return `${dashboardStyles.statCard} ${isActive ? dashboardStyles.statCardActive : dashboardStyles.statCardInactive}`;
}

/**
 * Get toggle button classes based on active state
 */
export function getToggleButtonClass(isActive: boolean): string {
  return `${dashboardStyles.toggleButton} ${isActive ? dashboardStyles.toggleButtonActive : dashboardStyles.toggleButtonInactive}`;
}

/**
 * Get filter pill classes based on active state
 */
export function getFilterPillClass(isActive: boolean): string {
  return `${dashboardStyles.filterPill} ${isActive ? dashboardStyles.filterPillActive : dashboardStyles.filterPillInactive}`;
}

/**
 * Get tab button classes based on active state
 */
export function getTabButtonClass(isActive: boolean): string {
  return `${dashboardStyles.tabButton} ${isActive ? dashboardStyles.tabButtonActive : dashboardStyles.tabButtonInactive}`;
}
