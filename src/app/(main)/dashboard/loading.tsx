import { Skeleton } from "@/components/ui/skeleton";
import { dashboardStyles } from "@/lib/dashboard-ui";
import { StatCardSkeleton, DealRowSkeleton } from "@/components/dashboard/skeleton-components";
import { RefreshCw, FileClock, BarChart3, Shield, CalendarDays } from "lucide-react";

export default function RootDashboardLoading() {
  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-48" />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className={dashboardStyles.syncButton}>
            <RefreshCw className="h-4 w-4 mr-1.5 opacity-20" />
            <span className="hidden sm:inline opacity-20">Sync</span>
          </div>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[...Array(4)].map((_, i) => (
          <StatCardSkeleton key={i} />
        ))}
      </div>

      {/* Main Dashboard Area */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column (2/3): Priority & Deadlines */}
        <div className="lg:col-span-2 space-y-6">
          {/* Priority Queue Skeleton */}
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden h-auto lg:h-[424px] flex flex-col">
            <div className="px-6 py-4 flex gap-6">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-24 opacity-50" />
            </div>
            <div className="p-3 space-y-1">
              {[...Array(5)].map((_, i) => (
                <DealRowSkeleton key={i} />
              ))}
            </div>
          </div>

          {/* Deadlines Widget Skeleton */}
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl overflow-hidden h-auto lg:h-[180px] p-5">
            <div className="flex items-center gap-2 mb-4">
              <CalendarDays className="h-4 w-4 text-primary opacity-50" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="space-y-3">
              {[...Array(2)].map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-1 rounded-full opacity-20" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24 opacity-50" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-16" />
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column (1/3): Activity & Analytics */}
        <div className="space-y-6">
          {/* Latest Activity Skeleton */}
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-5 h-[200px]">
            <div className="flex items-center gap-2 mb-4">
              <FileClock className="h-4 w-4 text-primary opacity-50" />
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-3 w-3/4 opacity-70" />
                <Skeleton className="h-3 w-1/2 opacity-50" />
              </div>
            </div>
          </div>

          {/* Volume Skeleton */}
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-5 h-[200px]">
            <div className="flex items-center gap-2 mb-4">
              <BarChart3 className="h-4 w-4 text-primary opacity-50" />
              <Skeleton className="h-4 w-20" />
            </div>
            <div className="space-y-4">
               <div className="flex items-baseline gap-2">
                  <Skeleton className="h-9 w-12" />
                  <Skeleton className="h-4 w-20 opacity-50" />
               </div>
               <Skeleton className="h-12 w-full opacity-20" />
            </div>
          </div>

          {/* Quick Verify Skeleton */}
          <div className="bg-card border border-border/50 shadow-sm rounded-2xl p-5 h-[180px]">
             <div className="flex items-center gap-2 mb-4">
              <Shield className="h-4 w-4 text-primary opacity-50" />
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="space-y-3">
              <Skeleton className="h-10 w-full rounded-xl" />
              <Skeleton className="h-9 w-full rounded-xl opacity-80" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
