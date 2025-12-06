"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  TrendingUp,
  Shield,
  Activity,
  Search,
  ExternalLink,
  Inbox,
  CalendarDays,
  Lightbulb,
  ChevronRight,
  Timer,
  FileClock,
  Send,
  Download,
  Copy,
  Check,
  Zap,
  BarChart3,
  Edit3
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deal } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo, formatDate } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction, sendDealInvitationAction } from "@/app/actions/deal-actions";
import { OnboardingModal } from "@/components/onboarding-modal";

// --- CONFIG ---

const PRO_TIPS = [
  "Speed up your workflow: Duplicate any existing deal to create a new one instantly via the deal menu.",
  "Ensure enforceability: Always use a specific email address for recipients to enable direct tracking.",
  "Security first: Every deal is cryptographically sealed with a SHA-256 hash upon signing.",
  "Verification made easy: Verify any receipt by scanning the QR code or entering the Deal ID.",
  "Stay organized: Add a 'Due Date' field to templates to populate your Upcoming Deadlines widget."
];

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

// Calculate time difference between created and confirmed dates in minutes
function getSignTimeMinutes(deal: Deal): number {
  if (!deal.confirmedAt || !deal.createdAt) return 0;
  const created = new Date(deal.createdAt).getTime();
  const confirmed = new Date(deal.confirmedAt).getTime();
  return (confirmed - created) / (1000 * 60);
}

// Format minutes into a readable time string
function formatTimeValue(hours: number, minutes: number): string {
  if (hours > 0) return `~${hours}h`;
  if (minutes > 0) return `~${minutes}m`;
  return "N/A";
}

// Format trend value for time display
function formatTimeTrend(minutes: number): string | undefined {
  if (minutes === 0) return undefined;
  const absMinutes = Math.abs(minutes);
  if (absMinutes >= 60) {
    const hours = Math.round(minutes / 60);
    return `${minutes > 0 ? '+' : ''}${hours}h`;
  }
  return `${minutes > 0 ? '+' : ''}${Math.round(minutes)}m`;
}

// Format completion rate trend value
function formatCompletionRateTrend(trend: number): string | undefined {
  if (trend === 0) return undefined;
  return `${trend > 0 ? '+' : ''}${Math.round(trend)}%`;
}

// --- MICRO-COMPONENTS ---

const ScrambleText = ({ text, className }: { text: string; className?: string }) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = "0123456789abcdef";

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText((prev) =>
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

const CopyableId = ({ id, className }: { id: string, className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <Badge
      variant="outline"
      className={`font-mono cursor-pointer hover:bg-secondary/80 transition-colors group/id gap-1.5 ${className}`}
      onClick={handleCopy}
      title="Click to copy Deal ID"
    >
      {id}
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover/id:opacity-100 transition-opacity" />
      )}
    </Badge>
  );
};

const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
  trendDirection = "up",
  href,
  delay = 0
}: {
  label: string,
  value: string | number,
  icon: any,
  trend?: string,
  trendDirection?: "up" | "down" | "neutral",
  href: string,
  delay?: number
}) => (
  <Link href={href} className="block h-full">
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="group relative h-full bg-card hover:bg-muted/40 border hover:border-primary/20 transition-all duration-200 rounded-xl p-4 sm:p-5 flex flex-col justify-between"
    >
      <div className="flex justify-between items-start mb-2">
        <div className="p-2 rounded-lg bg-secondary/50 group-hover:bg-background transition-colors">
          <Icon className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
        </div>
        {trend && (
          <Badge variant="secondary" className={`text-[10px] h-5 px-1.5 font-medium border-0 ${
            trendDirection === "up" ? "bg-emerald-500/10 text-emerald-600" :
            trendDirection === "down" ? "bg-amber-500/10 text-amber-600" : "bg-muted text-muted-foreground"
          }`}>
            {trend}
          </Badge>
        )}
      </div>
      <div>
        <div className="text-2xl font-bold tracking-tight text-foreground group-hover:translate-x-0.5 transition-transform">
          {value}
        </div>
        <p className="text-xs text-muted-foreground font-medium mt-1 group-hover:text-foreground/80 transition-colors truncate">
          {label}
        </p>
      </div>
    </motion.div>
  </Link>
);

