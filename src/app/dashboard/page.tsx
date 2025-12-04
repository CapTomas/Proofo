"use client";

import { useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  FileCheck,
  Clock,
  CheckCircle2,
  TrendingUp,
  Calendar,
  Sparkles,
  LayoutTemplate,
  ArrowRight,
  Inbox,
  Users,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Deal, DealStatus } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction } from "@/app/actions/deal-actions";
import { OnboardingModal } from "@/components/onboarding-modal";
import { DashboardLayout } from "@/components/dashboard-layout";

// Demo data for when no deals exist
const demoDeals: Deal[] = [
  {
    id: "demo-1",
    publicId: "abc123",
    creatorId: "demo-user",
    creatorName: "You",
    recipientName: "John Doe",
    title: "Lend Camera Equipment",
    description: "Lending Canon EOS R5 with 24-70mm lens",
    terms: [
      { id: "1", label: "Item", value: "Canon EOS R5 + 24-70mm f/2.8 lens", type: "text" },
      { id: "2", label: "Value", value: "$5,000", type: "currency" },
      { id: "3", label: "Return Date", value: "2024-02-15", type: "date" },
    ],
    status: "confirmed",
    createdAt: "2024-01-15T10:30:00Z",
    confirmedAt: "2024-01-15T11:00:00Z",
  },
  {
    id: "demo-2",
    publicId: "def456",
    creatorId: "demo-user",
    creatorName: "You",
    recipientName: "Jane Smith",
    title: "Payment Agreement",
    description: "Repayment for concert tickets",
    terms: [
      { id: "1", label: "Amount", value: "$150", type: "currency" },
      { id: "2", label: "Reason", value: "Concert tickets", type: "text" },
      { id: "3", label: "Due Date", value: "2024-02-01", type: "date" },
    ],
    status: "pending",
    createdAt: "2024-01-20T14:00:00Z",
  },
];

const statusConfig: Record<DealStatus, { label: string; icon: typeof Clock }> = {
  pending: { label: "Pending", icon: Clock },
  sealing: { label: "Sealing", icon: Clock },
  confirmed: { label: "Confirmed", icon: CheckCircle2 },
  voided: { label: "Voided", icon: Clock },
};

