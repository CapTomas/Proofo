import { Skeleton } from "@/components/ui/skeleton";
import { dashboardStyles } from "@/lib/dashboard-ui";
import { Card } from "@/components/ui/card";
import { Search, ShieldCheck } from "lucide-react";

export default function VerifyLoading() {
  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <Skeleton className="h-8 w-24 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>

      {/* Search Section Skeleton */}
      <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4">
          <div className={dashboardStyles.searchInputContainer}>
            <Search className={`${dashboardStyles.searchIcon} opacity-30`} />
            <div className="pl-9 h-10 flex items-center">
              <Skeleton className="h-4 w-40 opacity-20" />
            </div>
            <div className="absolute right-2 top-1/2 -translate-y-1/2">
              <div className="h-7 px-3 rounded-lg bg-primary/30 flex items-center gap-1.5 opacity-50">
                <ShieldCheck className="h-3.5 w-3.5 text-primary-foreground/50" />
                <span className="text-xs text-primary-foreground/50">Verify</span>
              </div>
            </div>
          </div>
        </div>
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500/50" />
            <Skeleton className="h-3 w-48 opacity-30" />
          </div>
          <Skeleton className="h-5 w-8 rounded opacity-20" />
        </div>
      </Card>

      {/* Info Section Skeleton */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="p-4 border border-border/50 rounded-2xl">
            <div className="flex items-start gap-3">
              <Skeleton className="h-10 w-10 rounded-lg shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-full opacity-70" />
                <Skeleton className="h-3 w-3/4 opacity-50" />
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Quick Verify Section Skeleton */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40 opacity-50" />
        </div>
        <div className="grid sm:grid-cols-3 gap-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="p-4 border border-border/50 rounded-xl">
              <div className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                <div className="flex-1 min-w-0 space-y-1.5">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3 w-24 opacity-50" />
                </div>
                <Skeleton className="h-4 w-4 rounded opacity-30" />
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
