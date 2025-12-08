"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "@/components/public-header";
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
  ArrowLeft,
  Sparkles,
  ArrowRight
} from "lucide-react";
import Link from "next/link";

// Hash verification status type
type HashVerificationStatus = "pending" | "verifying" | "valid" | "invalid" | "error";

// Scramble text animation component
const ScrambleText = ({ text, className, trigger = true }: { text: string; className?: string; trigger?: boolean }) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = "0123456789abcdef";

  useEffect(() => {
    if (!trigger) return;
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 2;
    }, 30);
    return () => clearInterval(interval);
  }, [text, trigger]);

  return <span className={className}>{displayText}</span>;
};

// Pulsing shield animation for verification
const PulsingShield = ({ status }: { status: HashVerificationStatus }) => {
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

// Copyable Hash Display
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

function VerifyContent() {
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
  const [hashVerificationStatus, setHashVerificationStatus] = useState<HashVerificationStatus>("pending");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);

  const performSearch = useCallback(async (searchId: string, updateUrl: boolean = false) => {
    if (!searchId) return;

    setIsSearching(true);
    setHashVerificationStatus("pending");
    setCalculatedHash(null);

    if (updateUrl) {
      router.push(`/verify?id=${searchId}`, { scroll: false });
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
            // If no seal hash exists yet (e.g. draft), we just show the calculated one
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
    <div className="min-h-screen bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary">
      <PublicHeader currentPage="verify" />

      <main className="relative pt-28 pb-20 container mx-auto px-4 max-w-6xl">
        
        {/* Back Navigation */}
        <div className="mb-8">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          
          {/* LEFT COLUMN: Context & Search */}
          <div className="lg:sticky lg:top-32 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 bg-secondary/50 border-0 text-foreground">
                <Shield className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Deal Verification
              </Badge>

              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-8 text-foreground leading-[1.1]">
                Verify any <br />
                <span className="text-muted-foreground">deal instantly.</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Cryptographic proof of every agreement. <br />
                Enter a Deal ID to verify its integrity.
              </p>
            </motion.div>

            {/* Search Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="pt-4"
            >
              <div className="bg-secondary/30 rounded-3xl p-8 border border-border relative overflow-hidden">
                 <div className="relative z-10">
                   <h3 className="text-2xl font-bold mb-6">Check Deal Status</h3>
                   
                   <form onSubmit={handleSearch} className="space-y-4">
                     <div className="space-y-2">
                       <Label htmlFor="deal-id" className="text-muted-foreground">Deal ID</Label>
                       <div className="relative">
                         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                         <Input
                           id="deal-id"
                           placeholder="e.g. deal_123abc..."
                           value={dealId}
                           onChange={(e) => setDealId(e.target.value)}
                           className="pl-10 h-12 bg-background border-border/50 text-base"
                         />
                       </div>
                     </div>
                     
                     <Button 
                       type="submit" 
                       size="xl" 
                       className="w-full text-base rounded-xl shadow-lg shadow-primary/10 h-12"
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
                 </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {!hasSearched ? (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="hidden lg:flex flex-col items-center justify-center py-20 text-center space-y-6"
                >
                  {/* Empty state is now invisible/minimal as requested */}
                </motion.div>
              ) : searchedDeal ? (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Verification Status Card */}
                  <Card className="overflow-hidden border shadow-card bg-card w-full">
                    <div className="p-6 border-b bg-background/50">
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

                    <div className="p-6 space-y-6">
                      {/* Status Badge */}
                      <div className="flex items-center justify-between p-4 rounded-xl bg-secondary/30 border">
                        <div className="flex items-center gap-3">
                          <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                            searchedDeal.status === 'sealed' ? 'bg-emerald-500/10 text-emerald-600' :
                            searchedDeal.status === 'active' ? 'bg-blue-500/10 text-blue-600' :
                            'bg-secondary text-muted-foreground'
                          }`}>
                            {searchedDeal.status === 'sealed' ? <CheckCircle2 className="h-5 w-5" /> :
                             searchedDeal.status === 'active' ? <Clock className="h-5 w-5" /> :
                             <FileCheck className="h-5 w-5" />}
                          </div>
                          <div>
                            <p className="font-medium text-sm">Current Status</p>
                            <p className="text-xs text-muted-foreground capitalize">{searchedDeal.status}</p>
                          </div>
                        </div>
                        <Badge variant={searchedDeal.status === 'sealed' ? 'success' : 'outline'}>
                          {searchedDeal.status}
                        </Badge>
                      </div>

                      {/* Hash Comparison */}
                      <div className="space-y-4">
                        <h3 className="text-sm font-semibold flex items-center gap-2">
                          <Hash className="h-4 w-4 text-primary" />
                          Cryptographic Proof
                        </h3>
                        
                        <div className="space-y-3">
                          {searchedDeal.dealSeal && (
                            <CopyableHash 
                              label="Recorded Seal Hash (Immutable)" 
                              hash={searchedDeal.dealSeal} 
                            />
                          )}
                          
                          {calculatedHash && (
                            <CopyableHash 
                              label="Calculated Hash (Real-time Verification)" 
                              hash={calculatedHash} 
                            />
                          )}

                          {hashVerificationStatus === "valid" && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Hashes match perfectly. Document integrity verified.
                            </motion.div>
                          )}
                          
                          {hashVerificationStatus === "invalid" && (
                            <motion.div 
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: "auto" }}
                              className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20"
                            >
                              <AlertCircle className="h-3.5 w-3.5" />
                              Hash mismatch! Document may have been altered.
                            </motion.div>
                          )}
                        </div>
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
                  className="flex flex-col items-center justify-center py-16 text-center space-y-4 border rounded-3xl bg-card border-destructive/20"
                >
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Deal Not Found</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                      We couldn't find a deal with ID <span className="font-mono text-foreground bg-secondary px-1 rounded">{dealId}</span>.
                      Please check the ID and try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={() => setHasSearched(false)} className="mt-4">
                    Try Again
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </main>
    </div>
  );
}

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-background" />}>
      <VerifyContent />
    </Suspense>
  );
}
