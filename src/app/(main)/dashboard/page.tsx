"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ArrowRight,
  CheckCircle2,
  RefreshCw,
  Shield,
  Search,
  Inbox,
  CalendarDays,
  Lightbulb,
  ChevronRight,
  FileClock,
  Send,
  Download,
  Copy,
  Zap,
  BarChart3,
  Fingerprint,
  Mail,
  FileSignature,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deal } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo, formatDate } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction, sendDealInvitationAction } from "@/app/actions/deal-actions";
import { toast } from "sonner";
import { OnboardingModal } from "@/components/onboarding-modal";
import { cn } from "@/lib/utils";
import { dashboardStyles, isStaleDeal } from "@/lib/dashboard-ui";
import {
  CopyableId,
  statusConfig,
  getDealStatusConfig,
  DealRowSkeleton,
} from "@/components/dashboard/shared-components";
import { DashboardStats } from "@/components/dashboard/dashboard-stats";

// Deadline item type for upcoming deadlines widget
interface DeadlineItem {
  deal: Deal;
  date: string;
  label: string;
}

// --- CONFIG ---

const PRO_TIPS = [
  "Speed up your workflow: Duplicate any existing deal to create a new one instantly via the deal menu.",
  "Ensure enforceability: Always use a specific email address for recipients to enable direct tracking.",
  "Security first: Every deal is cryptographically sealed with a SHA-256 hash upon signing.",
  "Verification made easy: Verify any receipt by scanning the QR code or entering the Deal ID.",
  "Stay organized: Add a 'Due Date' field to templates to populate your Upcoming Deadlines widget.",
];

// statusConfig imported from shared-components

// --- UTILS ---

function getRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffTime = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays < 7) return `In ${diffDays} days`;
  return formatDate(dateStr);
}

// --- MICRO-COMPONENTS ---

const ScrambleText = ({ text, className }: { text: string; className?: string }) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = "0123456789abcdef";

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 2;
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{displayText}</span>;
};

// CopyableId imported from shared-components

// StatCard imported from shared-components

const MobileCreateAction = () => (
  <Link href="/deal/new" className="block sm:hidden">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="group relative bg-card hover:bg-muted/40 border hover:border-primary/20 transition-all duration-200 rounded-xl p-4 flex items-center justify-between shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
          <Zap className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="font-bold text-foreground text-sm">Create New Deal</div>
          <p className="text-xs text-muted-foreground">Start a new agreement</p>
        </div>
      </div>
      <div className="text-primary/50 group-hover:text-primary transition-colors">
        <ArrowRight className="h-5 w-5" />
      </div>
    </motion.div>
  </Link>
);

