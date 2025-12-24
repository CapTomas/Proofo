import {
  SettingsHeaderSkeleton,
  SettingsTabsSkeleton,
  SettingsProfileSkeleton,
  SettingsGroupSkeleton
} from "@/components/dashboard/shared-components";
import { dashboardStyles } from "@/lib/dashboard-ui";

export default function SettingsLoading() {
  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <SettingsHeaderSkeleton />

      {/* Tabs Skeleton */}
      <SettingsTabsSkeleton />

      {/* Profile Tab Skeleton Content (Default) */}
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-1">
          <SettingsProfileSkeleton />
        </div>
        <div className="lg:col-span-2 space-y-6">
          <SettingsGroupSkeleton count={2} />
          <SettingsGroupSkeleton count={3} />
        </div>
      </div>
    </div>
  );
}
