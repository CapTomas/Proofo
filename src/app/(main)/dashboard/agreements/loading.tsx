import { Skeleton } from "@/components/ui/skeleton";
import { dashboardStyles } from "@/lib/dashboard-ui";
import { StatCardSkeleton, CardSkeleton } from "@/components/dashboard/skeleton-components";
import { Search, LayoutGrid, List as ListIcon, Clock, RefreshCw } from "lucide-react";

export default function AgreementsLoading() {
  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={dashboardStyles.syncButton}>
            <RefreshCw className="h-4 w-4 mr-1.5 opacity-20" />
            <span className="hidden sm:inline opacity-20">Sync</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Filter Bar */}
      <div className={dashboardStyles.filterBar}>
        <div className={dashboardStyles.searchInputContainer}>
          <Search className={dashboardStyles.searchIcon} />
          <div className="pl-9 h-10 flex items-center">
            <Skeleton className="h-4 w-40 opacity-20" />
          </div>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <div className={dashboardStyles.toggleGroup}>
            <div className={`${dashboardStyles.tabButton} ${dashboardStyles.tabButtonActive} opacity-50`}>Active</div>
            <div className={`${dashboardStyles.tabButton} ${dashboardStyles.tabButtonInactive} opacity-30`}>History</div>
          </div>
          <div className={dashboardStyles.divider} />
          <div className={dashboardStyles.toggleGroup}>
            <div className={`${dashboardStyles.toggleButton} ${dashboardStyles.toggleButtonActive} opacity-50`}>
              <LayoutGrid className="h-4 w-4" />
            </div>
            <div className={`${dashboardStyles.toggleButton} ${dashboardStyles.toggleButtonInactive} opacity-30`}>
              <ListIcon className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(6)].map((_, i) => (
          <CardSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}
