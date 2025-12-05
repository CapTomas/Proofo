"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Plus,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  User,
  Eye,
  TrendingUp,
  Calendar,
  Sparkles,
  ArrowRight,
  Inbox,
  FileText,
  Users,
  LayoutTemplate,
  Shield,
  Activity,
} from "lucide-react";
import Link from "next/link";
import { Deal, DealStatus, AuditLogEntry } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction } from "@/app/actions/deal-actions";
import { OnboardingModal } from "@/components/onboarding-modal";

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

const statusConfig: Record<DealStatus, { label: string; icon: typeof Clock; dotClass: string }> = {
  pending: { label: "Pending", icon: Clock, dotClass: "bg-amber-500" },
  sealing: { label: "Sealing", icon: RefreshCw, dotClass: "bg-blue-500" },
  confirmed: { label: "Confirmed", icon: CheckCircle2, dotClass: "bg-emerald-500" },
  voided: { label: "Voided", icon: XCircle, dotClass: "bg-red-500" },
};

// Quick action links
const quickActions = [
  { href: "/deal/new", label: "New Deal", icon: Plus, description: "Create a new agreement" },
  { href: "/templates", label: "Templates", icon: LayoutTemplate, description: "Browse deal templates" },
  { href: "/dashboard/agreements", label: "Agreements", icon: FileText, description: "View your deals" },
  { href: "/verify", label: "Verify", icon: Shield, description: "Verify a deal" },
];

// Demo activity for recent activity feed
const generateDemoActivity = (deals: Deal[]): { type: string; title: string; time: string; icon: typeof Clock }[] => {
  const activities: { type: string; title: string; time: string; icon: typeof Clock }[] = [];
  
  deals.forEach(deal => {
    activities.push({
      type: "created",
      title: `Created "${deal.title}"`,
      time: deal.createdAt,
      icon: Plus,
    });
    
    if (deal.status === "confirmed" && deal.confirmedAt) {
      activities.push({
        type: "confirmed",
        title: `"${deal.title}" was signed`,
        time: deal.confirmedAt,
        icon: CheckCircle2,
      });
    }
  });
  
  return activities.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()).slice(0, 5);
};

