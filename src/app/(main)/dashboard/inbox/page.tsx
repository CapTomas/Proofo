"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
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
import { dashboardStyles, containerVariants, itemVariants, cardHoverVariants, getStatCardClass, getToggleButtonClass, getTabButtonClass, getGridClass } from "@/lib/dashboard-ui";
import { CopyableId, StatCard, statusConfig, useSearchShortcut, KeyboardHint } from "@/components/dashboard/shared-components";

// statusConfig imported from shared-components
// Note: Inbox uses "To Sign" label for pending instead of "Pending"
const inboxStatusConfig = {
  ...statusConfig,
  pending: { ...statusConfig.pending, label: "To Sign" },
  confirmed: { ...statusConfig.confirmed, label: "Signed" },
};

// CopyableId and StatCard imported from shared-components

// StatCard imported from shared-components

const InboxCard = ({
  deal,
  onNavigate,
}: {
  deal: Deal;
  onNavigate: (dealId: string) => void;
}) => {
  const config = inboxStatusConfig[deal.status];
  const Icon = config.icon;
  const isPending = deal.status === 'pending';

  return (
    <motion.div
      variants={itemVariants}
      layout
      className="group relative"
    >
      <Card
        className={cn(
          dashboardStyles.cardBase,
          deal.status === 'voided' && "opacity-60 grayscale-[0.5]",
          isPending && "ring-1 ring-amber-500/20 border-amber-500/20"
        )}
        onClick={() => onNavigate(deal.publicId)}
      >
        <div className="flex flex-col h-full">
          <CardContent className="flex-1 p-4 pb-0 flex flex-col">
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
          </CardContent>

          {/* Footer Action Bar */}
          <div className={dashboardStyles.cardFooter}>
            <div className="flex items-center gap-2">
              <CopyableId id={deal.publicId} className="bg-background/50" />
              <span className="text-[10px] text-muted-foreground hidden sm:inline-block">
                {timeAgo(deal.createdAt)}
              </span>
            </div>

            <div className={dashboardStyles.cardFooterActions} onClick={(e) => e.stopPropagation()}>
              {isPending ? (
                <Button
                  size="sm"
                  className="h-7 px-3 text-[10px] bg-amber-500 hover:bg-amber-600 text-white shadow-sm gap-1.5"
                  onClick={() => onNavigate(deal.publicId)}
                >
                  <FileSignature className={dashboardStyles.iconSm} />
                  Sign Now
                </Button>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-3 text-[10px] gap-1.5"
                  onClick={() => onNavigate(deal.publicId)}
                >
                  <ExternalLink className={dashboardStyles.iconSm} />
                  View
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
};

export default function InboxPage() {
  const router = useRouter();
  const { user, deals: storeDeals, setDeals } = useAppStore();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<"to_sign" | "history">("to_sign");
  const [filterType, setFilterType] = useState<"all" | "pending" | "signed" | "voided">("pending");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const hasInitializedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useSearchShortcut(searchInputRef);

  // Navigate to deal
  const handleNavigate = (dealId: string) => {
    router.push(`/d/${dealId}`);
  };

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
    <div className={dashboardStyles.pageContainer}>

      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>Inbox</h1>
          <p className={dashboardStyles.pageDescription}>Deals waiting for your signature</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={refreshDeals}
            disabled={isRefreshing}
            className={dashboardStyles.syncButton}
          >
            <RefreshCw className={cn(dashboardStyles.iconMd, "sm:mr-1.5", isRefreshing && "animate-spin")} />
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
      <div className={dashboardStyles.filterBar}>
        <div className={dashboardStyles.searchInputContainer}>
          <Search className={dashboardStyles.searchIcon} />
          <Input
            ref={searchInputRef}
            placeholder="Search by title, sender, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={dashboardStyles.searchInput}
          />
          <KeyboardHint />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {/* To Sign / History Toggle */}
          <div className={dashboardStyles.toggleGroup}>
            <button
              onClick={() => handleTabChange("to_sign")}
              className={getTabButtonClass(activeTab === "to_sign")}
            >
              To Sign
            </button>
            <button
              onClick={() => handleTabChange("history")}
              className={getTabButtonClass(activeTab === "history")}
            >
              History
            </button>
          </div>

          <div className={dashboardStyles.divider} />

          {/* Layout Toggle */}
          <div className={dashboardStyles.toggleGroup}>
            <button
              onClick={() => setViewMode("grid")}
              className={getToggleButtonClass(viewMode === "grid")}
            >
              <LayoutGrid className={dashboardStyles.iconMd} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={getToggleButtonClass(viewMode === "list")}
            >
              <ListIcon className={dashboardStyles.iconMd} />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <AnimatePresence mode="popLayout">
        {filteredDeals.length > 0 ? (
          <motion.div
            key={`${activeTab}-${filterType}-${viewMode}`}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            layout
            className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 3))}
          >
            {filteredDeals.map((deal) => (
              <InboxCard
                key={deal.id}
                deal={deal}
                onNavigate={handleNavigate}
              />
            ))}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={dashboardStyles.emptyState}
          >
            <div className={dashboardStyles.emptyStateIcon}>
              <InboxIcon className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className={dashboardStyles.emptyStateTitle}>No inbox items</h3>
            <p className={dashboardStyles.emptyStateDescription}>
              {searchQuery ? "Try adjusting your search terms." :
               activeTab === 'to_sign' ? "You're all caught up! No deals waiting for you." : "No history found."}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
