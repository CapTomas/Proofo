"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
];

const statusConfig: Record<DealStatus, { label: string; color: "default" | "secondary" | "destructive" | "success" | "warning" }> = {
  pending: { label: "Pending", color: "warning" },
  sealing: { label: "Sealing", color: "secondary" },
  confirmed: { label: "Confirmed", color: "success" },
  voided: { label: "Voided", color: "destructive" },
};

export default function DashboardPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<DealStatus | "all">("all");

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
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl">Proofo</span>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/deal/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Deal
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <FileCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-sm text-muted-foreground">Total Deals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-yellow-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-sm text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-green-500/10 flex items-center justify-center">
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.confirmed}</p>
                  <p className="text-sm text-muted-foreground">Confirmed</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-red-500/10 flex items-center justify-center">
                  <XCircle className="h-5 w-5 text-red-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.voided}</p>
                  <p className="text-sm text-muted-foreground">Voided</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search deals..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            {(["all", "pending", "confirmed", "voided"] as const).map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? "default" : "outline"}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === "all" ? "All" : statusConfig[status].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Deals List */}
        <div className="space-y-4">
          {filteredDeals.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
                  <FileCheck className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="font-semibold text-lg mb-2">No deals found</h3>
                <p className="text-muted-foreground mb-4">
                  {searchQuery || statusFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Create your first deal to get started"}
                </p>
                <Link href="/deal/new">
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Create New Deal
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            filteredDeals.map((deal, index) => (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className={deal.status === "voided" ? "opacity-60" : ""}>
                  <CardContent className="p-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-3">
                          <h3 className="font-semibold text-lg">{deal.title}</h3>
                          <Badge variant={statusConfig[deal.status].color}>
                            {statusConfig[deal.status].label}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          With {deal.recipientName} • Created{" "}
                          {new Date(deal.createdAt).toLocaleDateString()}
                        </p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          {deal.terms.slice(0, 2).map((term) => (
                            <Badge key={term.id} variant="outline" className="font-normal">
                              {term.label}: {term.value}
                            </Badge>
                          ))}
                          {deal.terms.length > 2 && (
                            <Badge variant="outline" className="font-normal">
                              +{deal.terms.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {deal.status === "pending" && (
                          <>
                            <Button variant="outline" size="sm">
                              <Copy className="h-4 w-4 mr-2" />
                              Copy Link
                            </Button>
                            <Button variant="outline" size="sm">
                              <RefreshCw className="h-4 w-4 mr-2" />
                              Resend
                            </Button>
                          </>
                        )}
                        <Link href={`/deal/${deal.id}`}>
                          <Button variant="ghost" size="sm">
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </main>
    </div>
  );
}