const MobileCreateAction = () => (
  <Link href="/deal/new" className="block sm:hidden px-4 sm:px-0">
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

const DealRow = ({ deal, userId, type, onAction }: { deal: Deal, userId?: string, type: "inbox" | "pending" | "recent", onAction?: (deal: Deal) => void }) => {
  const isCreator = deal.creatorId === userId;
  const isInbox = !isCreator;

  const statusConfig = {
    pending: { label: "Pending", bg: "bg-amber-500/10", text: "text-amber-600", icon: Clock },
    sealing: { label: "Sealing", bg: "bg-blue-500/10", text: "text-blue-600", icon: RefreshCw },
    confirmed: { label: "Confirmed", bg: "bg-emerald-500/10", text: "text-emerald-600", icon: CheckCircle2 },
    voided: { label: "Voided", bg: "bg-destructive/10", text: "text-destructive", icon: XCircle },
  }[deal.status];

  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="group flex items-center justify-between p-3 rounded-lg hover:bg-secondary/40 border border-transparent hover:border-border/50 transition-all cursor-pointer"
    >
      <Link href={`/d/${deal.publicId}`} className="flex-1 flex items-center gap-3 min-w-0">
        <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${statusConfig.bg} ${statusConfig.text}`}>
          <StatusIcon className="h-4.5 w-4.5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
            <p className="font-medium text-sm truncate max-w-[120px] sm:max-w-[200px]">{deal.title}</p>

            {/* Status Label Restored */}
            <Badge variant="outline" className={`h-4 px-1.5 text-[10px] font-medium border-0 ${statusConfig.bg} ${statusConfig.text}`}>
              {statusConfig.label}
            </Badge>

            {isInbox && deal.status === 'pending' && <Badge variant="warning" className="h-4 px-1 text-[10px]">Sign</Badge>}
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground truncate">
            {isCreator ? (
              <span className="flex items-center gap-1 truncate">
                <Send className="h-3 w-3 shrink-0" /> <span className="truncate">To {deal.recipientName}</span>
              </span>
            ) : (
              <span className="flex items-center gap-1 truncate">
                <Inbox className="h-3 w-3 shrink-0" /> <span className="truncate">From {deal.creatorName}</span>
              </span>
            )}
            <span className="hidden xs:inline">•</span>
            <span className="hidden xs:inline">{timeAgo(deal.createdAt)}</span>
          </div>
        </div>
      </Link>

      <div className="flex items-center gap-2 px-2">
        {/* ID Badge - Hidden on mobile to save width */}
        <CopyableId id={deal.publicId} className="h-5 text-[10px] px-1.5 hidden sm:flex" />

        {/* Actions */}
        <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
          {onAction && (
            <Button
              size="sm"
              variant="ghost"
              className="h-7 px-2 text-xs"
              onClick={(e) => {
                e.stopPropagation();
                onAction(deal);
              }}
            >
              {type === 'pending' ? 'Nudge' : type === 'recent' ? 'Duplicate' : 'Action'}
            </Button>
          )}
          <Link href={`/d/${deal.publicId}`} className="hidden sm:block">
            <Button size="icon" variant="ghost" className="h-7 w-7">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </Link>
        </div>
      </div>
    </motion.div>
  );
};

const ActivitySparkline = ({ data }: { data: number[] }) => {
  const max = Math.max(...data, 1);
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - (val / max) * 100;
    return `${x},${y}`;
  }).join(" ");

  return (
    <div className="h-16 w-full mt-auto">
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-full w-full overflow-visible">
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.2" className="text-primary" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0" className="text-primary" />
          </linearGradient>
        </defs>
        <path
          d={`M0,100 L0,${100 - (data[0]/max)*100} ${points.split(' ').map((p, i) => `L${p}`).join(' ')} L100,100 Z`}
          fill="url(#gradient)"
          className="text-primary"
        />
        <path
          d={`M0,${100 - (data[0]/max)*100} ${points.split(' ').map((p, i) => `L${p}`).join(' ')}`}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="text-primary"
          vectorEffect="non-scaling-stroke"
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
  const [tipIndex, setTipIndex] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasInitializedRef = useRef(false);

  // Note: Auth is now handled by middleware (server-side)
  // No client-side redirect needed - middleware already protected this route

  // Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Tip Rotation
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % PRO_TIPS.length);
    }, 12000);
    return () => clearInterval(interval);
  }, []);

  // Data Fetching & Auto-Refresh
  const refreshDeals = useCallback(async (showLoading = false) => {
    if (!isSupabaseConfigured()) return;
    if (showLoading) setIsRefreshing(true);

    const { deals } = await getUserDealsAction();
    if (deals) setDeals(deals);

    if (showLoading) setTimeout(() => setIsRefreshing(false), 500);
  }, [setDeals]);

  useEffect(() => {
    if (!hasInitializedRef.current && user && !user.id.startsWith("demo-")) {
      hasInitializedRef.current = true;
      refreshDeals();
    }

    // Auto-refresh every 30 seconds
    const interval = setInterval(() => refreshDeals(false), 30000);
    return () => clearInterval(interval);
  }, [user, refreshDeals]);

  // --- DERIVED DATA ---

  const stats = useMemo(() => {
    const total = storeDeals.length;
    const confirmed = storeDeals.filter(d => d.status === "confirmed").length;
    const pending = storeDeals.filter(d => d.status === "pending").length;
    const inbox = storeDeals.filter(d => d.recipientEmail === user?.email && d.status === "pending").length;
    
    // Calculate actual average signing time from confirmed deals
    const signedDeals = storeDeals.filter(d => d.status === "confirmed" && d.confirmedAt && d.createdAt);
    let avgTimeHours = 0;
    let avgTimeMinutes = 0;
    
    if (signedDeals.length > 0) {
      const totalMinutes = signedDeals.reduce((sum, deal) => sum + getSignTimeMinutes(deal), 0);
      const avgMinutes = totalMinutes / signedDeals.length;
      avgTimeHours = Math.floor(avgMinutes / 60);
      avgTimeMinutes = Math.round(avgMinutes % 60);
    }

    // Calculate completion rate trend (comparing last 7 days vs previous 7 days)
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    
    const recentDeals = storeDeals.filter(d => new Date(d.createdAt) >= sevenDaysAgo);
    const previousDeals = storeDeals.filter(d => {
      const createdAt = new Date(d.createdAt);
      return createdAt >= fourteenDaysAgo && createdAt < sevenDaysAgo;
    });
    
    const recentCompleted = recentDeals.filter(d => d.status === "confirmed").length;
    const previousCompleted = previousDeals.filter(d => d.status === "confirmed").length;
    
    const recentRate = recentDeals.length > 0 ? (recentCompleted / recentDeals.length) * 100 : 0;
    const previousRate = previousDeals.length > 0 ? (previousCompleted / previousDeals.length) * 100 : 0;
    const completionRateTrend = recentRate - previousRate;

    // Calculate average sign time trend (comparing last 5 deals vs previous 5 deals)
    const sortedConfirmedDeals = signedDeals.toSorted((a, b) => 
      new Date(b.confirmedAt!).getTime() - new Date(a.confirmedAt!).getTime()
    );
    
    let avgTimeMinutesTrend = 0;
    if (sortedConfirmedDeals.length >= 2) {
      const recentFive = sortedConfirmedDeals.slice(0, 5);
      const previousFive = sortedConfirmedDeals.slice(5, 10);
      
      if (recentFive.length > 0) {
        const recentAvg = recentFive.reduce((sum, deal) => sum + getSignTimeMinutes(deal), 0) / recentFive.length;
        
        if (previousFive.length > 0) {
          const previousAvg = previousFive.reduce((sum, deal) => sum + getSignTimeMinutes(deal), 0) / previousFive.length;
          avgTimeMinutesTrend = recentAvg - previousAvg; // Negative means improvement (faster)
        }
      }
    }

    return { 
      total, 
      confirmed, 
      pending, 
      inbox, 
      avgTimeHours, 
      avgTimeMinutes,
      completionRateTrend,
      avgTimeMinutesTrend
    };
  }, [storeDeals, user?.email]);

  const priorityQueue = useMemo(() => {
    const inbox = storeDeals
      .filter(d => d.recipientEmail === user?.email && d.status === "pending")
      .map(d => ({ ...d, queueType: "inbox" as const }));

    const pending = storeDeals
      .filter(d => d.creatorId === user?.id && d.status === "pending")
      .map(d => ({ ...d, queueType: "pending" as const }));

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
    return [...storeDeals].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
  }, [storeDeals]);

  const upcomingDeadlines = useMemo(() => {
    const dealsWithDates = storeDeals
      .filter(d => d.status !== "voided" && d.status !== "confirmed")
      .map(d => {
        const dateTerm = d.terms.find(t => t.type === "date" || t.label.toLowerCase().includes("date") || t.label.toLowerCase().includes("deadline"));
        return dateTerm ? { deal: d, date: dateTerm.value, label: dateTerm.label } : null;
      })
      .filter(Boolean)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .slice(0, 3);

    return dealsWithDates;
  }, [storeDeals]);

  // Calculate sparkline data from last 7 days of deal creation activity
  const sparklineData = useMemo(() => {
    const now = new Date();
    const data: number[] = [];
    
    // Pre-convert all deal creation dates to timestamps for efficient comparison
    const dealTimestamps = storeDeals.map(deal => new Date(deal.createdAt).getTime());
    
    // Generate data for last 7 days
    for (let i = 6; i >= 0; i--) {
      const dayStart = new Date(now);
      dayStart.setDate(now.getDate() - i);
      dayStart.setHours(0, 0, 0, 0);
      const dayStartTime = dayStart.getTime();
      
      const dayEnd = new Date(dayStart);
      dayEnd.setHours(23, 59, 59, 999);
      const dayEndTime = dayEnd.getTime();
      
      const dealsInDay = dealTimestamps.filter(timestamp => 
        timestamp >= dayStartTime && timestamp <= dayEndTime
      ).length;
      
      data.push(dealsInDay);
    }
    
    return data;
  }, [storeDeals]);

  // --- ACTIONS ---

  const handleNudge = async (deal: Deal) => {
    if (!deal.recipientEmail) {
      navigator.clipboard.writeText(`${window.location.origin}/d/${deal.publicId}`);
      alert("Link copied to clipboard!");
      return;
    }
    setNudgeLoading(deal.id);
    await sendDealInvitationAction({ dealId: deal.id, recipientEmail: deal.recipientEmail });
    setNudgeLoading(null);
    alert("Nudge email sent!");
  };

  const handleDuplicate = (deal: Deal) => {
    router.push(`/deal/new?source=${deal.id}`);
  };

  const handleVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyId.trim()) router.push(`/verify?id=${verifyId.trim()}`);
  };

  if (!user) return null;

  return (
    <>
      {needsOnboarding && <OnboardingModal onComplete={() => setNeedsOnboarding(false)} />}

      <DashboardLayout title="Home">
        <div className="space-y-6 max-w-7xl mx-auto px-0 sm:px-4 lg:px-8">

          {/* Header */}
          <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40 px-4 sm:px-0">
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">
                Welcome back, <span className="text-muted-foreground">{user.name?.split(" ")[0]}</span>
              </h1>
              <p className="text-muted-foreground text-xs sm:text-sm flex items-center gap-2">
                {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                <span className="w-1 h-1 rounded-full bg-border" />
                <span className="font-mono text-xs">{currentTime}</span>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-foreground h-9 px-2 sm:px-3"
                onClick={() => refreshDeals(true)}
                disabled={isRefreshing}
              >
                <RefreshCw className={`h-4 w-4 sm:mr-1.5 ${isRefreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync"}</span>
              </Button>
            </div>
          </div>

          {/* Mobile Create Action */}
          <MobileCreateAction />

          {/* KPI Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 px-4 sm:px-0">
            <StatCard
              label="Action Required"
              value={stats.inbox}
              icon={Inbox}
              trend={stats.inbox > 0 ? "Attention" : "All Clear"}
              trendDirection={stats.inbox > 0 ? "down" : "neutral"}
              href="/dashboard/inbox"
              delay={0}
            />
            <StatCard
              label="Active Deals"
              value={stats.pending}
              icon={Activity}
              trend="Awaiting"
              trendDirection="neutral"
              href="/dashboard/agreements?status=pending"
              delay={0.1}
            />
            <StatCard
              label="Completion Rate"
              value={stats.total > 0 ? `${Math.round((stats.confirmed / stats.total) * 100)}%` : "0%"}
              icon={TrendingUp}
              trend={formatCompletionRateTrend(stats.completionRateTrend)}
              trendDirection={stats.completionRateTrend > 0 ? "up" : stats.completionRateTrend < 0 ? "down" : "neutral"}
              href="/dashboard/agreements"
              delay={0.2}
            />
            <StatCard
              label="Avg. Sign Time"
              value={formatTimeValue(stats.avgTimeHours, stats.avgTimeMinutes)}
              icon={Timer}
              trend={formatTimeTrend(stats.avgTimeMinutesTrend)}
              trendDirection={stats.avgTimeMinutesTrend < 0 ? "up" : stats.avgTimeMinutesTrend > 0 ? "down" : "neutral"}
              href="/dashboard/agreements"
              delay={0.3}
            />
          </div>

          {/* Main Dashboard Area */}
          <div className="grid lg:grid-cols-3 gap-6 px-4 sm:px-0">

            {/* Left Column (2/3): Priority & Activity */}
            <div className="lg:col-span-2 space-y-6">

              {/* Main List Card - Fixed Height Alignment (Desktop) */}
              <Card className="h-auto lg:h-[424px] flex flex-col">
                <CardHeader className="pb-2 border-b border-border/40">
                  <div className="flex items-center justify-between">
                    <div className="flex gap-4">
                      <button
                        onClick={() => setActiveTab("priority")}
                        className={`text-sm font-medium pb-2 border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
                          activeTab === "priority" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Priority Queue
                        {stats.inbox > 0 && <Badge variant="warning" className="text-[10px] h-4 px-1">{stats.inbox}</Badge>}
                      </button>
                      <button
                        onClick={() => setActiveTab("recent")}
                        className={`text-sm font-medium pb-2 border-b-2 transition-colors cursor-pointer ${
                          activeTab === "recent" ? "border-primary text-primary" : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        Recent Deals
                      </button>
                    </div>
                    <Link href="/dashboard/agreements">
                      <Button variant="ghost" size="sm" className="h-7 text-xs hidden sm:flex">View All</Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent className="p-2 flex-1 overflow-y-auto custom-scrollbar min-h-[300px] lg:min-h-0">
                  <AnimatePresence mode="wait">
                    {activeTab === "priority" ? (
                      <motion.div
                        key="priority"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1"
                      >
                        {priorityQueue.length > 0 ? (
                          priorityQueue.map((deal) => (
                            <DealRow
                              key={deal.id}
                              deal={deal}
                              userId={user.id}
                              type={deal.queueType as "inbox" | "pending"}
                              onAction={deal.queueType === "pending" ? () => handleNudge(deal) : undefined}
                            />
                          ))
                        ) : (
                          <div className="h-64 flex flex-col items-center justify-center text-center text-muted-foreground">
                            <div className="h-12 w-12 rounded-full bg-muted/50 flex items-center justify-center mb-3">
                              <CheckCircle2 className="h-6 w-6 opacity-20" />
                            </div>
                            <p className="font-medium">All caught up</p>
                            <p className="text-xs max-w-[200px] mt-1">No pending actions or signatures required at the moment.</p>
                          </div>
                        )}
                      </motion.div>
                    ) : (
                      <motion.div
                        key="recent"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-1"
                      >
                        {recentDeals.map((deal) => (
                          <DealRow
                            key={deal.id}
                            deal={deal}
                            userId={user.id}
                            type="recent"
                            onAction={() => handleDuplicate(deal)}
                          />
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
                <div className="p-2 border-t border-border/40 text-center sm:hidden">
                  <Link href="/dashboard/agreements">
                    <Button variant="ghost" size="sm" className="w-full text-xs text-muted-foreground h-8">
                      View all agreements <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </Link>
                </div>
              </Card>

              {/* Deadlines Widget - Height Matched to Verify */}
              {upcomingDeadlines.length > 0 && (
                <Card className="h-auto lg:h-[180px] flex flex-col">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <CalendarDays className="h-4 w-4 text-muted-foreground" />
                      Upcoming Deadlines
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                      {upcomingDeadlines.map((item: any) => (
                        <Link href={`/d/${item.deal.publicId}`} key={item.deal.id}>
                          <div className="group flex items-center justify-between text-sm p-2 hover:bg-muted/30 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-border/50">
                            <div className="flex items-center gap-3">
                              <div className="w-1 h-8 bg-primary/20 rounded-full group-hover:bg-primary/40 transition-colors" />
                              <div>
                                <p className="font-medium">{item.deal.title}</p>
                                <p className="text-xs text-muted-foreground">{item.label}: {formatDate(item.date)}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge variant="outline" className="font-mono text-xs whitespace-nowrap">
                                {getRelativeTime(item.date)}
                              </Badge>
                              <ChevronRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right Column (1/3): Context & Tools */}
            <div className="space-y-6">

              {/* Latest Snapshot - Fixed Height 200px */}
              <Card className="h-[200px] overflow-hidden border-primary/20 bg-gradient-to-b from-card to-muted/20 flex flex-col">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <FileClock className="h-4 w-4 text-primary" />
                    Most Recent Deal
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4 flex-1 flex flex-col justify-between">
                  {latestDeal ? (
                    <>
                      <div className="p-3 bg-background rounded-lg border shadow-sm">
                        <div className="flex justify-between items-start mb-1">
                          {latestDeal.status === 'confirmed' ? (
                            <Badge variant="success" className="text-[10px] h-4 px-1">Confirmed</Badge>
                          ) : latestDeal.status === 'voided' ? (
                            <Badge variant="destructive" className="text-[10px] h-4 px-1">Voided</Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px] h-4 px-1">Pending</Badge>
                          )}
                          <CopyableId id={latestDeal.publicId} className="h-4 text-[10px] px-1" />
                        </div>
                        <p className="font-semibold truncate text-sm">{latestDeal.title}</p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {latestDeal.status === 'confirmed' ? 'Signed by' : 'Sent to'} {latestDeal.recipientName}
                        </p>
                      </div>
                      <div className="flex gap-2 mt-2">
                        <Link href={`/d/${latestDeal.publicId}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full h-8 text-xs">View Details</Button>
                        </Link>
                        {latestDeal.status === 'confirmed' && (
                          <Button variant="secondary" size="sm" className="flex-1 h-8 text-xs gap-1">
                            <Download className="h-3 w-3" /> Receipt
                          </Button>
                        )}
                        {latestDeal.status === 'pending' && (
                          <Button
                            variant="secondary"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => handleNudge(latestDeal)}
                            disabled={nudgeLoading === latestDeal.id}
                          >
                            {nudgeLoading === latestDeal.id ? <RefreshCw className="h-3 w-3 animate-spin" /> : "Nudge"}
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

              {/* Analytics Graph - Fixed Height 200px */}
              <Card className="h-[200px] flex flex-col">
                <CardHeader className="pb-2 pt-4 px-4">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Deal Volume
                    </CardTitle>
                    <Badge variant="secondary" className="text-[10px] h-5 border-0 bg-secondary">7 Days</Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-4 pb-0 flex-1 flex flex-col">
                  <div className="text-2xl font-bold">{stats.total}</div>
                  <p className="text-xs text-muted-foreground mb-2">Total agreements created</p>
                  <ActivitySparkline data={sparklineData} />
                </CardContent>
              </Card>

              {/* Quick Verify - Height Matched to Deadlines (180px) */}
              <Card className="h-auto lg:h-[180px] flex flex-col justify-center">
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground" />
                    Quick Verify
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <form onSubmit={handleVerify} className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                      <Input
                        placeholder="Deal ID or Hash..."
                        className="pl-8 h-9 text-xs font-mono"
                        value={verifyId}
                        onChange={(e) => setVerifyId(e.target.value)}
                      />
                    </div>
                    <Button type="submit" size="sm" variant="secondary" className="w-full h-8 text-xs">
                      Verify Authenticity
                    </Button>
                  </form>
                </CardContent>
              </Card>

            </div>
          </div>

          {/* Footer Tip - Optimized for mobile wrapping & desktop single-line */}
          <motion.div
            key={tipIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-3 p-3 sm:px-6 rounded-lg border border-dashed bg-muted/20 text-xs text-muted-foreground px-4 mx-auto"
          >
            <div className="flex items-center gap-2 shrink-0">
              <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
              <span className="font-medium text-foreground">Pro Tip:</span>
            </div>
            <div className="min-w-0 flex-1">
              <span className="block sm:hidden leading-relaxed">
                {PRO_TIPS[tipIndex]}
              </span>
              <span className="hidden sm:block">
                <ScrambleText text={PRO_TIPS[tipIndex]} />
              </span>
            </div>
          </motion.div>

        </div>
      </DashboardLayout>
    </>
  );
}
