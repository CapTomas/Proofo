"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AuditTimeline } from "@/components/audit-timeline";
import {
  Shield,
  CheckCircle2,
  Search,
  AlertCircle,
  Lock,
  User,
  Clock,
  ArrowRight,
  XCircle,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { formatDate, formatDateTime, calculateDealSeal } from "@/lib/crypto";
import { getDealByPublicIdAction, getAuditLogsAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Deal, AuditLogEntry } from "@/types";

// Hash verification status type
type HashVerificationStatus = "pending" | "verifying" | "valid" | "invalid" | "error";

export default function VerifyPage() {
  const { getDealByPublicId, getAuditLogsForDeal } = useAppStore();
  const [dealId, setDealId] = useState("");
  const [searchedDeal, setSearchedDeal] = useState<Deal | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Hash verification state
  const [hashVerificationStatus, setHashVerificationStatus] = useState<HashVerificationStatus>("pending");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);

  // Verify hash when a confirmed deal is loaded
  useEffect(() => {
    const verifyHash = async () => {
      if (!searchedDeal || searchedDeal.status !== "confirmed" || !searchedDeal.dealSeal) {
        setHashVerificationStatus("pending");
        setCalculatedHash(null);
        return;
      }

      setHashVerificationStatus("verifying");

      try {
        // Re-calculate the hash on the client side using the same data
        const recalculatedHash = await calculateDealSeal({
          dealId: searchedDeal.id,
          terms: JSON.stringify(searchedDeal.terms),
          signatureUrl: searchedDeal.signatureUrl,
          timestamp: searchedDeal.confirmedAt || "",
        });

        setCalculatedHash(recalculatedHash);

        // Compare with stored hash
        if (recalculatedHash === searchedDeal.dealSeal) {
          setHashVerificationStatus("valid");
        } else {
          setHashVerificationStatus("invalid");
        }
      } catch (error) {
        console.error("Error verifying hash:", error);
        setHashVerificationStatus("error");
      }
    };

    verifyHash();
  }, [searchedDeal]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    setHashVerificationStatus("pending");
    setCalculatedHash(null);

    // First try local store
    const localDeal = getDealByPublicId(dealId.trim());
    if (localDeal) {
      setSearchedDeal(localDeal);
      const localLogs = getAuditLogsForDeal(localDeal.id);
      setAuditLogs(localLogs);
    } else if (isSupabaseConfigured()) {
      // Try Supabase
      const { deal, error } = await getDealByPublicIdAction(dealId.trim());
      if (deal && !error) {
        setSearchedDeal(deal);
        // Fetch audit logs
        const { logs } = await getAuditLogsAction(deal.id);
        // Transform logs to match AuditLogEntry type
        const transformedLogs: AuditLogEntry[] = logs.map((log) => ({
          id: log.id,
          dealId: log.dealId,
          eventType: log.eventType as AuditLogEntry["eventType"],
          actorId: log.actorId,
          actorType: log.actorType as AuditLogEntry["actorType"],
          metadata: log.metadata || {},
          createdAt: log.createdAt,
        }));
        setAuditLogs(transformedLogs);
      } else {
        setSearchedDeal(null);
        setAuditLogs([]);
      }
    } else {
      setSearchedDeal(null);
      setAuditLogs([]);
    }

    setHasSearched(true);
    setIsSearching(false);
  };

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
    <div className="max-w-2xl mx-auto">
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
              <Button type="submit" disabled={!dealId.trim() || isSearching}>
                {isSearching ? "Searching..." : "Verify"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <AnimatePresence mode="wait">
          {hasSearched && !searchedDeal && !isSearching && (
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
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Lock className="h-4 w-4 text-muted-foreground" />
                            <p className="text-sm font-medium">Cryptographic Seal (SHA-256)</p>
                          </div>
                          {/* Hash Verification Badge */}
                          {hashVerificationStatus === "verifying" && (
                            <Badge variant="outline" className="gap-1.5">
                              <RefreshCw className="h-3 w-3 animate-spin" />
                              Verifying...
                            </Badge>
                          )}
                          {hashVerificationStatus === "valid" && (
                            <Badge variant="success" className="gap-1.5">
                              <CheckCircle2 className="h-3 w-3" />
                              Cryptographically Valid
                            </Badge>
                          )}
                          {hashVerificationStatus === "invalid" && (
                            <Badge variant="destructive" className="gap-1.5">
                              <XCircle className="h-3 w-3" />
                              Tampered
                            </Badge>
                          )}
                          {hashVerificationStatus === "error" && (
                            <Badge variant="outline" className="gap-1.5 border-amber-500 text-amber-600">
                              <AlertCircle className="h-3 w-3" />
                              Verification Error
                            </Badge>
                          )}
                        </div>

                        {/* Stored Hash */}
                        <div className="mb-3">
                          <p className="text-xs text-muted-foreground mb-1">Stored Seal:</p>
                          <code className="block p-3 bg-muted rounded-lg text-xs font-mono break-all">
                            {searchedDeal.dealSeal}
                          </code>
                        </div>

                        {/* Verification Details */}
                        {hashVerificationStatus === "valid" && (
                          <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <p className="font-medium text-emerald-700 dark:text-emerald-400">
                                  Integrity Verified
                                </p>
                                <p className="text-muted-foreground text-xs mt-1">
                                  The cryptographic seal has been independently re-calculated and matches the stored seal.
                                  This proves the deal data has not been tampered with since it was sealed.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {hashVerificationStatus === "invalid" && calculatedHash && (
                          <div className="space-y-3">
                            <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                              <div className="flex items-start gap-2">
                                <XCircle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                                <div className="text-sm">
                                  <p className="font-medium text-destructive">
                                    Data Tampering Detected
                                  </p>
                                  <p className="text-muted-foreground text-xs mt-1">
                                    The re-calculated hash does not match the stored seal. This indicates the deal
                                    data may have been modified after it was originally sealed.
                                  </p>
                                </div>
                              </div>
                            </div>
                            <div>
                              <p className="text-xs text-muted-foreground mb-1">Re-calculated Hash:</p>
                              <code className="block p-3 bg-muted rounded-lg text-xs font-mono break-all text-destructive">
                                {calculatedHash}
                              </code>
                            </div>
                          </div>
                        )}

                        {hashVerificationStatus === "error" && (
                          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                            <div className="flex items-start gap-2">
                              <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                              <div className="text-sm">
                                <p className="font-medium text-amber-700 dark:text-amber-400">
                                  Verification Error
                                </p>
                                <p className="text-muted-foreground text-xs mt-1">
                                  Unable to verify the cryptographic seal. This may be due to missing data or a technical issue.
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Audit Trail - FedEx-style tracking */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Activity Timeline</CardTitle>
                  <CardDescription>Track all events for this deal</CardDescription>
                </CardHeader>
                <CardContent>
                  <AuditTimeline
                    logs={auditLogs}
                    dealStatus={searchedDeal.status}
                  />
                </CardContent>
              </Card>

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
      </div>
  );
}
