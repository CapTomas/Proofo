"use client";

import { useState, useEffect } from "react";

import { Sparkles, Zap, PieChart, RefreshCw, Receipt, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { dashboardStyles } from "@/lib/dashboard-ui";
import { User as UserType } from "@/types";

// Type for settings user
type SettingsUser = UserType | null;

// Helper components
const VisualCreditCard = ({ isPro }: { isPro: boolean }) => (
  <div
    className={cn(
      "relative w-full aspect-[1.586] rounded-2xl p-6 flex flex-col justify-between overflow-hidden text-white shadow-xl transition-all duration-500",
      isPro
        ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700"
        : "bg-gradient-to-br from-slate-400 to-slate-500 grayscale opacity-80"
    )}
  >
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white blur-3xl" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary blur-3xl" />
    </div>

    <div className="relative z-10 flex justify-between items-start">
      <div className="flex gap-2 items-center">
        <div className="w-8 h-5 rounded bg-yellow-200/80" /> {/* Chip */}
        <Zap className="h-4 w-4 text-white/50" />
      </div>
      <span className="font-bold tracking-wider text-lg italic">VISA</span>
    </div>

    <div className="relative z-10 space-y-4">
      <div className="font-mono text-lg tracking-widest text-shadow-sm">
        {isPro ? "•••• •••• •••• 4242" : "•••• •••• •••• ••••"}
      </div>
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <div className="text-[8px] uppercase tracking-widest text-white/60">Card Holder</div>
          <div className="font-medium tracking-wide text-sm">ALEX JOHNSON</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[8px] uppercase tracking-widest text-white/60">Expires</div>
          <div className="font-medium tracking-wide text-sm">12/28</div>
        </div>
      </div>
    </div>
  </div>
);

const PlusIcon = ({ className }: { className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);

const SettingGroup = ({
  title,
  children,
  description,
}: {
  title: string;
  children: React.ReactNode;
  description?: string;
}) => (
  <div className="space-y-3">
    <div className="space-y-1">
      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">
        {title}
      </h3>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
    </div>
    {children}
  </div>
);

import { SettingsGroupSkeleton } from "@/components/dashboard/shared-components";

export const BillingTab = ({ user }: { user: SettingsUser }) => {
  const [isLoading, setIsLoading] = useState(true);
  const isPro = user?.isPro || false;

  useEffect(() => {
    // Simulate initial load for smooth transition
    const timer = setTimeout(() => setIsLoading(false), 500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div className="bg-card border border-border/50 rounded-2xl h-[200px] animate-pulse shadow-sm" />
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <div className="bg-card border border-border/50 rounded-2xl h-[400px] animate-pulse shadow-sm" />
          </div>
          <div className="lg:col-span-2 space-y-6">
            <SettingsGroupSkeleton count={2} />
            <div className="bg-card border border-border/50 rounded-2xl h-[200px] animate-pulse shadow-sm" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Plan Status */}
      <Card
        className={cn(
          dashboardStyles.cardBase,
          "h-auto cursor-default border-primary/20 overflow-hidden relative"
        )}
      >
        {isPro && (
          <div className="absolute top-0 right-0 p-4">
            <Badge className="bg-primary text-primary-foreground shadow-sm">
              Active Subscription
            </Badge>
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Current Plan
              </h3>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">
                  {isPro ? "Professional Plan" : "Starter Plan"}
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {isPro
                    ? "You have full access to all features including unlimited history and custom branding."
                    : "Unlock unlimited history, custom branding, and remove watermarks from your documents."}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{isPro ? "$9" : "$0"}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <div className="relative">
                <Button
                  size="lg"
                  variant={isPro ? "outline" : "default"}
                  className="w-full md:w-auto shadow-lg"
                  disabled
                >
                  {isPro ? "Manage Subscription" : "Upgrade to Pro"}
                </Button>
                <Badge
                  variant="outline"
                  className="absolute -top-2 -right-2 text-[9px] h-4 px-1.5 bg-muted text-muted-foreground border-border"
                >
                  Coming Soon
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Method - Visual Card */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Payment Method
          </h3>
          <Card className={cn(dashboardStyles.cardBase, "h-full cursor-default bg-secondary/10")}>
            <CardContent className="p-6 flex flex-col items-center gap-6">
              <VisualCreditCard isPro={isPro} />
              <div className="w-full">
                {isPro ? (
                  <Button variant="outline" className="w-full" disabled>
                    Update Card
                    <Badge
                      variant="outline"
                      className="ml-2 text-[9px] h-4 px-1.5 bg-muted text-muted-foreground border-border"
                    >
                      Soon
                    </Badge>
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full border-dashed border-2" disabled>
                    <PlusIcon className="h-4 w-4 mr-2" /> Add Payment Method
                    <Badge
                      variant="outline"
                      className="ml-2 text-[9px] h-4 px-1.5 bg-muted text-muted-foreground border-border"
                    >
                      Soon
                    </Badge>
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage & History */}
        <div className="lg:col-span-2 space-y-8">
          <SettingGroup title="Usage Overview">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-sky-500/10 flex items-center justify-center text-sky-600">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Deals This Month
                    </p>
                    <p className="text-xl font-bold">
                      12{" "}
                      <span className="text-sm text-muted-foreground font-normal">
                        / {isPro ? "Unlimited" : "5"}
                      </span>
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                      Next Invoice
                    </p>
                    <p className="text-xl font-bold">{isPro ? "Feb 1, 2024" : "N/A"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SettingGroup>

          <SettingGroup title="Invoice History">
            <Card className={cn(dashboardStyles.cardBase, "cursor-default")}>
              <div className="divide-y divide-border/50">
                {[
                  { id: "INV-001", date: "Jan 1, 2024", amount: "$9.00", status: "Paid" },
                  { id: "INV-002", date: "Dec 1, 2023", amount: "$9.00", status: "Paid" },
                ].map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{inv.id}</p>
                        <p className="text-xs text-muted-foreground">{inv.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{inv.amount}</span>
                      <Badge
                        variant="secondary"
                        className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                      >
                        {inv.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8" disabled>
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </SettingGroup>
        </div>
      </div>
    </div>
  );
};
