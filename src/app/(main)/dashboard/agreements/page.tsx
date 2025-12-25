"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
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
  Inbox,
  Send,
  ArrowUpRight,
  FileCheck,
  LayoutGrid,
  List as ListIcon,
  Mail,
  Copy as DuplicateIcon,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deal } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import {
  getUserDealsAction,
  voidDealAction,
  sendDealInvitationAction,
} from "@/app/actions/deal-actions";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  dashboardStyles,
  containerVariants,
  itemVariants,
  getToggleButtonClass,
  getTabButtonClass,
  getGridClass,
} from "@/lib/dashboard-ui";
import {
  CopyableId,
  StatCard,
  statusConfig,
  useSearchShortcut,
  KeyboardHint,
  StatCardSkeleton,
  DealRowSkeleton,
  CardSkeleton,
} from "@/components/dashboard/shared-components";
import { EmptyState } from "@/components/dashboard/empty-state";

// statusConfig imported from shared-components

// CopyableId and StatCard imported from shared-components

// StatCard imported from shared-components

const DealCard = ({
  deal,
  userId,
  onNudge,
  onVoid,
  onDuplicate,
  onNavigate,
  onVerify,
  isVoiding,
  isNudging,
  nudgeSuccess,
}: {
  deal: Deal;
  userId?: string;
  onNudge: (deal: Deal) => void;
  onVoid: (id: string) => void;
  onDuplicate: (deal: Deal) => void;
  onNavigate: (dealId: string) => void;
  onVerify: (dealId: string) => void;
  isVoiding: string | null;
  isNudging: string | null;
  nudgeSuccess: string | null;
}) => {
  const isCreator = deal.creatorId === userId;
  const config = statusConfig[deal.status];
  const Icon = config.icon;

  return (
    <motion.div variants={itemVariants} layout className="group relative">
      <Card
        className={cn(
          dashboardStyles.cardBase,
          deal.status === "voided" && "opacity-60 grayscale-[0.5]"
        )}
        onClick={() => onNavigate(deal.publicId)}
      >
        <div className="flex flex-col h-full">
          <CardContent className="flex-1 p-4 pb-0 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className={cn(
                    "h-9 w-9 rounded-lg flex items-center justify-center border shadow-sm transition-colors shrink-0",
                    config.bg,
                    config.border,
                    config.color
                  )}
                >
                  <Icon className="h-4.5 w-4.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-foreground truncate">
                      {deal.title}
                    </span>
                    <Badge
                      variant={config.badgeVariant}
                      className="h-5 px-1.5 text-[10px] font-medium border"
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-0.5 truncate">
                    {isCreator ? (
                      <Send className="h-3 w-3 shrink-0" />
                    ) : (
                      <Inbox className="h-3 w-3 shrink-0" />
                    )}
                    <span className="truncate">
                      {isCreator ? `To ${deal.recipientName}` : `From ${deal.creatorName}`}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-foreground"
                >
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
                  <Badge
                    variant="outline"
                    className="font-normal text-[10px] px-2 py-0.5 text-muted-foreground"
                  >
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
              {/* 1. Nudge (Only if pending & creator) */}
              {deal.status === "pending" && isCreator && (
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
              {deal.status === "pending" && isCreator && (
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
              {deal.status === "confirmed" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[10px] border-emerald-500/30 text-emerald-600 bg-emerald-500/5 hover:bg-emerald-500/10 gap-1.5 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onVerify(deal.publicId);
                  }}
                >
                  <ShieldCheck className="h-3 w-3" /> Verify
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
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
  const [isLoaded, setIsLoaded] = useState(false);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState<string | null>(null);
  const [nudgeSuccess, setNudgeSuccess] = useState<string | null>(null);
  const [voidConfirmId, setVoidConfirmId] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcuts
  useSearchShortcut(searchInputRef);

  // Navigate to deal
  const handleNavigate = (dealId: string) => {
    router.push(`/d/${dealId}`);
  };

  // Navigate to verify
  const handleVerify = (dealId: string) => {
    router.push(`/dashboard/verify?id=${dealId}`);
  };

  // Sync Data
  const refreshDeals = useCallback(
    async (showLoading = false) => {
      if (!isSupabaseConfigured()) {
        setIsLoaded(true);
        return;
      }
      if (showLoading) setIsRefreshing(true);
      const { deals } = await getUserDealsAction();
      if (deals) setDeals(deals);

      setIsLoaded(true);
      if (showLoading) setTimeout(() => setIsRefreshing(false), 500);
    },
    [setDeals]
  );

  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      refreshDeals();
    }
  }, [refreshDeals]);

  // Filtering
  const filteredDeals = useMemo(() => {
    let deals = storeDeals.filter(
      (deal) => deal.creatorId === user?.id || deal.recipientEmail === user?.email
    );

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      deals = deals.filter(
        (d) =>
          d.title.toLowerCase().includes(q) ||
          d.recipientName?.toLowerCase().includes(q) ||
          d.creatorName?.toLowerCase().includes(q) ||
          d.publicId.toLowerCase().includes(q)
      );
    }

    // Apply Filter Type
    if (filterType === "active") {
      deals = deals.filter((d) => d.status === "pending" || d.status === "sealing");
    } else if (filterType === "completed") {
      deals = deals.filter((d) => d.status === "confirmed");
    } else if (filterType === "voided") {
      deals = deals.filter((d) => d.status === "voided");
    } else if (filterType === "all") {
      deals = deals.filter((d) => d.status === "confirmed" || d.status === "voided");
    }

    return deals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [storeDeals, user, searchQuery, filterType]);

  // Stats
  const stats = useMemo(() => {
    const active = storeDeals.filter(
      (d) => d.status === "pending" || d.status === "sealing"
    ).length;
    const completed = storeDeals.filter((d) => d.status === "confirmed").length;
    const voided = storeDeals.filter((d) => d.status === "voided").length;
    const totalHistory = completed + voided;
    return { active, completed, voided, totalHistory };
  }, [storeDeals]);

  // Handlers
  const handleStatClick = (type: "active" | "completed" | "voided" | "all") => {
    setFilterType(type);
    if (type === "active") {
      setActiveTab("active");
    } else {
      setActiveTab("history");
    }
  };

  const handleTabChange = (tab: "active" | "history") => {
    setActiveTab(tab);
    // Sync filter type with tab
    if (tab === "active") {
      setFilterType("active");
    } else {
      setFilterType("all");
    }
  };

  const handleVoidConfirm = async () => {
    if (!voidConfirmId) return;
    const dealId = voidConfirmId;
    setVoidConfirmId(null);
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
      navigator.clipboard.writeText(`${window.location.origin}/d/public/${deal.publicId}`);
      setNudgeSuccess(deal.id);
      setTimeout(() => setNudgeSuccess(null), 2000);
    }
  };

  const handleDuplicate = (deal: Deal) => {
    router.push(`/deal/new?source=${deal.id}`);
  };

  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>Agreements</h1>
          <p className={dashboardStyles.pageDescription}>
            Manage and track your digital handshakes
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refreshDeals(true)}
            disabled={isRefreshing}
            className={dashboardStyles.syncButton}
          >
            <RefreshCw
              className={cn(dashboardStyles.iconMd, "sm:mr-1.5", isRefreshing && "animate-spin")}
            />
            <span className="hidden sm:inline">{isRefreshing ? "Syncing..." : "Sync"}</span>
          </Button>
        </div>
      </div>

      {/* Interactive Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {!isLoaded ? (
          [...Array(4)].map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard
              label="Active Deals"
              value={stats.active}
              icon={Clock}
              colorClass="text-amber-500"
              isActive={activeTab === "active"}
              onClick={() => handleStatClick("active")}
              delay={0}
            />
            <StatCard
              label="Completed"
              value={stats.completed}
              icon={CheckCircle2}
              colorClass="text-emerald-500"
              isActive={activeTab === "history" && filterType === "completed"}
              onClick={() => handleStatClick("completed")}
              delay={0.1}
            />
            <StatCard
              label="Voided"
              value={stats.voided}
              icon={XCircle}
              colorClass="text-destructive"
              isActive={activeTab === "history" && filterType === "voided"}
              onClick={() => handleStatClick("voided")}
              delay={0.2}
            />
            <StatCard
              label="Total History"
              value={stats.totalHistory}
              icon={FileCheck}
              colorClass="text-primary"
              isActive={activeTab === "history" && filterType === "all"}
              onClick={() => handleStatClick("all")}
              delay={0.3}
            />
          </>
        )}
      </div>

      {/* Filter Bar */}
      <div className={dashboardStyles.filterBar}>
        <div className={dashboardStyles.searchInputContainer}>
          <Search className={dashboardStyles.searchIcon} />
          <Input
            ref={searchInputRef}
            placeholder="Search by title, name, or ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={dashboardStyles.searchInput}
          />
          <KeyboardHint />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          {/* Active / History Toggle */}
          <div className={dashboardStyles.toggleGroup}>
            <button
              onClick={() => handleTabChange("active")}
              className={getTabButtonClass(activeTab === "active")}
            >
              Active
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
        {!isLoaded ? (
          <motion.div
            key="skeleton"
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 3))}
          >
            {[...Array(6)].map((_, i) =>
              viewMode === "grid" ? <CardSkeleton key={i} /> : <DealRowSkeleton key={i} />
            )}
          </motion.div>
        ) : filteredDeals.length > 0 ? (
          <motion.div
            key={`${activeTab}-${filterType}-${viewMode}`}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            layout
            className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 3))}
          >
            {filteredDeals.map((deal) => (
              <DealCard
                key={deal.id}
                deal={deal}
                userId={user?.id}
                onNudge={handleNudge}
                onVoid={setVoidConfirmId}
                onDuplicate={handleDuplicate}
                onNavigate={handleNavigate}
                onVerify={handleVerify}
                isVoiding={isVoiding}
                isNudging={isNudging}
                nudgeSuccess={nudgeSuccess}
              />
            ))}
          </motion.div>
        ) : (
          // ...
          <EmptyState
            icon={FileCheck}
            title="No agreements found"
            description={
              searchQuery
                ? "Try adjusting your search terms."
                : activeTab === "active"
                  ? "You have no active deals."
                  : "You have no deal history."
            }
            action={
              !searchQuery && activeTab === "active" ? (
                <Link href="/deal/new">
                  <Button>Create New Deal</Button>
                </Link>
              ) : undefined
            }
          />
        )}
      </AnimatePresence>

      {/* Void Confirmation Dialog */}
      <AlertDialog open={!!voidConfirmId} onOpenChange={(open) => !open && setVoidConfirmId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Void this deal?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The deal will be permanently voided and the recipient
              will no longer be able to sign it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleVoidConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Void Deal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
