"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Plus,
  Search,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  MoreHorizontal,
  Copy,
  ExternalLink,
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
  Filter,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { Deal, DealStatus } from "@/types";

// Demo data
const demoDeals: Deal[] = [
  {
    id: "1",
    publicId: "abc123",
    creatorId: "user1",
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
    id: "2",
    publicId: "def456",
    creatorId: "user1",
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
  {
    id: "3",
    publicId: "ghi789",
    creatorId: "user1",
    creatorName: "You",
    recipientName: "Mike Johnson",
    title: "Freelance Work Agreement",
    description: "Website development project",
    terms: [
      { id: "1", label: "Project", value: "Portfolio website", type: "text" },
      { id: "2", label: "Payment", value: "$2,000", type: "currency" },
    ],
    status: "voided",
    createdAt: "2024-01-10T09:00:00Z",
    voidedAt: "2024-01-12T15:00:00Z",
  },
  {
    id: "4",
    publicId: "jkl012",
    creatorId: "user1",
    creatorName: "You",
    recipientName: "Sarah Wilson",
    title: "Equipment Rental",
    description: "Renting audio equipment for event",
    terms: [
      { id: "1", label: "Equipment", value: "PA System + Microphones", type: "text" },
      { id: "2", label: "Duration", value: "3 days", type: "text" },
      { id: "3", label: "Value", value: "$800", type: "currency" },
    ],
    status: "confirmed",
    createdAt: "2024-01-22T09:00:00Z",
    confirmedAt: "2024-01-22T10:30:00Z",
  },
];

const statusConfig: Record<DealStatus, { label: string; color: "default" | "secondary" | "destructive" | "success" | "warning"; icon: typeof Clock; dotClass: string }> = {
  pending: { label: "Pending", color: "warning", icon: Clock, dotClass: "bg-amber-500" },
  sealing: { label: "Sealing", color: "secondary", icon: RefreshCw, dotClass: "bg-blue-500" },
  confirmed: { label: "Confirmed", color: "success", icon: CheckCircle2, dotClass: "bg-emerald-500" },
  voided: { label: "Voided", color: "destructive", icon: XCircle, dotClass: "bg-red-500" },
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");
  const [showUserMenu, setShowUserMenu] = useState(false);

  const filteredDeals = demoDeals.filter((deal) => {
    const matchesSearch =
      deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      deal.recipientName?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: demoDeals.length,
    pending: demoDeals.filter((d) => d.status === "pending").length,
    confirmed: demoDeals.filter((d) => d.status === "confirmed").length,
    voided: demoDeals.filter((d) => d.status === "voided").length,
    confirmationRate: Math.round((demoDeals.filter((d) => d.status === "confirmed").length / demoDeals.length) * 100),
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  return (
    <div className="min-h-screen bg-background flex">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col fixed inset-y-0 z-40 border-r bg-card">
        {/* Logo */}
        <div className="h-16 flex items-center px-6 border-b">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Proofo</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-2">
          <Link href="/dashboard">
            <Button variant="secondary" className="w-full justify-start gap-3 h-11">
              <Home className="h-4 w-4" />
              Dashboard
            </Button>
          </Link>
          <Link href="/deal/new">
            <Button variant="ghost" className="w-full justify-start gap-3 h-11">
              <Plus className="h-4 w-4" />
              New Deal
            </Button>
          </Link>
          <Button variant="ghost" className="w-full justify-start gap-3 h-11 text-muted-foreground">
            <Settings className="h-4 w-4" />
            Settings
          </Button>
        </nav>

        {/* Pro Upgrade Banner */}
        <div className="p-4">
          <Card className="bg-gradient-to-br from-primary/10 via-primary/5 to-transparent border-primary/20">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Upgrade to Pro</span>
              </div>
              <p className="text-xs text-muted-foreground mb-3">
                Remove watermarks & get unlimited history
              </p>
              <Button size="sm" className="w-full shadow-lg shadow-primary/20">
                Upgrade
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* User Menu */}
        <div className="p-4 border-t">
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-accent transition-colors"
            >
              <div className="h-9 w-9 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold text-sm">
                JD
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-medium">John Doe</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="absolute bottom-full left-0 right-0 mb-2 p-2 bg-popover border rounded-xl shadow-lg"
                >
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10" size="sm">
                    <User className="h-4 w-4" />
                    Profile
                  </Button>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10" size="sm">
                    <Settings className="h-4 w-4" />
                    Settings
                  </Button>
                  <div className="my-2 border-t" />
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 text-destructive hover:text-destructive" size="sm">
                    <LogOut className="h-4 w-4" />
                    Log Out
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:pl-64">
        {/* Top Bar */}
        <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-30 flex items-center justify-between px-6">
          <div className="lg:hidden flex items-center gap-2.5">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl tracking-tight">Proofo</span>
            </Link>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-xl font-semibold">Dashboard</h1>
          </div>

          <div className="flex items-center gap-3">
            <Link href="/deal/new">
              <Button className="shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">New Deal</span>
              </Button>
            </Link>
            <div className="lg:hidden">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Welcome Section */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Welcome back, John! 👋</h2>
              <p className="text-muted-foreground">
                Here&apos;s an overview of your deals
              </p>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center">
                    <FileCheck className="h-5 w-5 text-primary" />
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    All time
                  </Badge>
                </div>
                <p className="text-3xl font-bold tracking-tight">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Deals</p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-amber-500/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="status-dot status-dot-pending" />
                </div>
                <p className="text-3xl font-bold tracking-tight">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/20 to-emerald-500/10 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex items-center gap-1 text-emerald-600 text-xs font-medium">
                    <TrendingUp className="h-3 w-3" />
                    {stats.confirmationRate}%
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">{stats.confirmed}</p>
                <p className="text-sm text-muted-foreground">Confirmed</p>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all">
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500/20 to-red-500/10 flex items-center justify-center">
                    <XCircle className="h-5 w-5 text-red-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold tracking-tight">{stats.voided}</p>
                <p className="text-sm text-muted-foreground">Voided</p>
              </CardContent>
            </Card>
          </div>

          {/* Deals Section */}
          <Card>
            <CardHeader className="pb-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <CardTitle className="text-lg">Your Deals</CardTitle>
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Search */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search deals..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-64"
                    />
                  </div>
                  {/* Filter */}
                  <div className="flex gap-1.5 bg-muted p-1 rounded-xl">
                    {(["all", "pending", "confirmed", "voided"] as const).map((status) => (
                      <Button
                        key={status}
                        variant={statusFilter === status ? "secondary" : "ghost"}
                        size="sm"
                        onClick={() => setStatusFilter(status)}
                        className={`rounded-lg text-xs ${statusFilter === status ? "shadow-sm" : ""}`}
                      >
                        {status === "all" ? (
                          <>
                            <Filter className="h-3 w-3 mr-1" />
                            All
                          </>
                        ) : (
                          statusConfig[status].label
                        )}
                      </Button>
                    ))}
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {/* Deals List */}
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {filteredDeals.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-center py-16"
                    >
                      <div className="h-20 w-20 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
                        <FileCheck className="h-10 w-10 text-muted-foreground" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">No deals found</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        {searchQuery || statusFilter !== "all"
                          ? "Try adjusting your search or filters"
                          : "Create your first deal to get started"}
                      </p>
                      <Link href="/deal/new">
                        <Button className="shadow-lg shadow-primary/20">
                          <Plus className="h-4 w-4 mr-2" />
                          Create New Deal
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
                            className={`group relative p-4 rounded-xl border bg-card hover:shadow-md transition-all ${
                              deal.status === "voided" ? "opacity-60" : ""
                            }`}
                          >
                            <div className="flex flex-col md:flex-row md:items-center gap-4">
                              {/* Deal Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-3 mb-1">
                                  <h3 className="font-semibold text-base truncate">{deal.title}</h3>
                                  <Badge 
                                    variant={statusConfig[deal.status].color}
                                    className="shrink-0 gap-1"
                                  >
                                    <StatusIcon className="h-3 w-3" />
                                    {statusConfig[deal.status].label}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                  <span className="flex items-center gap-1.5">
                                    <User className="h-3.5 w-3.5" />
                                    {deal.recipientName}
                                  </span>
                                  <span className="flex items-center gap-1.5">
                                    <Calendar className="h-3.5 w-3.5" />
                                    {new Date(deal.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                                {/* Terms Preview */}
                                <div className="flex flex-wrap gap-2 mt-3">
                                  {deal.terms.slice(0, 2).map((term) => (
                                    <Badge key={term.id} variant="outline" className="font-normal text-xs">
                                      {term.label}: {term.value}
                                    </Badge>
                                  ))}
                                  {deal.terms.length > 2 && (
                                    <Badge variant="outline" className="font-normal text-xs">
                                      +{deal.terms.length - 2} more
                                    </Badge>
                                  )}
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex items-center gap-2 shrink-0">
                                {deal.status === "pending" && (
                                  <>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => copyToClipboard(`${window.location.origin}/d/${deal.publicId}`)}
                                      className="gap-1.5"
                                    >
                                      <Copy className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Copy Link</span>
                                    </Button>
                                    <Button variant="outline" size="sm" className="gap-1.5">
                                      <RefreshCw className="h-3.5 w-3.5" />
                                      <span className="hidden sm:inline">Resend</span>
                                    </Button>
                                  </>
                                )}
                                <Link href={`/deal/${deal.id}`}>
                                  <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <div className="relative group/menu">
                                  <Button variant="ghost" size="icon" className="h-9 w-9">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                  <div className="hidden group-hover/menu:block absolute right-0 top-full mt-1 w-40 p-1 bg-popover border rounded-xl shadow-lg z-10">
                                    <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9">
                                      <ExternalLink className="h-3.5 w-3.5" />
                                      View Details
                                    </Button>
                                    {deal.status === "pending" && (
                                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9">
                                        <Edit3 className="h-3.5 w-3.5" />
                                        Edit Deal
                                      </Button>
                                    )}
                                    {deal.status !== "voided" && (
                                      <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9 text-destructive hover:text-destructive">
                                        <Trash2 className="h-3.5 w-3.5" />
                                        Void Deal
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
            <Card className="bg-gradient-to-r from-amber-500/10 via-transparent to-transparent border-amber-500/20">
              <CardContent className="py-4 px-6">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0">
                    <Clock className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      You have {stats.pending} pending {stats.pending === 1 ? "deal" : "deals"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Consider sending a reminder to get them signed faster
                    </p>
                  </div>
                  <Button variant="outline" size="sm" className="shrink-0 gap-1.5">
                    <RefreshCw className="h-3.5 w-3.5" />
                    Send Reminders
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
}
