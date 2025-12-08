"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuditTimeline } from "@/components/audit-timeline";
import { useAppStore } from "@/store";
import { formatDate, calculateDealSeal } from "@/lib/crypto";
import { getDealByPublicIdAction, getAuditLogsAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Deal, AuditLogEntry } from "@/types";
import {
  Shield,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  User,
  XCircle,
  RefreshCw,
  Lock,
  FileCheck,
  Copy,
  Check,
  ExternalLink,
  Hash,
  Calendar,
  Sparkles,
  ArrowRight
} from "lucide-react";

// --- MICRO-COMPONENTS ---

const PulsingShield = ({ status }: { status: "pending" | "verifying" | "valid" | "invalid" | "error" }) => {
  const colors = {
    pending: "border-border/50 text-muted-foreground",
    verifying: "border-primary/50 text-primary",
    valid: "border-emerald-500/50 text-emerald-600",
    invalid: "border-destructive/50 text-destructive",
    error: "border-amber-500/50 text-amber-600",
  };

  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      {status === "verifying" && (
        <>
          <motion.div
            className="absolute inset-0 rounded-full border-2 border-primary/20"
            animate={{ scale: [1, 1.3, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-2 rounded-full border border-primary/40"
            animate={{ scale: [1, 1.2, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
        </>
      )}
      <div className={`h-12 w-12 rounded-xl border-2 ${colors[status]} flex items-center justify-center bg-background transition-colors duration-300`}>
        {status === "verifying" ? (
          <RefreshCw className="h-5 w-5 animate-spin" />
        ) : status === "valid" ? (
          <CheckCircle2 className="h-5 w-5" />
        ) : status === "invalid" ? (
          <XCircle className="h-5 w-5" />
        ) : status === "error" ? (
          <AlertCircle className="h-5 w-5" />
        ) : (
          <Shield className="h-5 w-5" />
        )}
      </div>
    </div>
  );
};

const CopyableHash = ({ hash, label }: { hash: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium">{label}</div>
      <div
        onClick={handleCopy}
        className="group cursor-pointer font-mono text-[10px] text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary/70 transition-colors break-all flex items-center justify-between gap-2"
      >
        <span className="truncate">{hash}</span>
        <div className="shrink-0">
          {copied ? (
            <Check className="h-3.5 w-3.5 text-emerald-500" />
          ) : (
            <Copy className="h-3.5 w-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </div>
    </div>
  );
};

function DashboardVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get("id") || "";
  
  const { getDealByPublicId, getAuditLogsForDeal } = useAppStore();
  const [dealId, setDealId] = useState(initialDealId);
  const [searchedDeal, setSearchedDeal] = useState<Deal | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  // Hash verification state
  const [hashVerificationStatus, setHashVerificationStatus] = useState<"pending" | "verifying" | "valid" | "invalid" | "error">("pending");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);

  const performSearch = useCallback(async (searchId: string, updateUrl: boolean = false) => {
    if (!searchId) return;

    setIsSearching(true);
    setHashVerificationStatus("pending");
    setCalculatedHash(null);

    if (updateUrl) {
      router.push(`/dashboard/verify?id=${searchId}`, { scroll: false });
    }

    // First try local store
    const localDeal = getDealByPublicId(searchId);
    if (localDeal) {
      setSearchedDeal(localDeal);
      const localLogs = getAuditLogsForDeal(localDeal.id);
      setAuditLogs(localLogs);
    } else if (isSupabaseConfigured()) {
      // Try Supabase
      const { deal, error } = await getDealByPublicIdAction(searchId);
      if (deal && !error) {
        setSearchedDeal(deal);
        const { logs } = await getAuditLogsAction(deal.id);
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
  }, [getDealByPublicId, getAuditLogsForDeal, router]);

  // Initial search if ID is present
  useEffect(() => {
    if (initialDealId && !hasSearched) {
      performSearch(initialDealId);
    }
  }, [initialDealId, hasSearched, performSearch]);

  // Verify hash when deal is found
  useEffect(() => {
    if (searchedDeal) {
      const verifyHash = async () => {
        setHashVerificationStatus("verifying");
        
        // Simulate calculation delay for effect
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        try {
          const hash = await calculateDealSeal({
            dealId: searchedDeal.id,
            terms: JSON.stringify(searchedDeal.terms),
            signatureUrl: searchedDeal.signatureUrl || "",
            timestamp: searchedDeal.confirmedAt || searchedDeal.createdAt,
          });
          setCalculatedHash(hash);
          
          if (searchedDeal.dealSeal && hash === searchedDeal.dealSeal) {
            setHashVerificationStatus("valid");
          } else if (searchedDeal.dealSeal) {
            setHashVerificationStatus("invalid");
          } else {
            setHashVerificationStatus("pending");
          }
        } catch (error) {
          console.error("Hash calculation error:", error);
          setHashVerificationStatus("error");
        }
      };
      
      verifyHash();
    }
  }, [searchedDeal]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(dealId, true);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto px-0 sm:px-4 lg:px-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-2 border-b border-border/40 px-4 sm:px-0">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Verify Deal</h1>
          <p className="text-muted-foreground">Check the integrity and status of any deal.</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-8 px-4 sm:px-0">
        {/* Left Column: Search & Info */}
        <div className="space-y-6">
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle>Search Deal</CardTitle>
              <CardDescription>Enter the Deal ID to verify.</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSearch} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="deal-id">Deal ID</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="deal-id"
                      placeholder="e.g. deal_123abc..."
                      value={dealId}
                      onChange={(e) => setDealId(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={isSearching || !dealId}
                >
                  {isSearching ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    <>
                      Verify Deal
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="bg-secondary/20 border-none">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-center gap-3 text-primary">
                <Shield className="h-5 w-5" />
                <h3 className="font-semibold">How it works</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Every deal is cryptographically sealed with a SHA-256 hash. This ensures that the document content and history cannot be tampered with without detection.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Results */}
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {!hasSearched ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full min-h-[200px] flex flex-col items-center justify-center text-center space-y-2"
              >
                <p className="text-muted-foreground text-sm">
                  Results will appear here
                </p>
              </motion.div>
            ) : searchedDeal ? (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Verification Status Card */}
                <Card className="overflow-hidden border shadow-sm">
                  <div className="p-6 border-b bg-muted/30">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h2 className="text-xl font-bold flex items-center gap-2">
                          {searchedDeal.title}
                        </h2>
                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5" />
                          Created {formatDate(searchedDeal.createdAt)}
                        </p>
                      </div>
                      <PulsingShield status={hashVerificationStatus} />
                    </div>
                  </div>

                  <div className="p-6 grid md:grid-cols-2 gap-6">
                    {/* Status Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Status</h3>
                      <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50 border">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                          searchedDeal.status === 'sealed' ? 'bg-emerald-500/10 text-emerald-600' :
                          searchedDeal.status === 'active' ? 'bg-blue-500/10 text-blue-600' :
                          'bg-secondary text-muted-foreground'
                        }`}>
                          {searchedDeal.status === 'sealed' ? <CheckCircle2 className="h-4 w-4" /> :
                           searchedDeal.status === 'active' ? <Clock className="h-4 w-4" /> :
                           <FileCheck className="h-4 w-4" />}
                        </div>
                        <div>
                          <p className="font-medium text-sm capitalize">{searchedDeal.status}</p>
                        </div>
                      </div>
                    </div>

                    {/* Hash Info */}
                    <div className="space-y-4">
                      <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Integrity</h3>
                      {hashVerificationStatus === "valid" ? (
                        <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-500/10 px-3 py-2.5 rounded-lg border border-emerald-500/20">
                          <CheckCircle2 className="h-4 w-4" />
                          Verified & Valid
                        </div>
                      ) : hashVerificationStatus === "invalid" ? (
                        <div className="flex items-center gap-2 text-sm text-destructive bg-destructive/10 px-3 py-2.5 rounded-lg border border-destructive/20">
                          <AlertCircle className="h-4 w-4" />
                          Verification Failed
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground bg-secondary/50 px-3 py-2.5 rounded-lg border">
                          <RefreshCw className="h-4 w-4 animate-spin" />
                          Verifying...
                        </div>
                      )}
                    </div>
                    
                    <div className="md:col-span-2 space-y-3 pt-2 border-t">
                       {searchedDeal.dealSeal && (
                        <CopyableHash 
                          label="Seal Hash" 
                          hash={searchedDeal.dealSeal} 
                        />
                      )}
                    </div>
                  </div>
                </Card>

                {/* Audit Trail */}
                <Card className="overflow-hidden border shadow-sm">
                  <CardHeader className="pb-4 border-b bg-muted/30">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Clock className="h-4 w-4 text-primary" />
                      Audit Trail
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <div className="max-h-[400px] overflow-y-auto p-6">
                      <AuditTimeline logs={auditLogs} />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="not-found"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex flex-col items-center justify-center py-16 text-center space-y-4 border rounded-xl bg-card border-destructive/20"
              >
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                  <AlertCircle className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Deal Not Found</h3>
                  <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                    We couldn't find a deal with ID <span className="font-mono text-foreground bg-secondary px-1 rounded">{dealId}</span>.
                  </p>
                </div>
                <Button variant="outline" onClick={() => setHasSearched(false)} className="mt-2">
                  Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

export default function DashboardVerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <DashboardVerifyContent />
    </Suspense>
  );
}
