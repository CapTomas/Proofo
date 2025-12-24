import { Skeleton } from "@/components/ui/skeleton";

/**
 * StatCardSkeleton - Loading state for StatCard
 */
export const StatCardSkeleton = () => (
  <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm">
    <div className="flex justify-between items-start">
      <Skeleton className="h-8 w-8 rounded-lg" />
      <Skeleton className="h-5 w-16 rounded-md opacity-50" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <Skeleton className="h-4 w-32 rounded-md opacity-70" />
    </div>
  </div>
);

/**
 * DealRowSkeleton - Loading state for a row in a list view
 */
export const DealRowSkeleton = () => (
  <div className="flex items-center justify-between p-3 rounded-xl border border-transparent">
    <div className="flex items-center gap-4 flex-1">
      <Skeleton className="h-9 w-9 rounded-lg shrink-0" />
      <div className="space-y-2 flex-1">
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-40 rounded-md" />
          <Skeleton className="h-4 w-12 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-28 rounded-md opacity-70" />
          <Skeleton className="h-3 w-16 rounded-md opacity-50" />
        </div>
      </div>
    </div>
    <div className="flex items-center gap-2 px-2">
      <Skeleton className="h-5 w-20 rounded-md hidden sm:block" />
      <Skeleton className="h-7 w-20 rounded-lg hidden sm:block" />
    </div>
  </div>
);

/**
 * CardSkeleton - Loading state for a card in a grid view
 */
export const CardSkeleton = () => (
  <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 flex flex-col gap-4 shadow-sm h-full">
    <div className="flex justify-between items-start">
      <div className="flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="space-y-2">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-4 w-24 rounded-md opacity-70" />
        </div>
      </div>
      <Skeleton className="h-6 w-6 rounded-full opacity-50" />
    </div>
    <div className="flex-1 space-y-3 pt-2">
      <Skeleton className="h-4 w-full rounded-md" />
      <Skeleton className="h-4 w-5/6 rounded-md opacity-80" />
    </div>
    <div className="mt-auto pt-4 border-t border-border/40 flex justify-between items-center">
      <Skeleton className="h-8 w-24 rounded-lg" />
      <div className="flex gap-2">
        <Skeleton className="h-8 w-8 rounded-lg" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
    </div>
  </div>
);

/**
 * SettingsHeaderSkeleton - Skeleton for page titles
 */
export const SettingsHeaderSkeleton = () => (
  <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
    <div className="space-y-2">
      <Skeleton className="h-8 w-32 sm:h-9 sm:w-48 rounded-lg" />
      <Skeleton className="h-4 w-48 sm:w-64 rounded-md opacity-50" />
    </div>
    <Skeleton className="h-9 w-20 sm:w-24 rounded-xl opacity-30" />
  </div>
);

/**
 * SettingsTabsSkeleton - Skeleton for horizontal tab navigation
 */
export const SettingsTabsSkeleton = () => (
  <div className="flex items-center gap-1 border-b border-border/40 pb-px overflow-x-auto no-scrollbar">
    {[...Array(5)].map((_, i) => (
      <div key={i} className="px-4 py-3 min-w-[100px] flex items-center justify-center">
        <Skeleton className="h-4 w-16 rounded-md opacity-20" />
      </div>
    ))}
  </div>
);

/**
 * SettingsCardSkeleton - Generic specialized card for items inside settings
 */
export const SettingsCardSkeleton = () => (
  <div className="bg-card border border-border/50 rounded-2xl p-4 sm:p-5 flex items-start gap-4 shadow-sm">
    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
    <div className="flex-1 space-y-2 py-0.5">
      <div className="flex justify-between items-center gap-4">
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-1/3 rounded-md" />
          <Skeleton className="h-3 w-3/4 rounded-md opacity-50" />
        </div>
        <Skeleton className="h-6 w-10 rounded-full opacity-30" />
      </div>
    </div>
  </div>
);

/**
 * SettingsGroupSkeleton - A section title and a grid of cards
 */
export const SettingsGroupSkeleton = ({ count = 2 }: { count?: number }) => (
  <div className="space-y-4">
    <Skeleton className="h-5 w-32 rounded-md" />
    <div className="grid gap-4 md:grid-cols-2">
      {[...Array(count)].map((_, i) => (
        <SettingsCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

/**
 * SettingsProfileSkeleton - Detailed skeleton for the profile side-card
 */
export const SettingsProfileSkeleton = () => (
  <div className="bg-card border border-border/50 rounded-2xl p-6 flex flex-col items-center text-center space-y-6 shadow-sm">
    <Skeleton className="h-32 w-32 rounded-full ring-4 ring-background shadow-xl" />
    <div className="space-y-2 w-full flex flex-col items-center">
      <Skeleton className="h-6 w-1/2 rounded-md" />
      <Skeleton className="h-4 w-1/3 rounded-md opacity-50" />
    </div>
    <div className="w-full h-16 bg-muted/20 border border-border/30 rounded-xl animate-pulse" />
    <Skeleton className="h-10 w-full rounded-xl" />
  </div>
);
