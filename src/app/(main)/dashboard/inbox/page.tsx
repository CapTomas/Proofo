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
  User,
  ArrowUpRight,
  FileSignature,
  LayoutGrid,
  List as ListIcon,
  Inbox as InboxIcon,
  PenLine,
  ExternalLink
} from "lucide-react";
import Link from "next/link";
import { Deal, DealStatus } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction } from "@/app/actions/deal-actions";
import { cn } from "@/lib/utils";

// --- CONFIG & UTILS ---

const statusConfig: Record<DealStatus, { label: string; color: string; icon: any; bg: string; border: string; badgeVariant: "warning" | "success" | "destructive" | "secondary" }> = {
  pending: {
    label: "To Sign",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/20",
    icon: PenLine,
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
    label: "Signed",
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

const InboxCard = ({
  deal,
}: {
  deal: Deal;
}) => {
  const config = statusConfig[deal.status];
  const Icon = config.icon;
  const isPending = deal.status === 'pending';

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
          deal.status === 'voided' && "opacity-60 grayscale-[0.5]",
          isPending && "ring-1 ring-amber-500/20 border-amber-500/20"
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
                    <User className="h-3 w-3 shrink-0" />
                    <span className="truncate">From {deal.creatorName}</span>
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

              <div className="flex gap-2" onClick={(e) => e.preventDefault()}>
                {isPending ? (
                  <Link href={`/d/${deal.publicId}`}>
                    <Button
                      size="sm"
                      className="h-7 px-3 text-[10px] bg-amber-500 hover:bg-amber-600 text-white shadow-sm gap-1.5"
                    >
                      <FileSignature className="h-3 w-3" />
                      Sign Now
                    </Button>
                  </Link>
                ) : (
                  <Link href={`/d/${deal.publicId}`}>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 px-3 text-[10px] gap-1.5"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View
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

export default function InboxPage() {
  const { user, deals: storeDeals, setDeals } = useAppStore();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"to_sign" | "history">("to_sign");
  const [filterType, setFilterType] = useState<"all" | "pending" | "signed" | "voided">("pending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);
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

  // Data Logic
  const inboxDeals = useMemo(() => {
    if (!user?.email) return []; // No demo data fallback

    // Filter deals where the user is the recipient (by email)
    return storeDeals.filter(
      deal => deal.recipientEmail?.toLowerCase() === user.email.toLowerCase() &&
              deal.creatorId !== user.id
    );
  }, [storeDeals, user?.email, user?.id]);

  // Filtering
  const filteredDeals = useMemo(() => {
    let deals = [...inboxDeals];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      deals = deals.filter(d =>
        d.title.toLowerCase().includes(q) ||
        d.creatorName?.toLowerCase().includes(q) ||
        d.publicId.toLowerCase().includes(q)
      );
    }

    // Apply Filter Type
    if (filterType === 'pending') {
      deals = deals.filter(d => d.status === 'pending' || d.status === 'sealing');
    } else if (filterType === 'signed') {
      deals = deals.filter(d => d.status === 'confirmed');
    } else if (filterType === 'voided') {
      deals = deals.filter(d => d.status === 'voided');
    } else if (filterType === 'all') {
      deals = deals.filter(d => d.status === 'confirmed' || d.status === 'voided');
    }

    return deals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [inboxDeals, searchQuery, filterType]);

  // Stats
  const stats = useMemo(() => {
    const pending = inboxDeals.filter(d => d.status === 'pending' || d.status === 'sealing').length;
    const signed = inboxDeals.filter(d => d.status === 'confirmed').length;
    const voided = inboxDeals.filter(d => d.status === 'voided').length;
    const total = inboxDeals.length;
    return { pending, signed, voided, total };
  }, [inboxDeals]);

  // Handlers
  const handleStatClick = (type: "pending" | "signed" | "voided" | "all") => {
    setFilterType(type);
    if (type === 'pending') {
      setActiveTab('to_sign');
    } else {
      setActiveTab('history');
    }
  };

  const handleTabChange = (tab: "to_sign" | "history") => {
    setActiveTab(tab);
    if (tab === 'to_sign') {
      setFilterType('pending');
    } else {
      setFilterType('all');
    }
  };

  return (
    <div className="space-y-6 pb-20">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 pb-2 border-b border-border/40">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight truncate">Inbox</h1>
          <p className="text-muted-foreground text-xs sm:text-sm">Deals waiting for your signature</p>
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
          label="To Sign"
          value={stats.pending}
          icon={PenLine}
          colorClass="text-amber-500"
          isActive={activeTab === 'to_sign'}
          onClick={() => handleStatClick('pending')}
          delay={0}
        />
        <StatCard
          label="Signed"
          value={stats.signed}
          icon={CheckCircle2}
          colorClass="text-emerald-500"
          isActive={activeTab === 'history' && filterType === 'signed'}
          onClick={() => handleStatClick('signed')}
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
          label="Total Inbox"
          value={stats.total}
          icon={InboxIcon}
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
            placeholder="Search by title, sender, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-10 border-transparent bg-secondary/50 focus:bg-background transition-colors rounded-xl"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {/* To Sign / History Toggle */}
          <div className="flex bg-secondary/50 p-1 rounded-xl shrink-0">
            <button
              onClick={() => handleTabChange("to_sign")}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-lg transition-all",
                activeTab === "to_sign" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              )}
            >
              To Sign
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
              <InboxCard
                key={deal.id}
                deal={deal}
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
              <InboxIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className="text-lg font-semibold">No inbox items</h3>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
              {searchQuery ? "Try adjusting your search terms." :
               activeTab === 'to_sign' ? "You're all caught up! No deals waiting for you." : "No history found."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
