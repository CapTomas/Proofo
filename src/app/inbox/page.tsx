"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  Inbox as InboxIcon,
  Clock,
  CheckCircle2,
  Eye,
  User,
  Calendar,
  PenLine,
} from "lucide-react";
import Link from "next/link";
import { Deal, DealStatus } from "@/types";
import { timeAgo } from "@/lib/crypto";
import { DashboardLayout } from "@/components/dashboard-layout";

// Demo inbox data - deals where user is recipient
const demoInboxDeals: Deal[] = [
  {
    id: "inbox-demo-1",
    publicId: "xyz789",
    creatorId: "other-user-1",
    creatorName: "Sarah Johnson",
    recipientName: "You",
    recipientEmail: "you@example.com",
    title: "Consulting Agreement",
    description: "Monthly consulting services",
    terms: [
      { id: "1", label: "Service", value: "Marketing Consulting", type: "text" },
      { id: "2", label: "Rate", value: "$150/hour", type: "currency" },
      { id: "3", label: "Duration", value: "3 months", type: "text" },
    ],
    status: "pending",
    createdAt: "2024-01-22T09:00:00Z",
  },
  {
    id: "inbox-demo-2",
    publicId: "qrs456",
    creatorId: "other-user-2",
    creatorName: "Mike Chen",
    recipientName: "You",
    recipientEmail: "you@example.com",
    title: "Equipment Rental",
    description: "Renting studio equipment",
    terms: [
      { id: "1", label: "Equipment", value: "Sound System + Mixer", type: "text" },
      { id: "2", label: "Deposit", value: "$500", type: "currency" },
      { id: "3", label: "Return Date", value: "2024-02-01", type: "date" },
    ],
    status: "confirmed",
    createdAt: "2024-01-18T14:30:00Z",
    confirmedAt: "2024-01-18T16:00:00Z",
  },
];

const statusConfig: Record<DealStatus, { label: string; icon: typeof Clock }> = {
  pending: { label: "Awaiting Signature", icon: Clock },
  sealing: { label: "Processing", icon: Clock },
  confirmed: { label: "Signed", icon: CheckCircle2 },
  voided: { label: "Voided", icon: Clock },
};

export default function InboxPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "confirmed">("all");

  // In a real app, this would fetch deals where user is recipient
  // For now, we use demo data
  const inboxDeals = demoInboxDeals;

  const filteredDeals = useMemo(() => {
    return inboxDeals.filter((deal) => {
      const matchesSearch =
        deal.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        deal.creatorName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === "all" || deal.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [inboxDeals, searchQuery, statusFilter]);

  const stats = useMemo(() => {
    const total = inboxDeals.length;
    const pending = inboxDeals.filter((d) => d.status === "pending").length;
    const signed = inboxDeals.filter((d) => d.status === "confirmed").length;
    return { total, pending, signed };
  }, [inboxDeals]);

  return (
    <DashboardLayout title="Inbox">
      <div className="space-y-6">
        {/* Info Banner */}
        <Card className="border-dashed bg-muted/30">
          <CardContent className="py-3 px-4">
            <div className="flex items-center gap-3">
              <InboxIcon className="h-4 w-4 text-primary shrink-0" />
              <div className="text-sm">
                <span className="font-medium">Your Inbox</span>
                <span className="text-muted-foreground"> — deals where you&apos;re the recipient. Sign or review agreements sent to you.</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold">{stats.total}</p>
              <p className="text-xs text-muted-foreground">Total Received</p>
            </CardContent>
          </Card>
          <Card className={stats.pending > 0 ? "border-amber-500/50" : ""}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-2xl font-semibold text-amber-500">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Awaiting Your Signature</p>
                </div>
                {stats.pending > 0 && (
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-emerald-500">{stats.signed}</p>
              <p className="text-xs text-muted-foreground">Signed</p>
            </CardContent>
          </Card>
        </div>

        {/* Deals List */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <CardTitle className="text-base font-medium">Received Agreements</CardTitle>
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
                  {(["all", "pending", "confirmed"] as const).map((status) => (
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
                    <h3 className="font-medium mb-1">No deals in your inbox</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || statusFilter !== "all"
                        ? "Try adjusting your search"
                        : "When someone sends you a deal, it will appear here"}
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
                          }`}
                        >
                          <div className="flex flex-col md:flex-row md:items-center gap-3">
                            {/* Deal Info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="font-medium text-sm truncate">{deal.title}</h3>
                                <Badge 
                                  variant={isPending ? "warning" : "success"}
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
                              {/* Terms Preview */}
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

                            {/* Actions */}
                            <div className="flex items-center gap-1.5 shrink-0">
                              {isPending ? (
                                <Link href={`/d/${deal.publicId}`}>
                                  <Button size="sm" className="h-7 text-xs gap-1">
                                    <PenLine className="h-3 w-3" />
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

        {/* Pending Reminder */}
        {stats.pending > 0 && (
          <Card className="border-amber-500/50 bg-amber-500/5">
            <CardContent className="py-3 px-4">
              <div className="flex items-center gap-3">
                <PenLine className="h-4 w-4 text-amber-500 shrink-0" />
                <div className="flex-1 text-sm">
                  <span className="font-medium">{stats.pending} deal{stats.pending > 1 ? 's' : ''} waiting for your signature</span>
                  <span className="text-muted-foreground"> — review and sign to complete</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
