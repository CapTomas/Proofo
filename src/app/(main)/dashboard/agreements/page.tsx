"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Inbox,
  Send,
  ArrowUpRight,
  FileCheck,
  LayoutGrid,
  List as ListIcon,
  Mail,
  Copy as DuplicateIcon,
  ShieldCheck,
  RotateCcw
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deal, DealStatus } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction, voidDealAction, sendDealInvitationAction } from "@/app/actions/deal-actions";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// --- CONFIG & UTILS ---

const statusConfig: Record<DealStatus, { label: string; color: string; icon: any; bg: string; border: string; badgeVariant: "warning" | "success" | "destructive" | "secondary" }> = {
  pending: {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: Clock,
    badgeVariant: "warning"
  },
  sealing: {
    label: "Sealing",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/20",
    icon: RefreshCw,
    badgeVariant: "secondary"
  },
  confirmed: {
    label: "Sealed",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/20",
    icon: CheckCircle2,
    badgeVariant: "success"
  },
  voided: {
    label: "Voided",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/20",
    icon: XCircle,
    badgeVariant: "destructive"
  },
};

// --- MICRO COMPONENTS ---

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
      className={cn(
        "font-mono cursor-pointer hover:bg-secondary/80 transition-colors group/id gap-1.5 h-5 px-1.5 text-[10px]",
        className
      )}
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
  isActive,
  onClick,
  colorClass = "text-primary",
  delay = 0
}: {
  label: string,
  value: string | number,
  icon: any,
  isActive?: boolean,
  onClick?: () => void,
  colorClass?: string,
  delay?: number
}) => (
  <motion.div
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={cn(
      "group relative h-full bg-card hover:bg-card/80 border transition-all duration-200 rounded-2xl p-4 flex flex-col justify-between cursor-pointer",
      isActive
        ? "border-primary/50 shadow-md ring-1 ring-primary/10"
        : "border-border/50 hover:border-primary/20 shadow-sm hover:shadow-md"
    )}
    onClick={onClick}
  >
    <div className="flex justify-between items-start mb-2">
      <div className={cn(
        "p-2 rounded-xl transition-colors",
        isActive ? "bg-primary/10 text-primary" : `bg-secondary/50 group-hover:bg-primary/10 ${colorClass.replace('text-', 'group-hover:text-')}`
      )}>
        <Icon className={cn(
          "h-4 w-4 transition-colors",
          isActive ? "text-primary" : "text-muted-foreground group-hover:text-current"
        )} />
      </div>
    </div>
    <div>
      <div className="text-2xl font-bold tracking-tight text-foreground group-hover:translate-x-0.5 transition-transform">
        {value}
      </div>
      <p className="text-xs text-muted-foreground font-medium mt-0.5 group-hover:text-foreground/80 transition-colors truncate">
        {label}
      </p>
    </div>
  </motion.div>
);

