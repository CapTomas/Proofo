"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  User,
  Eye,
  Calendar,
  Inbox as InboxIcon,
  FileSignature,
  RefreshCw,
  FileCheck,
} from "lucide-react";
import Link from "next/link";
import { Deal, DealStatus } from "@/types";
import { useAppStore } from "@/store";
import { timeAgo } from "@/lib/crypto";

const statusConfig: Record<DealStatus, { label: string; color: "default" | "secondary" | "destructive" | "success" | "warning"; icon: typeof Clock }> = {
  pending: { label: "Waiting to Sign", color: "warning", icon: Clock },
  sealing: { label: "Sealing", color: "secondary", icon: RefreshCw },
  confirmed: { label: "Signed", color: "success", icon: CheckCircle2 },
  voided: { label: "Voided", color: "destructive", icon: XCircle },
};

// Demo inbox deals
const demoInboxDeals: Deal[] = [
  {
    id: "inbox-demo-1",
    publicId: "inbox123",
    creatorId: "other-user-1",
    creatorName: "Alice Johnson",
    recipientName: "You",
    recipientEmail: "you@example.com",
    title: "Freelance Design Contract",
    description: "Design services agreement",
    terms: [
      { id: "1", label: "Service", value: "Logo Design", type: "text" },
      { id: "2", label: "Fee", value: "$500", type: "currency" },
      { id: "3", label: "Deadline", value: "2024-02-28", type: "date" },
    ],
    status: "pending",
    createdAt: "2024-01-25T09:00:00Z",
  },
  {
    id: "inbox-demo-2",
    publicId: "inbox456",
    creatorId: "other-user-2",
    creatorName: "Bob Smith",
    recipientName: "You",
    recipientEmail: "you@example.com",
    title: "Equipment Rental",
    description: "Camera equipment rental agreement",
    terms: [
      { id: "1", label: "Equipment", value: "Sony A7IV + lenses", type: "text" },
      { id: "2", label: "Duration", value: "1 week", type: "text" },
      { id: "3", label: "Deposit", value: "$200", type: "currency" },
    ],
    status: "confirmed",
    createdAt: "2024-01-20T14:30:00Z",
    confirmedAt: "2024-01-21T10:00:00Z",
  },
];

export default function InboxPage() {
  const { user, deals: storeDeals } = useAppStore();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "signed">("all");

  // Filter deals where user is the recipient (by email)
  const inboxDeals = useMemo(() => {
    if (!user?.email) return demoInboxDeals;
    
    const recipientDeals = storeDeals.filter(
      deal => deal.recipientEmail?.toLowerCase() === user.email.toLowerCase() && 
              deal.creatorId !== user.id
    );
    
    return recipientDeals.length > 0 ? recipientDeals : demoInboxDeals;
  }, [storeDeals, user?.email, user?.id]);

  const filteredDeals = useMemo(() => {
    return inboxDeals.filter((deal) => {
      const matchesSearch =
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.creatorName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      let matchesStatus = true;
      if (statusFilter === "pending") {
        matchesStatus = deal.status === "pending";
      } else if (statusFilter === "signed") {
        matchesStatus = deal.status === "confirmed";
      }
      
      return matchesSearch && matchesStatus;
    });
  }, [inboxDeals, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = inboxDeals.length;
    const pending = inboxDeals.filter((d) => d.status === "pending").length;
    const signed = inboxDeals.filter((d) => d.status === "confirmed").length;
    return { total, pending, signed };
  }, [inboxDeals]);

  const isUsingDemoData = !user?.email || inboxDeals === demoInboxDeals;

  return (
    <DashboardLayout title="Inbox">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Inbox</h2>
            <p className="text-sm text-muted-foreground">
              Deals waiting for your signature
            </p>
          </div>
          {stats.pending > 0 && (
            <Badge variant="warning" className="gap-1.5">
              <Clock className="h-3 w-3" />
              {stats.pending} waiting
            </Badge>
          )}
        </div>

        {/* Demo Banner */}
        {isUsingDemoData && (
          <Card className="border-dashed bg-muted/30">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <InboxIcon className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium">Demo Mode</span>
                  <span className="text-muted-foreground"> — when someone creates a deal with your email, it will appear here.</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <InboxIcon className="h-4 w-4 text-muted-foreground" />
              </div>
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Received</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <FileSignature className="h-4 w-4 text-muted-foreground" />
                <div className="h-2 w-2 rounded-full bg-amber-500" />
              </div>
              <p className="text-2xl font-semibold">{stats.pending}</p>
              <p className="text-xs text-muted-foreground">To Sign</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
              </div>
              <p className="text-2xl font-semibold">{stats.signed}</p>
              <p className="text-xs text-muted-foreground">Signed</p>
            </CardContent>
          </Card>
        </div>

        {/* Deals List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-medium">Received Deals</CardTitle>
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
                  {(["all", "pending", "signed"] as const).map((status) => (
                    <Button
                      key={status}
                      variant={statusFilter === status ? "secondary" : "ghost"}
                      size="sm"
                      onClick={() => setStatusFilter(status)}
                      className={`h-7 text-xs px-2 ${statusFilter === status ? "bg-background shadow-sm" : ""}`}
                    >
                      {status === "all" ? "All" : status === "pending" ? "To Sign" : "Signed"}
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
                      <InboxIcon className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <h3 className="font-medium mb-1">No deals found</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search"
                        : "Deals sent to you will appear here"}
                    </p>
                  </motion.div>
                ) : (
                  filteredDeals.map((deal, index) => {
                    const StatusIcon = statusConfig[deal.status].icon;
                    const isPending = deal.status === "pending";
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
                            isPending ? "border-amber-500/50" : ""
                          } ${deal.status === "voided" ? "opacity-60" : ""}`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-sm truncate">{deal.title}</h3>
                                <Badge 
                                  variant={isPending ? "warning" : "outline"}
                                  className="shrink-0 gap-1 text-xs h-5"
                                >
                                  <StatusIcon className="h-3 w-3" />
                                  {statusConfig[deal.status].label}
                                </Badge>
                              </div>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3" />
                                  From: {deal.creatorName}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {timeAgo(deal.createdAt)}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1.5 mt-2">
                                {deal.terms.slice(0, 2).map((term) => (
                                  <Badge key={term.id} variant="secondary" className="font-normal text-xs h-5">
                                    {term.label}: {term.value}
                                  </Badge>
                                ))}
                                {deal.terms.length > 2 && (
                                  <Badge variant="secondary" className="font-normal text-xs h-5">
                                    +{deal.terms.length - 2} more
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isPending ? (
                                <Link href={`/d/${deal.publicId}`}>
                                  <Button size="sm" className="h-7 text-xs gap-1">
                                    <FileSignature className="h-3 w-3" />
                                    Sign Now
                                  </Button>
                                </Link>
                              ) : (
                                <Link href={`/d/${deal.publicId}`}>
                                  <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                                    <Eye className="h-3 w-3" />
                                    View
                                  </Button>
                                </Link>
                              )}
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

        {/* Info Card */}
        <Card className="border-dashed">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <FileCheck className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="text-sm text-muted-foreground">
                When you sign a deal, both parties receive a cryptographically sealed PDF receipt as proof.
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
