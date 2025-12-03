"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Plus,
  Search,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Copy,
  RefreshCw,
  Home,
  Settings,
  User,
  LogOut,
  ChevronDown,
  Eye,
  Trash2,
  Edit3,
  TrendingUp,
  Calendar,
  Sparkles,
  Crown,
  LayoutTemplate,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Deal, DealStatus } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";
import { signOut, isSupabaseConfigured } from "@/lib/supabase";
import { getUserDealsAction, voidDealAction } from "@/app/actions/deal-actions";
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

const statusConfig: Record<DealStatus, { label: string; color: "default" | "secondary" | "destructive" | "success" | "warning"; icon: typeof Clock; dotClass: string }> = {
  pending: { label: "Pending", color: "warning", icon: Clock, dotClass: "bg-amber-500" },
  sealing: { label: "Sealing", color: "secondary", icon: RefreshCw, dotClass: "bg-blue-500" },
  confirmed: { label: "Confirmed", color: "success", icon: CheckCircle2, dotClass: "bg-emerald-500" },
  voided: { label: "Voided", color: "destructive", icon: XCircle, dotClass: "bg-red-500" },
};

export default function DashboardPage() {
  const router = useRouter();
  const { 
    deals: storeDeals, 
    user, 
    voidDeal: storeVoidDeal, 
    setUser, 
    setDeals,
    needsOnboarding,
    setNeedsOnboarding 
  } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedDealId, setExpandedDealId] = useState<string | null>(null);
  const [isVoiding, setIsVoiding] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const hasInitializedRef = useRef(false);

  // Check if user needs onboarding
  useEffect(() => {
    // Show onboarding if user is logged in (not a demo user) and needs onboarding
    if (user && !user.id.startsWith("demo-") && needsOnboarding) {
      setShowOnboarding(true);
    }
  }, [user, needsOnboarding]);

  // Handle onboarding completion
  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setNeedsOnboarding(false);
  };

  // Fetch deals from database
  const refreshDeals = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    
    const { deals, error } = await getUserDealsAction();
    if (!error && deals.length > 0) {
      setDeals(deals);
    }
  }, [setDeals]);

  // Refresh deals on mount (only once)
  useEffect(() => {
    if (!hasInitializedRef.current && user && !user.id.startsWith("demo-")) {
      hasInitializedRef.current = true;
      // Fire-and-forget pattern for initial data fetch
      // Errors are logged inside refreshDeals, no need to handle here
      refreshDeals().catch((err) => {
        console.error("Failed to refresh deals on mount:", err);
      });
    }
  }, [user, refreshDeals]);

  // Handle logout
  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      if (isSupabaseConfigured()) {
        await signOut();
      }
      // Clear local state
      setUser(null);
      setDeals([]);
      // Clear persisted storage
      if (typeof window !== "undefined") {
        localStorage.removeItem("proofo-storage");
      }
      router.push("/");
    } catch (error) {
      console.error("Logout error:", error);
    } finally {
      setIsLoggingOut(false);
    }
  };

  // Use store deals if available, otherwise show demo deals
  const allDeals = storeDeals.length > 0 ? storeDeals : demoDeals;
  const isUsingDemoData = storeDeals.length === 0;

  const filteredDeals = useMemo(() => {
    return allDeals.filter((deal) => {
      const matchesSearch =
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.recipientName?.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [allDeals, searchQuery, statusFilter]);

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

  const copyToClipboard = async (dealId: string, publicId: string) => {
    const link = `${typeof window !== "undefined" ? window.location.origin : ""}/d/${publicId}`;
    try {
      await navigator.clipboard.writeText(link);
      setCopiedId(dealId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
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

    // Check if using Supabase
    if (isSupabaseConfigured() && user && !user.id.startsWith("demo-")) {
      const { error } = await voidDealAction(dealId);
      if (!error) {
        // Refresh deals to get updated state
        await refreshDeals();
      }
    } else {
      // Use local store
      storeVoidDeal(dealId);
    }

    setIsVoiding(null);
  };

  const handleDuplicate = () => {
    // Navigate to new deal page with pre-filled data (via query params or state)
    // For now, just navigate to new deal page
    if (typeof window !== "undefined") {
      window.location.assign("/deal/new");
    }
  };

  const userName = user?.name || "Guest";
  const userInitials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
  const isPro = user?.isPro || false;

  return (
    <>
      {/* Onboarding Modal */}
      {showOnboarding && (
        <OnboardingModal onComplete={handleOnboardingComplete} />
      )}
      
      <div className="min-h-screen bg-background flex">
        {/* Sidebar */}
        <aside className="hidden lg:flex w-56 flex-col fixed inset-y-0 z-40 border-r bg-background">
          {/* Logo */}
          <div className="h-14 flex items-center px-4 border-b">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-semibold text-xs">P</span>
              </div>
              <span className="font-semibold">Proofo</span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1">
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full justify-start gap-2 h-9 text-sm">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/templates">
            <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm">
              <LayoutTemplate className="h-4 w-4" />
              Templates
            </Button>
          </Link>
          <Link href="/settings">
            <Button variant="ghost" className="w-full justify-start gap-2 h-9 text-sm">
              <Settings className="h-4 w-4" />
              Settings
            </Button>
          </Link>
        </nav>

        {/* Pro Upgrade Banner */}
        {!isPro && (
          <div className="px-3 pb-3">
            <div className="p-3 rounded-lg bg-gradient-to-r from-primary/10 to-primary/5 border border-primary/20">
              <div className="flex items-center gap-2 mb-1">
                <Crown className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Go Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mb-2">
                Remove watermarks & keep deals forever
              </p>
              <Button size="sm" className="w-full h-7 text-xs">
                Upgrade
              </Button>
            </div>
          </div>
        )}

        {/* User Menu */}
        <div className="p-3 border-t">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 w-full p-2 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                {userInitials || "G"}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">{userName}</p>
                <p className="text-xs text-muted-foreground">{isPro ? "Pro" : "Free"}</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-0 right-0 mb-1 p-1 bg-popover border rounded-lg shadow-lg"
                >
                  <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm" size="sm">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-2 h-8 text-sm" size="sm">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                  <div className="my-1 border-t" />
                  <Button 
                    variant="ghost" 
                    className="w-full justify-start gap-2 h-8 text-sm text-destructive hover:text-destructive" 
                    size="sm"
                    onClick={handleLogout}
                    disabled={isLoggingOut}
                  >
                    {isLoggingOut ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <LogOut className="h-4 w-4" />
                    )}
                    {isLoggingOut ? "Logging out..." : "Log Out"}
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-56">
        {/* Top Bar */}
        <header className="h-14 border-b bg-background sticky top-0 z-30 flex items-center justify-between px-4 lg:px-6">
          <div className="lg:hidden flex items-center gap-2">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-semibold text-xs">P</span>
              </div>
              <span className="font-semibold">Proofo</span>
            </Link>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-lg font-medium">Dashboard</h1>
          </div>

          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/deal/new">
              <Button size="sm">
                <Plus className="h-4 w-4 mr-1.5" />
                <span className="hidden sm:inline">New Deal</span>
              </Button>
            </Link>
          </div>
        </header>

        <div className="p-4 lg:p-6 space-y-6">
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
                Here&apos;s an overview of your deals
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

            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <p className="text-2xl font-semibold">{stats.pending}</p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </CardContent>
            </Card>

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

          {/* Deals Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base font-medium">Your Deals</CardTitle>
                <div className="flex flex-col sm:flex-row gap-2">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-8 h-8 w-full sm:w-48 text-sm"
                    />
                  </div>
                  {/* Filter */}
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
              {/* Deals List */}
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
                      <h3 className="font-medium mb-1">No deals found</h3>
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
                              {/* Deal Info */}
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
                                {/* Terms Preview */}
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

                              {/* Actions */}
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
                                      variant="outline" 
                                      size="sm" 
                                      className="h-7 text-xs gap-1"
                                      onClick={() => copyToClipboard(deal.id, deal.publicId)}
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                      <span className="hidden sm:inline">Nudge</span>
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
                                        onClick={() => handleDuplicate()}
                                      >
                                        <Edit3 className="h-3 w-3" />
                                        Duplicate
                                      </Button>
                                    )}
                                    {deal.status !== "voided" && !isUsingDemoData && (
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

          {/* Quick Tips */}
          {stats.pending > 0 && (
            <Card className="border-dashed">
              <CardContent className="py-3 px-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 text-sm">
                    <span className="font-medium">{stats.pending} pending</span>
                    <span className="text-muted-foreground"> — send a reminder</span>
                  </div>
                  <Button variant="outline" size="sm" className="h-7 text-xs shrink-0">
                    Remind
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
    </>
  );
}