export default function DashboardPage() {
  const { 
    deals: storeDeals, 
    user, 
    setDeals,
    auditLogs,
    needsOnboarding,
    setNeedsOnboarding 
  } = useAppStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const hasInitializedRef = useRef(false);

  // Check if user needs onboarding
  useEffect(() => {
    if (user && !user.id.startsWith("demo-") && needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [user, needsOnboarding]);

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setNeedsOnboarding(false);
  };

  // Fetch deals from database
  const refreshDeals = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    const { deals, error } = await getUserDealsAction();
    if (!error) {
      setDeals(deals || []);
    }
  }, [setDeals]);

  // Refresh deals on mount
  useEffect(() => {
    if (!hasInitializedRef.current && user && !user.id.startsWith("demo-")) {
      hasInitializedRef.current = true;
      refreshDeals().catch((err) => {
        console.error("Failed to refresh deals on mount:", err);
      });
    }
  }, [user, refreshDeals]);

  // Use store deals if available, otherwise show demo deals
  const allDeals = storeDeals.length > 0 ? storeDeals : demoDeals;
  const isUsingDemoData = storeDeals.length === 0;

  const stats = useMemo(() => {
    const total = allDeals.length;
    const pending = allDeals.filter((d) => d.status === "pending").length;
    const confirmed = allDeals.filter((d) => d.status === "confirmed").length;
    const voided = allDeals.filter((d) => d.status === "voided").length;
    const confirmationRate = total > 0 
      ? Math.round((confirmed / total) * 100) 
      : 0;
    return { total, pending, confirmed, voided, confirmationRate };
  }, [allDeals]);

  // Get recent deals (last 3)
  const recentDeals = useMemo(() => {
    return [...allDeals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 3);
  }, [allDeals]);

  // Get pending deals for "needs attention"
  const pendingDeals = useMemo(() => {
    return allDeals.filter(d => d.status === "pending").slice(0, 3);
  }, [allDeals]);

  // Generate activity feed
  const recentActivity = useMemo(() => {
    return generateDemoActivity(allDeals);
  }, [allDeals]);

  const userName = user?.name || "Guest";

  return (
    <>
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
      
      <DashboardLayout title="Home">
        <div className="space-y-6">
          {/* Demo Mode Banner */}
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

          {/* Welcome Section */}
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

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <FileCheck className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Total</span>
                </div>
                <p className="text-2xl font-semibold">{stats.total}</p>
                <p className="text-xs text-muted-foreground">Deals</p>
              </CardContent>
            </Card>

            <Link href="/dashboard/agreements?status=pending">
              <Card className="hover:border-amber-500/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Clock className="h-4 w-4 text-muted-foreground" />
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                  </div>
                  <p className="text-2xl font-semibold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </CardContent>
              </Card>
            </Link>

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <TrendingUp className="h-3 w-3" />
                    {stats.confirmationRate}%
                  </span>
                </div>
                <p className="text-2xl font-semibold">{stats.confirmed}</p>
                <p className="text-xs text-muted-foreground">Confirmed</p>
              </CardContent>
            </Card>

            <Link href="/dashboard/inbox">
              <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <Inbox className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <p className="text-2xl font-semibold">0</p>
                  <p className="text-xs text-muted-foreground">To Sign</p>
                </CardContent>
              </Card>
            </Link>
          </div>

          {/* Quick Actions */}
          <div>
            <h3 className="text-sm font-medium mb-3">Quick Actions</h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {quickActions.map((action) => {
                const Icon = action.icon;
                return (
                  <Link key={action.href} href={action.href}>
                    <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
                      <CardContent className="p-4 flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Icon className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-medium text-sm">{action.label}</p>
                          <p className="text-xs text-muted-foreground truncate">{action.description}</p>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Needs Attention */}
            {pendingDeals.length > 0 && (
              <Card>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Clock className="h-4 w-4 text-amber-500" />
                      <CardTitle className="text-base font-medium">Needs Attention</CardTitle>
                    </div>
                    <Badge variant="warning" className="text-xs">
                      {pendingDeals.length} waiting
                    </Badge>
                  </div>
                  <CardDescription>Deals waiting for signatures</CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">
                    {pendingDeals.map((deal) => (
                      <Link key={deal.id} href={`/d/${deal.publicId}`}>
                        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer">
                          <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0">
                            <Clock className="h-4 w-4 text-amber-500" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{deal.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {deal.recipientName} • {timeAgo(deal.createdAt)}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        </div>
                      </Link>
                    ))}
                  </div>
                  <Link href="/dashboard/agreements?status=pending">
                    <Button variant="ghost" size="sm" className="w-full mt-3 text-xs">
                      View all pending
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            )}

            {/* Recent Activity */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Activity className="h-4 w-4 text-muted-foreground" />
                  <CardTitle className="text-base font-medium">Recent Activity</CardTitle>
                </div>
                <CardDescription>Your latest deal activity</CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-3">
                  {recentActivity.length > 0 ? (
                    recentActivity.map((activity, index) => {
                      const Icon = activity.icon;
                      return (
                        <motion.div
                          key={index}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          className="flex items-start gap-3"
                        >
                          <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${
                            activity.type === "confirmed" ? "bg-emerald-500/10" : "bg-muted"
                          }`}>
                            <Icon className={`h-3 w-3 ${
                              activity.type === "confirmed" ? "text-emerald-500" : "text-muted-foreground"
                            }`} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm truncate">{activity.title}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(activity.time)}</p>
                          </div>
                        </motion.div>
                      );
                    })
                  ) : (
                    <div className="text-center py-4">
                      <Activity className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                      <p className="text-sm text-muted-foreground">No recent activity</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Deals */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-medium">Recent Deals</CardTitle>
                  <CardDescription>Your most recent agreements</CardDescription>
                </div>
                <Link href="/dashboard/agreements">
                  <Button variant="outline" size="sm" className="text-xs gap-1">
                    View all
                    <ArrowRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-2">
                {recentDeals.map((deal, index) => {
                  const StatusIcon = statusConfig[deal.status].icon;
                  return (
                    <motion.div
                      key={deal.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Link href={`/d/${deal.publicId}`}>
                        <div className={`group p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors cursor-pointer ${
                          deal.status === "voided" ? "opacity-60" : ""
                        }`}>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-sm truncate">{deal.title}</h3>
                                <Badge 
                                  variant="outline"
                                  className="shrink-0 gap-1 text-xs h-5"
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig[deal.status].label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  {deal.recipientName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {timeAgo(deal.createdAt)}
                                </span>
                              </div>
                            </div>
                            <Eye className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </div>
                        </div>
                      </Link>
                    </motion.div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Quick Tips */}
          {stats.pending > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{stats.pending} pending</span>
                    <span className="text-muted-foreground"> — send reminders to get signatures faster</span>
                  </div>
                  <Link href="/dashboard/agreements?status=pending">
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