export default function DashboardPage() {
  const { 
    deals: storeDeals, 
    user, 
    setDeals,
    needsOnboarding,
    setNeedsOnboarding 
  } = useAppStore();
  const hasInitializedRef = useRef(false);

  const showOnboarding = user && !user.id.startsWith("demo-") && needsOnboarding;

  const handleOnboardingComplete = () => {
    setNeedsOnboarding(false);
  };

  const refreshDeals = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    const { deals, error } = await getUserDealsAction();
    if (!error) {
      setDeals(deals || []);
    }
  }, [setDeals]);

  useEffect(() => {
    if (!hasInitializedRef.current && user && !user.id.startsWith("demo-")) {
      hasInitializedRef.current = true;
      refreshDeals().catch((err) => {
        console.error("Failed to refresh deals on mount:", err);
      });
    }
  }, [user, refreshDeals]);

  const allDeals = storeDeals.length > 0 ? storeDeals : demoDeals;
  const isUsingDemoData = storeDeals.length === 0;

  const stats = useMemo(() => {
    const total = allDeals.length;
    const pending = allDeals.filter((d) => d.status === "pending").length;
    const confirmed = allDeals.filter((d) => d.status === "confirmed").length;
    const confirmationRate = total > 0 
      ? Math.round((confirmed / total) * 100) 
      : 0;
    const inboxCount = 0;
    return { total, pending, confirmed, confirmationRate, inboxCount };
  }, [allDeals]);

  const recentDeals = useMemo(() => {
    return [...allDeals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [allDeals]);

  const userName = user?.name || "Guest";

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
      
      <DashboardLayout title="Home">
        <div className="space-y-6">
          {isUsingDemoData && (
            <Card className="border-dashed bg-muted/30">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Sparkles className="h-4 w-4 text-primary shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">Demo Mode</span>
                    <span className="text-muted-foreground"> — these are sample deals. Create your first real deal to get started!</span>
                  </div>
                  <Link href="/deal/new">
                    <Button size="sm" className="h-7 text-xs shrink-0">
                      Create Deal
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Welcome back, {userName.split(" ")[0]}</h2>
              <p className="text-sm text-muted-foreground">
                Here&apos;s an overview of your activity
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Deals Created</p>
              </CardContent>
            </Card>

            <Card className={stats.pending > 0 ? "border-amber-500/50" : ""}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-4 w-4 text-amber-500" />
                  {stats.pending > 0 && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
                </div>
                <p className="text-2xl font-semibold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Awaiting Signature</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stats.confirmationRate}%
                  </span>
                </div>
                <p className="text-2xl font-semibold">{stats.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Inbox className="h-4 w-4 text-muted-foreground" />
                </div>
                <p className="text-2xl font-semibold">{stats.inboxCount}</p>
                <p className="text-xs text-muted-foreground">In Your Inbox</p>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Quick Actions</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Link href="/deal/new">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5">
                  <Plus className="h-5 w-5" />
                  <span className="text-xs">New Deal</span>
                </Button>
              </Link>
              <Link href="/templates">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5">
                  <LayoutTemplate className="h-5 w-5" />
                  <span className="text-xs">Templates</span>
                </Button>
              </Link>
              <Link href="/inbox">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5">
                  <Inbox className="h-5 w-5" />
                  <span className="text-xs">Inbox</span>
                </Button>
              </Link>
              <Link href="/people">
                <Button variant="outline" className="w-full h-auto py-3 flex flex-col gap-1.5">
                  <Users className="h-5 w-5" />
                  <span className="text-xs">People</span>
                </Button>
              </Link>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Recent Deals</CardTitle>
                  <Link href="/agreements">
                    <Button variant="ghost" size="sm" className="h-7 text-xs gap-1">
                      View All
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-2">
                  {recentDeals.length === 0 ? (
                    <div className="text-center py-8">
                      <FileCheck className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No deals yet</p>
                      <Link href="/deal/new">
                        <Button size="sm" className="mt-3">
                          <Plus className="h-4 w-4 mr-1" />
                          Create Your First
                        </Button>
                      </Link>
                    </div>
                  ) : (
                    <AnimatePresence mode="popLayout">
                      {recentDeals.map((deal, index) => {
                        const StatusIcon = statusConfig[deal.status].icon;
                        return (
                          <motion.div
                            key={deal.id}
                            initial={{ opacity: 0, y: 5 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                          >
                            <Link href={`/d/${deal.publicId}`}>
                              <div className="group p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer">
                                <div className="flex items-center gap-3">
                                  <div className="h-9 w-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                                    <StatusIcon className={`h-4 w-4 ${
                                      deal.status === "confirmed" ? "text-emerald-500" :
                                      deal.status === "pending" ? "text-amber-500" :
                                      "text-muted-foreground"
                                    }`} />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">{deal.title}</p>
                                    <p className="text-xs text-muted-foreground">with {deal.recipientName}</p>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <Badge variant="outline" className="text-xs capitalize">
                                      {statusConfig[deal.status].label}
                                    </Badge>
                                    <p className="text-xs text-muted-foreground mt-1">{timeAgo(deal.createdAt)}</p>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  <div className="text-center py-8">
                    <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                    <p className="text-xs text-muted-foreground mt-1">Activity will appear here as you use Proofo</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {stats.pending > 0 && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{stats.pending} deal{stats.pending > 1 ? 's' : ''} awaiting signature</span>
                    <span className="text-muted-foreground"> — consider sending a reminder</span>
                  </div>
                  <Link href="/agreements">
                    <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">
                      View Pending
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DashboardLayout>
    </>
  );
}
