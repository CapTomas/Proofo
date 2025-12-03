"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Shield,
  CheckCircle2,
  Search,
  AlertCircle,
  Lock,
  FileCheck,
  User,
  Clock,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { formatDate, formatDateTime } from "@/lib/crypto";

export default function VerifyPage() {
  const { getDealByPublicId, getAuditLogsForDeal } = useAppStore();
  const [dealId, setDealId] = useState("");
  const [searchedDeal, setSearchedDeal] = useState<ReturnType<typeof getDealByPublicId>>(undefined);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const deal = getDealByPublicId(dealId.trim());
    setSearchedDeal(deal);
    setHasSearched(true);
  };

  const auditLogs = useMemo(() => {
    if (!searchedDeal) return [];
    return getAuditLogsForDeal(searchedDeal.id);
  }, [searchedDeal, getAuditLogsForDeal]);

  const creatorInitials = useMemo(() => {
    if (!searchedDeal) return "??";
    return searchedDeal.creatorName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [searchedDeal]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Proofo</span>
          </Link>
          <Link href="/dashboard">
            <Button>Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-2xl">
        <div className="text-center mb-10">
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold mb-3 tracking-tight">Verify a Deal</h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Enter a deal ID to verify its authenticity and view its cryptographic seal
          </p>
        </div>

        {/* Search Form */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="flex gap-3">
              <div className="flex-1">
                <Label htmlFor="dealId" className="sr-only">
                  Deal ID
                </Label>
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="dealId"
                    value={dealId}
                    onChange={(e) => setDealId(e.target.value)}
                    placeholder="Enter deal ID (e.g., abc123xyz)"
                    className="pl-11"
                  />
                </div>
              </div>
              <Button type="submit" disabled={!dealId.trim()}>
                Verify
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence mode="wait">
          {hasSearched && !searchedDeal && (
            <motion.div
              key="not-found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <Card className="border-destructive/50">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-6 w-6 text-destructive" />
                  </div>
                  <h3 className="font-semibold mb-2">Deal Not Found</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    We couldn&apos;t find a deal with that ID. Please check the ID and try again.
                  </p>
                  <Button variant="outline" onClick={() => setHasSearched(false)}>
                    Clear Search
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {hasSearched && searchedDeal && (
            <motion.div
              key="found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Verification Status */}
              <Card className={searchedDeal.status === "confirmed" ? "border-emerald-500/50" : ""}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-14 w-14 rounded-full flex items-center justify-center ${
                      searchedDeal.status === "confirmed" 
                        ? "bg-emerald-500/10" 
                        : searchedDeal.status === "voided"
                        ? "bg-destructive/10"
                        : "bg-muted"
                    }`}>
                      {searchedDeal.status === "confirmed" ? (
                        <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                      ) : searchedDeal.status === "voided" ? (
                        <AlertCircle className="h-7 w-7 text-destructive" />
                      ) : (
                        <Clock className="h-7 w-7 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-lg">
                          {searchedDeal.status === "confirmed" 
                            ? "Verified & Sealed" 
                            : searchedDeal.status === "voided"
                            ? "Deal Voided"
                            : "Pending Signature"}
                        </h3>
                        <Badge 
                          variant={
                            searchedDeal.status === "confirmed" 
                              ? "success" 
                              : searchedDeal.status === "voided"
                              ? "destructive"
                              : "warning"
                          }
                        >
                          {searchedDeal.status.charAt(0).toUpperCase() + searchedDeal.status.slice(1)}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {searchedDeal.status === "confirmed" 
                          ? "This deal has been cryptographically sealed and is authentic."
                          : searchedDeal.status === "voided"
                          ? "This deal has been voided and is no longer valid."
                          : "This deal is waiting for the recipient to sign."}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Deal Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Deal Details</CardTitle>
                  <CardDescription>Information about this agreement</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-4 pb-4 border-b">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-semibold text-sm">
                      {creatorInitials}
                    </div>
                    <div>
                      <p className="font-medium">{searchedDeal.creatorName}</p>
                      <p className="text-sm text-muted-foreground">Creator</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground mx-2" />
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <User className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{searchedDeal.recipientName || "Recipient"}</p>
                      <p className="text-sm text-muted-foreground">Recipient</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Title</p>
                      <p className="font-medium">{searchedDeal.title}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Created</p>
                      <p className="font-medium">{formatDate(searchedDeal.createdAt)}</p>
                    </div>
                    {searchedDeal.confirmedAt && (
                      <div>
                        <p className="text-muted-foreground">Sealed</p>
                        <p className="font-medium">{formatDateTime(searchedDeal.confirmedAt)}</p>
                      </div>
                    )}
                    {searchedDeal.voidedAt && (
                      <div>
                        <p className="text-muted-foreground">Voided</p>
                        <p className="font-medium">{formatDateTime(searchedDeal.voidedAt)}</p>
                      </div>
                    )}
                  </div>

                  {searchedDeal.dealSeal && (
                    <>
                      <Separator />
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Lock className="h-4 w-4 text-muted-foreground" />
                          <p className="text-sm font-medium">Cryptographic Seal (SHA-256)</p>
                        </div>
                        <code className="block p-3 bg-muted rounded-lg text-xs font-mono break-all">
                          {searchedDeal.dealSeal}
                        </code>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Audit Trail */}
              {auditLogs.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Audit Trail</CardTitle>
                    <CardDescription>Timeline of events for this deal</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[17px] top-0 bottom-0 w-0.5 bg-border" />
                      
                      <div className="space-y-4">
                        {auditLogs.map((log, index) => (
                          <motion.div
                            key={log.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className="relative pl-10"
                          >
                            <div className={`absolute left-0 h-9 w-9 rounded-full flex items-center justify-center ${
                              log.eventType === "deal_confirmed" 
                                ? "bg-emerald-500/10" 
                                : log.eventType === "deal_voided"
                                ? "bg-destructive/10"
                                : "bg-muted"
                            }`}>
                              {log.eventType === "deal_created" && <FileCheck className="h-4 w-4 text-primary" />}
                              {log.eventType === "deal_viewed" && <Search className="h-4 w-4 text-muted-foreground" />}
                              {log.eventType === "deal_confirmed" && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                              {log.eventType === "deal_voided" && <AlertCircle className="h-4 w-4 text-destructive" />}
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {log.eventType === "deal_created" && "Deal Created"}
                                {log.eventType === "deal_viewed" && "Deal Viewed"}
                                {log.eventType === "deal_confirmed" && "Deal Confirmed & Sealed"}
                                {log.eventType === "deal_voided" && "Deal Voided"}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(log.createdAt)} • {log.actorType}
                              </p>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* View Deal Link */}
              <div className="text-center">
                <Link href={`/d/${searchedDeal.publicId}`}>
                  <Button variant="outline" className="gap-2">
                    View Full Deal
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!hasSearched && (
          <div className="text-center text-sm text-muted-foreground">
            <p className="mb-4">The deal ID can be found in:</p>
            <ul className="space-y-1">
              <li>• The deal URL (e.g., proofo.app/d/<strong>abc123xyz</strong>)</li>
              <li>• The PDF receipt footer</li>
              <li>• The confirmation email</li>
            </ul>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4" />
            Proofo • Evidence that holds up
          </p>
        </div>
      </footer>
    </div>
  );
}