const DealCard = ({
  deal,
  userId,
  onNudge,
  onVoid,
  onDuplicate,
  isVoiding,
  isNudging,
  nudgeSuccess
}: {
  deal: Deal;
  userId?: string;
  onNudge: (deal: Deal) => void;
  onVoid: (id: string) => void;
  onDuplicate: (deal: Deal) => void;
  isVoiding: string | null;
  isNudging: string | null;
  nudgeSuccess: string | null;
}) => {
  const isCreator = deal.creatorId === userId;
  const config = statusConfig[deal.status];
  const Icon = config.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="group relative"
    >
      <Link href={`/d/${deal.publicId}`}>
        <Card className={cn(
          "h-full border hover:border-primary/30 transition-all duration-300 hover:shadow-card overflow-hidden bg-card",
          deal.status === 'voided' && "opacity-60 grayscale-[0.5]"
        )}>
          <CardContent className="p-4 flex flex-col h-full">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn(
                  "h-9 w-9 rounded-lg flex items-center justify-center border shadow-sm transition-colors shrink-0",
                  config.bg, config.border, config.color
                )}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">{deal.title}</span>
                    <Badge variant={config.badgeVariant} className="h-5 px-1.5 text-[10px] font-medium border">
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                    {isCreator ? <Send className="h-3 w-3 shrink-0" /> : <Inbox className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{isCreator ? `To ${deal.recipientName}` : `From ${deal.creatorName}`}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Terms Preview */}
            <div className="flex-1 space-y-2 mb-4">
              <div className="flex flex-wrap gap-1.5">
                {deal.terms.slice(0, 3).map((term) => (
                  <Badge
                    key={term.id}
                    variant="neutral"
                    className="font-normal text-[10px] px-2 py-0.5 bg-secondary/50 border-transparent text-muted-foreground"
                  >
                    {term.label}: {term.value}
                  </Badge>
                ))}
                {deal.terms.length > 3 && (
                  <Badge variant="outline" className="font-normal text-[10px] px-2 py-0.5 text-muted-foreground">
                    +{deal.terms.length - 3}
                  </Badge>
                )}
              </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2 mt-auto">
              <div className="flex items-center gap-2">
                <CopyableId id={deal.publicId} className="bg-secondary/30" />
                <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                  {timeAgo(deal.createdAt)}
                </span>
              </div>

              <div className="flex gap-1" onClick={(e) => e.preventDefault()}>
                {/* 1. Nudge (Only if pending & creator) */}
                {deal.status === 'pending' && isCreator && (
                  <Button
                    size="sm"
                    variant={nudgeSuccess === deal.id ? "default" : "secondary"}
                    className={cn(
                      "h-7 text-[10px] px-2.5 transition-all shadow-sm",
                      nudgeSuccess === deal.id && "bg-emerald-500 hover:bg-emerald-600 text-white"
                    )}
                    onClick={(e) => {
                      e.stopPropagation();
                      onNudge(deal);
                    }}
                    disabled={isNudging === deal.id}
                  >
                    {isNudging === deal.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : nudgeSuccess === deal.id ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Mail className="h-3 w-3 mr-1" />
                    )}
                    {nudgeSuccess === deal.id ? "Sent" : "Nudge"}
                  </Button>
                )}

                {/* 2. Duplicate (Always available) */}
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 w-7 p-0 text-muted-foreground hover:text-primary hover:bg-primary/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicate(deal);
                  }}
                  title="Duplicate Deal"
                >
                  <DuplicateIcon className="h-3.5 w-3.5" />
                </Button>

                {/* 3. Void (Only if pending & creator) */}
                {deal.status === 'pending' && isCreator && (
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      onVoid(deal.id);
                    }}
                    disabled={isVoiding === deal.id}
                    title="Void Deal"
                  >
                    {isVoiding === deal.id ? (
                      <RefreshCw className="h-3 w-3 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                  </Button>
                )}

                {/* Sealed/Verify Button (Only if confirmed) */}
                {deal.status === 'confirmed' && (
                  <Link href={`/dashboard/verify?id=${deal.publicId}`}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 px-2 text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 gap-1.5 transition-colors"
                    >
                      <ShieldCheck className="h-3 w-3" /> Verify
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
};

export default function AgreementsPage() {
  const router = useRouter();
  const { deals: storeDeals, user, voidDeal: storeVoidDeal, setDeals } = useAppStore();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const [filterType, setFilterType] = useState<"all" | "active" | "completed" | "voided">("active");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState<string | null>(null);
  const [nudgeSuccess, setNudgeSuccess] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Sync Data
  const refreshDeals = async () => {
    if (!isSupabaseConfigured()) return;
    setIsRefreshing(true);
    const { deals } = await getUserDealsAction();
    if (deals) setDeals(deals);
    setTimeout(() => setIsRefreshing(false), 500);
  };

  useEffect(() => {
    if (!hasInitializedRef.current && user && !user.id.startsWith("demo-")) {
      hasInitializedRef.current = true;
      refreshDeals();
    }
  }, [user]);

  // Filtering
  const filteredDeals = useMemo(() => {
    let deals = storeDeals.filter(deal =>
      deal.creatorId === user?.id || deal.recipientEmail === user?.email
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      deals = deals.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.recipientName?.toLowerCase().includes(q) ||
        d.creatorName?.toLowerCase().includes(q) ||
        d.publicId.toLowerCase().includes(q)
      );
    }

    // Apply Filter Type
    if (filterType === 'active') {
      deals = deals.filter(d => d.status === 'pending' || d.status === 'sealing');
    } else if (filterType === 'completed') {
      deals = deals.filter(d => d.status === 'confirmed');
    } else if (filterType === 'voided') {
      deals = deals.filter(d => d.status === 'voided');
    } else if (filterType === 'all') {
      deals = deals.filter(d => d.status === 'confirmed' || d.status === 'voided');
    }

    return deals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [storeDeals, user, searchQuery, filterType]);

  // Stats
  const stats = useMemo(() => {
    const active = storeDeals.filter(d => d.status === 'pending' || d.status === 'sealing').length;
    const completed = storeDeals.filter(d => d.status === 'confirmed').length;
    const voided = storeDeals.filter(d => d.status === 'voided').length;
    const totalHistory = completed + voided;
    return { active, completed, voided, totalHistory };
  }, [storeDeals]);

  // Handlers
  const handleStatClick = (type: "active" | "completed" | "voided" | "all") => {
    setFilterType(type);
    if (type === 'active') {
      setActiveTab('active');
    } else {
      setActiveTab('history');
    }
  };

  const handleTabChange = (tab: "active" | "history") => {
    setActiveTab(tab);
    // Sync filter type with tab
    if (tab === 'active') {
      setFilterType('active');
    } else {
      setFilterType('all');
    }
  };

  const handleVoid = async (dealId: string) => {
    if (!confirm("Void this deal? This cannot be undone.")) return;
    setIsVoiding(dealId);

    if (isSupabaseConfigured() && user && !user.id.startsWith("demo-")) {
      await voidDealAction(dealId);
      await refreshDeals();
    } else {
      storeVoidDeal(dealId);
    }
    setIsVoiding(null);
  };

  const handleNudge = async (deal: Deal) => {
    if (deal.recipientEmail && isSupabaseConfigured()) {
      setIsNudging(deal.id);
      const { success } = await sendDealInvitationAction({
        dealId: deal.id,
        recipientEmail: deal.recipientEmail,
      });
      setIsNudging(null);
      if (success) {
        setNudgeSuccess(deal.id);
        setTimeout(() => setNudgeSuccess(null), 3000);
      }
    } else {
      navigator.clipboard.writeText(`${window.location.origin}/d/${deal.publicId}`);
      setNudgeSuccess(deal.id);
      setTimeout(() => setNudgeSuccess(null), 2000);
    }
  };

  const handleDuplicate = (deal: Deal) => {
    router.push(`/deal/new?source=${deal.id}`);
  };

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Agreements</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Manage and track your digital handshakes</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshDeals}
            disabled={isRefreshing}
            className="text-muted-foreground hover:text-foreground h-9 px-2 sm:px-3 rounded-xl"
          >
            <RefreshCw className={cn("h-4 w-4 sm:mr-1.5", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync"}</span>
          </Button>
        </div>
      </div>

      {/* Interactive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          label="Active Deals"
          value={stats.active}
          icon={Clock}
          colorClass="text-amber-500"
          isActive={activeTab === 'active'}
          onClick={() => handleStatClick('active')}
          delay={0}
        />
        <StatCard
          label="Completed"
          value={stats.completed}
          icon={CheckCircle2}
          colorClass="text-emerald-500"
          isActive={activeTab === 'history' && filterType === 'completed'}
          onClick={() => handleStatClick('completed')}
          delay={0.1}
        />
        <StatCard
          label="Voided"
          value={stats.voided}
          icon={XCircle}
          colorClass="text-destructive"
          isActive={activeTab === 'history' && filterType === 'voided'}
          onClick={() => handleStatClick('voided')}
          delay={0.2}
        />
        <StatCard
          label="Total History"
          value={stats.totalHistory}
          icon={FileCheck}
          colorClass="text-primary"
          isActive={activeTab === 'history' && filterType === 'all'}
          onClick={() => handleStatClick('all')}
          delay={0.3}
        />
      </div>

      {/* Filter Bar */}
      <div className="bg-background/50 border border-border/50 shadow-sm rounded-2xl p-2 flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by title, name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-transparent bg-secondary/50 focus:bg-background transition-colors rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {/* Active / History Toggle */}
          <div className="flex bg-secondary/50 p-1 rounded-xl shrink-0">
            <button
              onClick={() => handleTabChange("active")}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                activeTab === "active" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              Active
            </button>
            <button
              onClick={() => handleTabChange("history")}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                activeTab === "history" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              History
            </button>
          </div>

          <div className="w-px h-6 bg-border/50 hidden sm:block" />

          {/* Layout Toggle */}
          <div className="flex bg-secondary/50 p-1 rounded-xl shrink-0">
            <button
              onClick={() => setViewMode("grid")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "grid" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-1.5 rounded-lg transition-all",
                viewMode === "list" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <ListIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="popLayout">
        {filteredDeals.length > 0 ? (
          <motion.div
            layout
            className={cn(
              "grid gap-4",
              viewMode === "grid" ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3" : "grid-cols-1"
            )}
          >
            {filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                userId={user?.id}
                onNudge={handleNudge}
                onVoid={handleVoid}
                onDuplicate={handleDuplicate}
                isVoiding={isVoiding}
                isNudging={isNudging}
                nudgeSuccess={nudgeSuccess}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-16 text-center border-2 border-dashed border-border/60 rounded-3xl bg-muted/10"
          >
            <div className="h-16 w-16 rounded-full bg-secondary/50 flex items-center justify-center mb-4">
              <FileCheck className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold">No agreements found</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1 mb-6">
              {searchQuery ? "Try adjusting your search terms." :
               activeTab === 'active' ? "You have no active deals." : "You have no deal history."}
            </p>
            {!searchQuery && activeTab === 'active' && (
              <Link href="/deal/new">
                <Button>
                  Create New Deal
                </Button>
              </Link>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
