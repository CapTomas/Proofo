"use client";

import { DashboardLayout } from "@/components/dashboard-layout";
import { AppearanceProvider } from "@/components/providers/appearance-provider";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppearanceProvider>
      <DashboardLayout>{children}</DashboardLayout>
    </AppearanceProvider>
  );
}