const DealRow = ({
  deal,
  userId,
  type,
  onAction,
  isActionLoading,
}: {
  deal: Deal;
  userId?: string;
  type: "inbox" | "pending" | "recent";
  onAction?: (deal: Deal) => void;
  isActionLoading?: boolean;
}) => {
  const router = useRouter(); // Use router for direct navigation
  const isCreator = deal.creatorId === userId;
  const config = getDealStatusConfig(deal, userId);
  const StatusIcon = config.icon;

  const iconBg = config.bg;
  const iconBorder = config.border;
  const iconColor = config.color;
  const isStale = isCreator && isStaleDeal(deal);

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        "group flex items-center justify-between p-3 rounded-xl hover:bg-muted/40 border border-transparent hover:border-border/50 transition-all cursor-pointer",
        isStale && "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 hover:border-amber-500/50"
      )}
    >
      <Link href={`/d/${deal.publicId}`} className="flex-1 flex items-center gap-4 min-w-0">
        <div
          className={cn(
            "h-9 w-9 rounded-lg flex items-center justify-center shrink-0 border shadow-sm transition-colors",
            iconBg,
            iconBorder,
            iconColor
          )}
        >
          <StatusIcon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap mb-0.5">
            <p className="font-semibold text-sm truncate max-w-[120px] sm:max-w-[200px] text-foreground">
              {deal.title}
            </p>

            <Badge
              variant={config.badgeVariant}
              className="h-5 px-1.5 text-[10px] font-medium border"
            >
              {config.label}
            </Badge>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground truncate">
            {isCreator ? (
              <span className="flex items-center gap-1.5 truncate">
                <Send className="h-3 w-3 shrink-0" />{" "}
                <span className="truncate">To {deal.recipientName}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 truncate">
                <Inbox className="h-3 w-3 shrink-0" />{" "}
                <span className="truncate">From {deal.creatorName}</span>
              </span>
            )}
            <span className="hidden xs:inline text-border">•</span>
            <span className="hidden xs:inline">{timeAgo(deal.createdAt)}</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 px-2">
        {/* Actions - Hover only */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {(() => {
            const isSignable = type === "inbox" || (!isCreator && deal.status === "pending");

            if (isSignable) {
              return (
                <Button
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2.5 text-[10px] font-medium shadow-sm gap-1.5 transition-all duration-200 bg-rose-500/50 text-white dark:text-rose-300 hover:bg-rose-500/75"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/d/public/${deal.publicId}`);
                  }}
                >
                  <FileSignature className="h-3 w-3" />
                  Sign
                </Button>
              );
            }

            if (deal.status === "confirmed") {
              return (
                 <Link href={`/verify?id=${deal.publicId}`} onClick={(e) => e.stopPropagation()}>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="h-7 px-2.5 text-[10px] font-medium shadow-sm gap-1.5 transition-all duration-200 hover:shadow-md hover:bg-emerald-500/10 text-emerald-600 active:scale-95"
                  >
                    <Shield className="h-3 w-3" />
                    Verify
                  </Button>
                </Link>
              );
            }

            // Nudge (Pending Creator) or Duplicate (Voided/Others) - Hover Only
             if (onAction) {
              const button = (
                <Button
                  size="sm"
                  variant="secondary"
                  className={cn(
                    "h-7 px-2.5 text-[10px] font-medium shadow-sm gap-1.5 transition-all duration-200",
                    "hover:shadow-md hover:bg-secondary/80 active:scale-95",
                    isStale && deal.status === "pending" && "bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-200 border-amber-500/50",
                    isActionLoading && "opacity-70 cursor-not-allowed"
                  )}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isActionLoading) onAction(deal);
                  }}
                  disabled={isActionLoading}
                >
                  {isActionLoading ? (
                    <RefreshCw className="h-3 w-3 animate-spin" />
                  ) : deal.status === "pending" ? (
                    <Zap className="h-3 w-3" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                  {isActionLoading
                    ? "Sending..."
                    : deal.status === "pending"
                      ? "Nudge"
                      : "Duplicate"}
                </Button>
              );

              if (isStale && deal.status === "pending") {
                return (
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>{button}</TooltipTrigger>
                    <TooltipContent side="top" className="text-[10px] bg-amber-500 text-amber-950 font-medium">
                      Stale deal (waiting &gt; 48h)
                    </TooltipContent>
                  </Tooltip>
                );
              }

              return button;
            }
            return null;
          })()}
        </div>

        {/* ID Badge - Middle */}
        <CopyableId id={deal.publicId} className="bg-background hidden sm:flex" />

        {/* Arrow - Far Right, Hover Only */}
        <Link href={`/d/${deal.publicId}`} className="hidden sm:block opacity-0 group-hover:opacity-100 transition-opacity">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </Link>
      </div>
    </motion.div>
  );
};

const ActivitySparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  const points = data
    .map((val, i) => {
      const x = (i / (data.length - 1)) * 100;
      const y = 100 - (val / max) * 80; // Scale to 80% height to leave room at top
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <div className="h-16 w-full relative">
      <svg
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full overflow-visible"
      >
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className="text-primary" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-primary" />
          </linearGradient>
        </defs>
        <path
          d={`M0,100 L0,${100 - (data[0] / max) * 80} ${points
            .split(" ")
            .map((p, _i) => `L${p}`)
            .join(" ")} L100,100 Z`}
          fill="url(#gradient)"
          className="text-primary"
        />
        <path
          d={`M0,${100 - (data[0] / max) * 80} ${points
            .split(" ")
            .map((p, _i) => `L${p}`)
            .join(" ")}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
};

export default function DashboardPage() {
  const router = useRouter();
  const { user, deals: storeDeals, setDeals, needsOnboarding, setNeedsOnboarding } = useAppStore();
  const [activeTab, setActiveTab] = useState<"priority" | "recent">("priority");
  const [verifyId, setVerifyId] = useState("");
  const [nudgeLoading, setNudgeLoading] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [currentDate, setCurrentDate] = useState("");
  const [tipIndex, setTipIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const hasInitializedRef = useRef(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted) return;
    const updateDateTime = () => {
      const now = new Date();
      setCurrentDate(
        now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })
      );
      setCurrentTime(now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }));
    };
    updateDateTime();
    const interval = setInterval(updateDateTime, 60000);
    return () => clearInterval(interval);
  }, [isMounted]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % PRO_TIPS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  const refreshDeals = useCallback(
    async (showLoading = false) => {
      if (!isSupabaseConfigured()) return;
      if (showLoading) setIsRefreshing(true);

      const { deals } = await getUserDealsAction();
      if (deals) setDeals(deals);

      setIsLoaded(true);
      if (showLoading) setTimeout(() => setIsRefreshing(false), 500);
    },
    [setDeals]
  );

  useEffect(() => {
    if (!hasInitializedRef.current && user && !user.id.startsWith("demo-")) {
      hasInitializedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshDeals(true);
    }
    const interval = setInterval(() => refreshDeals(false), 30000);
    return () => clearInterval(interval);
  }, [user, refreshDeals]);

  // Simplified local stats for UI elements outside the main stats grid
  const localStats = useMemo(() => {
    const inbox = storeDeals.filter(
      (d) => d.recipientEmail === user?.email && d.status === "pending"
    ).length;
    return { inbox };
  }, [storeDeals, user?.email]);

  const priorityQueue = useMemo(() => {
    const inbox = storeDeals
      .filter((d) => d.recipientEmail === user?.email && d.status === "pending")
      .map((d) => ({ ...d, queueType: "inbox" as const }));

    const pending = storeDeals
      .filter((d) => d.creatorId === user?.id && d.status === "pending")
      .map((d) => ({ ...d, queueType: "pending" as const }));

    return [...inbox, ...pending]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [storeDeals, user?.id, user?.email]);

  const recentDeals = useMemo(() => {
    return [...storeDeals]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, 5);
  }, [storeDeals]);

  const latestDeal = useMemo(() => {
    return [...storeDeals].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];
  }, [storeDeals]);

  const upcomingDeadlines = useMemo(() => {
    const dealsWithDates = storeDeals
      .filter((d) => d.status !== "voided" && d.status !== "confirmed")
      .map((d) => {
        const dateTerm = d.terms.find(
          (t) =>
            t.type === "date" ||
            t.label.toLowerCase().includes("date") ||
            t.label.toLowerCase().includes("deadline")
        );
        return dateTerm ? { deal: d, date: dateTerm.value, label: dateTerm.label } : null;
      })
      .filter((item): item is DeadlineItem => item !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);

    return dealsWithDates;
  }, [storeDeals]);

  const sparklineData = useMemo(() => {
    const now = new Date();
    const data: number[] = [];
    const dealTimestamps = storeDeals.map((deal) => new Date(deal.createdAt).getTime());

    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayStartTime = dayStart.getTime();

      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayEndTime = dayEnd.getTime();

      const dealsInDay = dealTimestamps.filter(
        (timestamp) => timestamp >= dayStartTime && timestamp <= dayEndTime
      ).length;

      data.push(dealsInDay);
    }

    return data;
  }, [storeDeals]);

  const handleNudge = async (deal: Deal) => {
    if (!deal.recipientEmail) {
      navigator.clipboard.writeText(`${window.location.origin}/d/public/${deal.publicId}`);
      toast.success("Link copied to clipboard!");
      return;
    }
    setNudgeLoading(deal.id);
    const result = await sendDealInvitationAction({ dealId: deal.id, recipientEmail: deal.recipientEmail });
    setNudgeLoading(null);

    if (result.success) {
      toast.success("Nudge sent", { description: "Reminder email delivered" });
      refreshDeals(false); // Refresh in background to clear stale state
    } else {
      toast.error(result.error || "Failed to send nudge");
    }
  };

  const handleDuplicate = (deal: Deal) => {
    router.push(`/deal/new?source=${deal.id}`);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyId.trim()) router.push(`/dashboard/verify?id=${verifyId.trim()}`);
  };

  // No early return for !user, we use isLoaded instead

  return (
    <>
      {needsOnboarding && <OnboardingModal onComplete={() => setNeedsOnboarding(false)} />}

      <div className={dashboardStyles.pageContainer}>
        {/* Header */}
        <div className={dashboardStyles.pageHeader}>
          <div className="min-w-0">
            <h1 className={dashboardStyles.pageTitle}>
              Welcome back,{" "}
              <span className="text-muted-foreground">{user?.name?.split(" ")[0] || "there"}</span>
            </h1>
            <p className={cn(dashboardStyles.pageDescription, "flex items-center gap-2")}>
              {isMounted && currentDate ? (
                <>
                  {currentDate}
                  <span className="w-1 h-1 rounded-full bg-border" />
                  <span className="font-mono text-xs">{currentTime}</span>
                </>
              ) : (
                <span className="opacity-0">Loading...</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              variant="ghost"
              size="sm"
              className={dashboardStyles.syncButton}
              onClick={() => refreshDeals(true)}
              disabled={isRefreshing}
            >
              <RefreshCw
                className={cn(dashboardStyles.iconMd, "sm:mr-1.5", isRefreshing && "animate-spin")}
              />
              <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync"}</span>
            </Button>
          </div>
        </div>

        <MobileCreateAction />

        {/* KPI Grid */}
        <DashboardStats deals={storeDeals} userEmail={user?.email} isLoading={!isLoaded} />

        {/* Main Dashboard Area */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left Column (2/3): Priority & Activity */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main List Card */}
            <Card className="h-auto lg:h-[424px] flex flex-col border border-border/50 shadow-card rounded-2xl overflow-hidden">
              <div className="px-6 py-4 flex items-center justify-between">
                <div className="flex gap-6">
                  <button
                    onClick={() => setActiveTab("priority")}
                    className={cn(
                      "text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer",
                      activeTab === "priority"
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Priority Queue
                    {localStats.inbox > 0 && (
                      <Badge className="text-[10px] h-5 px-2 bg-rose-500/15 text-rose-600 dark:text-rose-400 hover:bg-rose-500/25 border-0">
                        {localStats.inbox}
                      </Badge>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab("recent")}
                    className={cn(
                      "text-sm font-medium transition-colors cursor-pointer",
                      activeTab === "recent"
                        ? "text-primary font-semibold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    Recent Deals
                  </button>
                </div>
                <Link href="/dashboard/agreements">
                  <Button variant="ghost" size="sm" className="h-7 text-xs hidden sm:flex gap-1">
                    View All <ChevronRight className="h-3 w-3" />
                  </Button>
                </Link>
              </div>

              <CardContent className="p-3 flex-1 overflow-y-auto custom-scrollbar min-h-[300px] lg:min-h-0">
                <AnimatePresence mode="wait">
                  {!isLoaded ? (
                    <motion.div
                      key="loading-priority"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-1"
                    >
                      {[...Array(5)].map((_, _i) => (
                        <DealRowSkeleton key={_i} />
                      ))}
                    </motion.div>
                  ) : activeTab === "priority" ? (
                    <motion.div
                      // ...
                      key="priority"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {priorityQueue.length > 0 ? (
                        priorityQueue.map((deal) => (
                          <DealRow
                            key={deal.id}
                            deal={deal}
                            userId={user?.id || ""}
                            type={deal.queueType as "inbox" | "pending"}
                            onAction={
                              deal.queueType === "pending"
                                ? () => handleNudge(deal)
                                : deal.queueType === "inbox"
                                  ? () => router.push(`/d/public/${deal.publicId}`)
                                  : undefined
                            }
                            isActionLoading={nudgeLoading === deal.id}
                          />
                        ))
                      ) : (
                        <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
                          <div className="h-16 w-16 rounded-2xl bg-muted/50 flex items-center justify-center mb-4">
                            <CheckCircle2 className="h-8 w-8 opacity-20" />
                          </div>
                          <p className="font-semibold text-foreground">All caught up</p>
                          <p className="text-xs max-w-[200px] mt-1">
                            No pending actions or signatures required at the moment.
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ) : (
                    <motion.div
                      key="recent"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {recentDeals.map((deal) => (
                        <DealRow
                          key={deal.id}
                          deal={deal}
                          userId={user?.id || ""}
                            type="recent"
                            onAction={
                              deal.status === "pending"
                                ? () => handleNudge(deal)
                                : () => handleDuplicate(deal)
                            }
                            isActionLoading={
                              deal.status === "pending"
                                ? nudgeLoading === deal.id
                                : false
                            }
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
              <div className="p-3 border-t border-border/40 text-center sm:hidden bg-muted/10">
                <Link href="/dashboard/agreements">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full text-xs text-muted-foreground h-8"
                  >
                    View all agreements <ChevronRight className="h-3 w-3 ml-1" />
                  </Button>
                </Link>
              </div>
            </Card>

            {/* Deadlines Widget */}
            {(upcomingDeadlines.length > 0 || !isLoaded) && (
              <Card className="h-auto lg:h-[180px] flex flex-col border border-border/50 shadow-card rounded-2xl overflow-hidden">
                <div className="px-5 py-3">
                  <h3 className="text-sm font-medium flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-primary" />
                    Upcoming Deadlines
                  </h3>
                </div>
                <CardContent className="flex-1 overflow-y-auto custom-scrollbar p-0 pr-2 pl-2">
                  {!isLoaded ? (
                    <div className="p-3 space-y-3">
                      {[...Array(2)].map((_, i) => (
                        <div key={i} className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Skeleton className="h-8 w-1 rounded-full" />
                            <div className="space-y-1">
                              <Skeleton className="h-4 w-32" />
                              <Skeleton className="h-3 w-24 opacity-50" />
                            </div>
                          </div>
                          <Skeleton className="h-5 w-16" />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div>
                      {upcomingDeadlines.map((item: DeadlineItem) => (
                        <Link href={`/d/${item.deal.publicId}`} key={item.deal.id}>
                          <div className="group flex items-center justify-between text-sm p-3 hover:bg-muted/40 rounded-xl transition-colors cursor-pointer border border-transparent hover:border-border/50">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-8 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors" />
                              <div>
                                <p className="font-semibold text-foreground text-sm">
                                  {item.deal.title}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {item.label}: {formatDate(item.date)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] whitespace-nowrap border-border bg-background"
                              >
                                {getRelativeTime(item.date)}
                              </Badge>
                              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right Column (1/3): Context & Tools */}
          <div className="space-y-6">
            {/* Latest Snapshot - Mini Receipt Style */}
            <Card className="h-[200px] overflow-hidden border border-border/50 shadow-card rounded-2xl flex flex-col bg-background">
              <div className="px-5 py-3 flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <FileClock className="h-4 w-4 text-primary" />
                  Latest Activity
                </h3>
                {latestDeal && <CopyableId id={latestDeal.publicId} className="bg-secondary/30" />}
              </div>
              <CardContent className="p-4 flex-1 flex flex-col justify-between">
                {!isLoaded ? (
                  <div className="flex items-start gap-3">
                    <Skeleton className="h-10 w-10 rounded-xl shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-12" />
                      </div>
                      <Skeleton className="h-3 w-32" />
                      <Skeleton className="h-3 w-16 opacity-50" />
                    </div>
                  </div>
                ) : latestDeal ? (
                  // ...
                  <>
                    <div className="flex items-start gap-3">
                      <div className="h-10 w-10 rounded-xl bg-primary/5 flex items-center justify-center shrink-0 border border-primary/10">
                        <Fingerprint className="h-5 w-5 text-primary" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="font-bold text-sm truncate pr-2">{latestDeal.title}</p>
                          {(() => {
                            const config = getDealStatusConfig(latestDeal, user?.id, user?.email);
                            return (
                              <Badge variant={config.badgeVariant} className="text-[10px] h-5 px-1.5">
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {latestDeal.status === "confirmed" ? "Signed by" : "Sent to"}{" "}
                          {latestDeal.recipientName}
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-1 font-mono opacity-80">
                          {formatDate(latestDeal.createdAt)}
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <Link href={`/d/${latestDeal.publicId}`} className="w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs rounded-lg"
                        >
                          View
                        </Button>
                      </Link>
                      {latestDeal.status === "confirmed" ? (
                        <Link href={`/verify?id=${latestDeal.publicId}`} className="w-full">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="w-full h-8 text-xs gap-1 rounded-lg hover:bg-emerald-500/10 text-emerald-600"
                          >
                            <Shield className="h-3 w-3" /> Verify
                          </Button>
                        </Link>
                      ) : !latestDeal.creatorId || latestDeal.creatorId !== user?.id ? (
                        <Link href={`/d/public/${latestDeal.publicId}`} className="w-full">
                          <Button
                            variant="default"
                            size="sm"
                            className="w-full h-8 text-xs gap-1 rounded-lg  text-white dark:text-rose-300 bg-rose-500/50 hover:bg-rose-500/75"
                          >
                            <FileSignature className="h-3 w-3" /> Sign
                          </Button>
                        </Link>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full h-8 text-xs gap-1 rounded-lg"
                          onClick={() => handleNudge(latestDeal)}
                          disabled={nudgeLoading === latestDeal.id}
                        >
                          {nudgeLoading === latestDeal.id ? (
                            <RefreshCw className="h-3 w-3 animate-spin" />
                          ) : (
                            <Zap className="h-3 w-3" />
                          )}
                          Nudge
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-center text-muted-foreground text-xs">
                    No deals created yet.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Analytics Graph */}
            <Card className="h-[200px] flex flex-col border border-border/50 shadow-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Volume
                </h3>
                <Badge variant="secondary" className="text-[10px] h-5 border-0 bg-background/50">
                  7 Days
                </Badge>
              </div>
              <CardContent className="px-5 pb-0 pt-4 flex-1 flex flex-col">
                {!isLoaded ? (
                  <div className="space-y-4">
                    <div className="flex items-baseline gap-2">
                      <Skeleton className="h-9 w-12" />
                      <Skeleton className="h-4 w-20 opacity-50" />
                    </div>
                    <Skeleton className="h-16 w-full opacity-30" />
                  </div>
                ) : (
                  <>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold tracking-tight">{storeDeals.length}</div>
                      <span className="text-xs text-muted-foreground font-medium">total deals</span>
                    </div>
                    <ActivitySparkline data={sparklineData} />
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Verify */}
            <Card className="h-auto lg:h-[180px] flex flex-col border border-border/50 shadow-card rounded-2xl overflow-hidden">
              <div className="px-5 py-3">
                <h3 className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4 text-primary" />
                  Quick Verify
                </h3>
              </div>
              <CardContent className="p-5 flex flex-col justify-center h-full">
                <form onSubmit={handleVerify} className="space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Deal ID or Hash..."
                      className="pl-9 h-10 text-xs font-mono bg-background border-border/60 focus:bg-background transition-colors"
                      value={verifyId}
                      onChange={(e) => setVerifyId(e.target.value)}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="sm"
                    className={cn(
                      "w-full h-9 text-xs font-medium rounded-lg shadow-sm transition-all duration-200",
                      verifyId.trim()
                        ? "hover:shadow-md active:scale-95"
                        : "opacity-50 cursor-not-allowed"
                    )}
                    disabled={!verifyId.trim()}
                  >
                    Verify Authenticity
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Footer Tip */}
        <motion.div
          key={tipIndex}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:px-6 rounded-xl border border-dashed bg-muted/30 text-xs text-muted-foreground px-4 mx-auto"
        >
          <div className="flex items-center gap-2 shrink-0">
            <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
            <span className="font-medium text-foreground">Pro Tip:</span>
          </div>
          <div className="min-w-0 flex-1">
            <span className="block sm:hidden leading-relaxed">{PRO_TIPS[tipIndex]}</span>
            <span className="hidden sm:block">
              <ScrambleText text={PRO_TIPS[tipIndex]} />
            </span>
          </div>
        </motion.div>
      </div>
    </>
  );
}
