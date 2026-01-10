import { Skeleton } from "@/components/ui/skeleton";
import { dashboardStyles } from "@/lib/dashboard-ui";
import { CardSkeleton } from "@/components/dashboard/skeleton-components";
import { Search, LayoutGrid, List as ListIcon } from "lucide-react";

export default function TemplatesLoading() {
  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <Skeleton className="h-8 w-32 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Filter Bar */}
      <div className={dashboardStyles.filterBar}>
        <div className={dashboardStyles.searchInputContainer}>
          <Search className={dashboardStyles.searchIcon} />
          <div className="pl-9 h-10 flex items-center">
            <Skeleton className="h-4 w-56 opacity-20" />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <div className={dashboardStyles.toggleGroup}>
            {["All", "Financial", "Services", "Personal", "General"].map((category, i) => (
              <div
                key={category}
                className={`${dashboardStyles.filterPill} ${
                  i === 0 ? dashboardStyles.filterPillActive : dashboardStyles.filterPillInactive
                } ${i === 0 ? "opacity-50" : "opacity-30"}`}
              >
                {category}
              </div>
            ))}
          </div>

          <div className={dashboardStyles.divider} />

          <div className={dashboardStyles.toggleGroup}>
            <div
              className={`${dashboardStyles.toggleButton} ${dashboardStyles.toggleButtonActive} opacity-50`}
            >
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div
              className={`${dashboardStyles.toggleButton} ${dashboardStyles.toggleButtonInactive} opacity-30`}
            >
              <ListIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[...Array(8)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>

      {/* Create Custom Template Section Skeleton */}
      <div className="border-2 border-dashed border-border/40 rounded-2xl p-8 text-center bg-muted/5">
        <div className="flex flex-col items-center">
          <Skeleton className="h-14 w-14 rounded-2xl mb-4" />
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-80 mb-6" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
