"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Plus,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Copy,
  RefreshCw,
  User,
  Eye,
  Trash2,
  Edit3,
  Calendar,
  ExternalLink,
  Mail,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deal, DealStatus } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";
import { isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction, voidDealAction, sendDealInvitationAction } from "@/app/actions/deal-actions";

const statusConfig: Record<DealStatus, { label: string; color: "default" | "secondary" | "destructive" | "success" | "warning"; icon: typeof Clock; dotClass: string }> = {
  pending: { label: "Pending", color: "warning", icon: Clock, dotClass: "bg-amber-500" },
  sealing: { label: "Sealing", color: "secondary", icon: RefreshCw, dotClass: "bg-blue-500" },
  confirmed: { label: "Confirmed", color: "success", icon: CheckCircle2, dotClass: "bg-emerald-500" },
  voided: { label: "Voided", color: "destructive", icon: XCircle, dotClass: "bg-red-500" },
};

export default function AgreementsPage() {
  const router = useRouter();
  const { 
    deals: storeDeals, 
    user, 
    voidDeal: storeVoidDeal, 
    setDeals,
  } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [isNudging, setIsNudging] = useState<string | null>(null);
  const [nudgeSuccess, setNudgeSuccess] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  // Fetch deals from database
  const refreshDeals = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    const { deals, error } = await getUserDealsAction();
    if (!error) {
      setDeals(deals || []);
    }
  }, [setDeals]);

  // Refresh deals on mount (only once)
  useEffect(() => {
    if (!hasInitializedRef.current && user && !user.id.startsWith("demo-")) {
      hasInitializedRef.current = true;
      refreshDeals().catch((err) => {
        console.error("Failed to refresh deals on mount:", err);
      });
    }
  }, [user, refreshDeals]);

  // Filter deals created by user
  const userDeals = useMemo(() => {
    return storeDeals.filter(deal => deal.creatorId === user?.id);
  }, [storeDeals, user?.id]);

  const filteredDeals = useMemo(() => {
    return userDeals.filter((deal) => {
      const matchesSearch =
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.recipientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [userDeals, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = userDeals.length;
    const pending = userDeals.filter((d) => d.status === "pending").length;
    const confirmed = userDeals.filter((d) => d.status === "confirmed").length;
    const voided = userDeals.filter((d) => d.status === "voided").length;
    return { total, pending, confirmed, voided };
  }, [userDeals]);

  const copyToClipboard = async (dealId: string, publicId: string) => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/d/${publicId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(dealId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopiedId(dealId);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const handleVoidDeal = async (dealId: string) => {
    if (!confirm("Are you sure you want to void this deal? This action cannot be undone.")) {
      return;
    }

    setIsVoiding(dealId);

    if (isSupabaseConfigured() && user && !user.id.startsWith("demo-")) {
      const { error } = await voidDealAction(dealId);
      if (!error) {
        await refreshDeals();
      }
    } else {
      storeVoidDeal(dealId);
    }

    setIsVoiding(null);
  };

  const handleDuplicate = (dealId: string) => {
    router.push(`/deal/new?source=${dealId}`);
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
      } else {
        copyToClipboard(deal.id, deal.publicId);
      }
    } else {
      copyToClipboard(deal.id, deal.publicId);
    }
  };

  return (
    <DashboardLayout title="Agreements">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Your Agreements</h2>
            <p className="text-sm text-muted-foreground">
              Deals you&apos;ve created ({stats.total} total)
            </p>
          </div>
          <Link href="/deal/new">
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              New Deal
            </Button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileCheck className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Agreements</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                {stats.pending > 0 && <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
              </div>
              <p className="text-2xl font-semibold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-2xl font-semibold">{stats.confirmed}</p>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <XCircle className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{stats.voided}</p>
              <p className="text-xs text-muted-foreground">Voided</p>
            </CardContent>
          </Card>
        </div>

        {/* Deals List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-medium">All Agreements</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-8 h-8 w-full sm:w-48 text-sm"
                  />
                </div>
                <div className="flex gap-1 p-0.5 bg-muted rounded-md">
                  {(["all", "pending", "confirmed", "voided"] as const).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className={`h-7 text-xs px-2 ${statusFilter === status ? "bg-background shadow-sm" : ""}`}
                    >
                      {status === "all" ? "All" : statusConfig[status].label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2">
              <AnimatePresence mode="popLayout">
                {filteredDeals.length === 0 ? (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-center py-12"
                  >
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center mx-auto mb-3">
                      <FileCheck className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No agreements found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search"
                        : "Create your first deal"}
                    </p>
                    <Link href="/deal/new">
                      <Button size="sm">
                        <Plus className="h-4 w-4 mr-1.5" />
                        New Deal
                      </Button>
                    </Link>
                  </motion.div>
                ) : (
                  filteredDeals.map((deal, index) => {
                    const StatusIcon = statusConfig[deal.status].icon;
                    return (
                      <motion.div
                        key={deal.id}
                        layout
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2, delay: index * 0.03 }}
                      >
                        <div
                          className={`group relative p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors ${
                            deal.status === "voided" ? "opacity-60" : ""
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-3">
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
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {(expandedDealId === deal.id ? deal.terms : deal.terms.slice(0, 2)).map((term) => (
                                  <Badge key={term.id} variant="secondary" className="font-normal text-xs h-5">
                                    {term.label}: {term.value}
                                  </Badge>
                                ))}
                                {deal.terms.length > 2 && (
                                  <Badge 
                                    variant="secondary" 
                                    className="font-normal text-xs h-5 cursor-pointer hover:bg-secondary/80 transition-colors"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedDealId(expandedDealId === deal.id ? null : deal.id);
                                    }}
                                  >
                                    {expandedDealId === deal.id ? "Show less" : `+${deal.terms.length - 2} more`}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {deal.status === "pending" && (
                                <>
                                  <Button 
                                    variant={copiedId === deal.id ? "default" : "outline"}
                                    size="sm"
                                    onClick={() => copyToClipboard(deal.id, deal.publicId)}
                                    className="h-7 text-xs gap-1"
                                  >
                                    {copiedId === deal.id ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span className="hidden sm:inline">Copied!</span>
                                      </>
                                    ) : (
                                      <>
                                        <Copy className="h-3 w-3" />
                                        <span className="hidden sm:inline">Copy</span>
                                      </>
                                    )}
                                  </Button>
                                  <Button 
                                    variant={nudgeSuccess === deal.id ? "default" : "outline"}
                                    size="sm" 
                                    className="h-7 text-xs gap-1"
                                    onClick={() => handleNudge(deal)}
                                    disabled={isNudging === deal.id}
                                  >
                                    {isNudging === deal.id ? (
                                      <>
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                        <span className="hidden sm:inline">Sending...</span>
                                      </>
                                    ) : nudgeSuccess === deal.id ? (
                                      <>
                                        <CheckCircle2 className="h-3 w-3" />
                                        <span className="hidden sm:inline">Sent!</span>
                                      </>
                                    ) : deal.recipientEmail ? (
                                      <>
                                        <Mail className="h-3 w-3" />
                                        <span className="hidden sm:inline">Nudge</span>
                                      </>
                                    ) : (
                                      <>
                                        <RefreshCw className="h-3 w-3" />
                                        <span className="hidden sm:inline">Nudge</span>
                                      </>
                                    )}
                                  </Button>
                                </>
                              )}
                              <Link href={`/d/${deal.publicId}`}>
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <Eye className="h-3.5 w-3.5" />
                                </Button>
                              </Link>
                              <div className="relative group/menu">
                                <Button variant="ghost" size="icon" className="h-7 w-7">
                                  <MoreHorizontal className="h-3.5 w-3.5" />
                                </Button>
                                <div className="hidden group-hover/menu:block absolute right-0 top-full mt-1 w-36 p-1 bg-popover border rounded-lg shadow-lg z-10">
                                  <Link href={`/d/${deal.publicId}`}>
                                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                                      <ExternalLink className="h-3 w-3" />
                                      View
                                    </Button>
                                  </Link>
                                  {deal.status === "pending" && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full justify-start gap-2 h-8 text-xs"
                                      onClick={() => handleDuplicate(deal.id)}
                                    >
                                      <Edit3 className="h-3 w-3" />
                                      Duplicate
                                    </Button>
                                  )}
                                  {deal.status !== "voided" && (
                                    <Button 
                                      variant="ghost" 
                                      size="sm" 
                                      className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive"
                                      onClick={() => handleVoidDeal(deal.id)}
                                      disabled={isVoiding === deal.id}
                                    >
                                      {isVoiding === deal.id ? (
                                        <RefreshCw className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Trash2 className="h-3 w-3" />
                                      )}
                                      {isVoiding === deal.id ? "Voiding..." : "Void"}
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </AnimatePresence>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
