
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div className="flex flex-col gap-6 p-6 sm:px-8 sm:py-8 min-h-screen">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <Skeleton className="h-8 w-48 rounded-lg" />
        <Skeleton className="h-4 w-64 max-w-full rounded-md opacity-70" />
      </div>

      {/* Stats Grid - Common pattern */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>

      {/* Main Content Area */}
      <div className="space-y-4 pt-2">
        {/* Toolbar / Filters */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between sm:items-center">
             <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
             <div className="flex gap-2">
                <Skeleton className="h-10 w-24 rounded-lg" />
                <Skeleton className="h-10 w-24 rounded-lg" />
             </div>
        </div>

        {/* Card Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
             {Array.from({ length: 6 }).map((_, i) => (
               <Skeleton key={i} className="h-[200px] rounded-2xl" />
             ))}
        </div>
      </div>
    </div>
  );
}
