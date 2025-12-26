"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PublicHeader } from "@/components/public-header";
import { AuditTimeline } from "@/components/audit-timeline";
import { useAppStore } from "@/store";
import { formatDate, calculateDealSeal, formatDateTime } from "@/lib/crypto";
import { getDealByPublicIdAction, getAuditLogsAction, logAuditEventAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Deal, AuditLogEntry } from "@/types";
import { generateDealPDF, downloadPDF, generatePDFFilename } from "@/lib/pdf";
import { prepareAuditEvent } from "@/lib/audit-utils";
import { CopyableId, getDealStatusConfig } from "@/components/dashboard/shared-components";
import {
  Shield,
  Search,
  AlertCircle,
  CheckCircle2,
  Clock,
  Sparkles,
  User,
  XCircle,
  RefreshCw,
  Copy,
  Check,
  Hash,
  Calendar,
  ArrowLeft,
  ArrowRight,
  Fingerprint,
  FileText,
  Download,
  ChevronDown,
  ChevronUp,
  Terminal,
  ScanLine,
} from "lucide-react";
import Link from "next/link";

// --- TYPES ---

type HashVerificationStatus = "pending" | "verifying" | "valid" | "invalid" | "error";

// --- MICRO-COMPONENTS ---

const ScrambleText = ({
  text,
  className,
  trigger = true,
}: {
  text: string;
  className?: string;
  trigger?: boolean;
}) => {
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

const PulsingShield = ({ status }: { status: HashVerificationStatus }) => {
  const colors = {
    pending: "border-border/50 text-muted-foreground",
    verifying: "border-primary/50 text-primary",
    valid: "border-emerald-500/50 text-emerald-600",
    invalid: "border-destructive/50 text-destructive",
    error: "border-amber-500/50 text-amber-600",
  };

  return (
    <div className="relative flex items-center justify-center w-12 h-12">
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
      <div
        className={`h-10 w-10 rounded-xl border-2 ${colors[status]} flex items-center justify-center bg-background transition-colors duration-300 shadow-sm`}
      >
        {status === "verifying" ? (
          <RefreshCw className="h-4 w-4 animate-spin" />
        ) : status === "valid" ? (
          <CheckCircle2 className="h-4 w-4" />
        ) : status === "invalid" ? (
          <XCircle className="h-4 w-4" />
        ) : status === "error" ? (
          <AlertCircle className="h-4 w-4" />
        ) : (
          <Shield className="h-4 w-4" />
        )}
      </div>
    </div>
  );
};

const CopyableHash = ({
  hash,
  label,
  scramble = false,
}: {
  hash: string;
  label: string;
  scramble?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(hash);
    setCopied(true);

    // Haptic feedback for mobile
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }

    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1 w-full max-w-full">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center justify-between h-4">
        <span>{label}</span>
        <AnimatePresence>
          {copied && (
            <motion.span
              initial={{ opacity: 0, x: -5 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0 }}
              className="text-emerald-500 flex items-center gap-1"
            >
              <Check className="h-3 w-3" /> Copied
            </motion.span>
          )}
        </AnimatePresence>
      </div>
      <div
        onClick={handleCopy}
        className="group cursor-pointer font-mono text-[10px] sm:text-xs text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg border border-border/50 hover:bg-secondary/70 transition-all duration-200 flex items-start justify-between gap-3 w-full active:scale-[0.98] active:bg-secondary"
      >
        <span className="break-all whitespace-normal leading-relaxed text-left">
          {scramble ? <ScrambleText text={hash} /> : hash}
        </span>
        <div className="shrink-0 mt-0.5 relative w-3.5 h-3.5">
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
              >
                <Check className="h-3.5 w-3.5 text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity duration-200"
              >
                <Copy className="h-3.5 w-3.5" />
              </motion.div>
            )}
          </AnimatePresence>
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
  const [showTerms, setShowTerms] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Hash verification state
  const [hashVerificationStatus, setHashVerificationStatus] =
    useState<HashVerificationStatus>("pending");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);

  const performSearch = useCallback(
    async (searchId: string, updateUrl: boolean = false) => {
      if (!searchId) return;

      setIsSearching(true);
      setHashVerificationStatus("pending");
      setCalculatedHash(null);
      setShowTerms(false);

      if (updateUrl) {
        router.push(`/verify?id=${searchId}`, { scroll: false });
      }

      let dealData: Deal | null = null;
      let logEntries: AuditLogEntry[] = [];

      // Always try Supabase first if configured
      if (isSupabaseConfigured()) {
        const { deal, error } = await getDealByPublicIdAction(searchId);
        if (deal && !error) {
          dealData = deal;
          const { logs } = await getAuditLogsAction(deal.id);
          logEntries = logs.map((log) => ({
            id: log.id,
            dealId: log.dealId,
            eventType: log.eventType as AuditLogEntry["eventType"],
            actorId: log.actorId,
            actorType: log.actorType as AuditLogEntry["actorType"],
            metadata: log.metadata || {},
            createdAt: log.createdAt,
          }));
        }
      }

      // If not in Supabase or not configured, try local store
      if (!dealData) {
        const localDeal = getDealByPublicId(searchId);
        if (localDeal) {
          dealData = localDeal;
          logEntries = getAuditLogsForDeal(localDeal.id);
        }
      }

      setSearchedDeal(dealData);
      setAuditLogs(logEntries);

      setHasSearched(true);
      setIsSearching(false);
    },
    [getDealByPublicId, getAuditLogsForDeal, router]
  );

  // Handle URL changes and initial load
  useEffect(() => {
    if (!initialDealId) {
      // URL is empty? Reset the UI to search mode
      setHasSearched(false);
      setSearchedDeal(null);
      setDealId("");
      setHashVerificationStatus("pending");
    } else if (initialDealId && !hasSearched) {
      // URL has an ID and we haven't searched yet? Perform search
      setDealId(initialDealId); // Sync input with URL
      performSearch(initialDealId);
    }
  }, [initialDealId, hasSearched, performSearch]);

  // Verify hash when deal is found
  useEffect(() => {
    if (searchedDeal) {
      const verifyHash = async () => {
        setHashVerificationStatus("verifying");

        // Simulate calculation delay for effect
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          const hash = await calculateDealSeal({
            dealId: searchedDeal.id,
            terms: JSON.stringify(searchedDeal.terms),
            signatureUrl: searchedDeal.signatureUrl || "",
            timestamp: searchedDeal.confirmedAt || searchedDeal.createdAt,
          });
          setCalculatedHash(hash);

          let result: "valid" | "invalid" | "pending" = "pending";
          if (searchedDeal.dealSeal && hash === searchedDeal.dealSeal) {
            setHashVerificationStatus("valid");
            result = "valid";
          } else if (searchedDeal.dealSeal) {
            setHashVerificationStatus("invalid");
            result = "invalid";
          } else {
            setHashVerificationStatus("pending");
          }

          // Log verification event (only for non-pending status)
          if (result !== "pending" && isSupabaseConfigured()) {
            const auditEvent = prepareAuditEvent({
              eventType: "deal_verified",
              metadata: { result, hasMatchingSeal: result === "valid" },
              includeClientMetadata: true,
            });
            await logAuditEventAction({
              dealId: searchedDeal.id,
              eventType: auditEvent.eventType,
              actorType: "system",
              metadata: auditEvent.metadata,
            });
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

  const handleReset = () => {
    // Just clear the URL. The useEffect above will handle the state reset.
    router.push("/verify");
  };

  const handleDownloadPDF = async () => {
    if (!searchedDeal) return;
    setIsDownloading(true);
    try {
      const { pdfBlob } = await generateDealPDF({
        deal: searchedDeal,
        signatureDataUrl: searchedDeal.signatureUrl || "",
        isPro: false,
        verificationUrl: window.location.href,
      });
      const filename = generatePDFFilename(searchedDeal);
      downloadPDF(pdfBlob, filename);

      // Log PDF download event
      if (isSupabaseConfigured()) {
        const auditEvent = prepareAuditEvent({
          eventType: "pdf_downloaded",
          metadata: { filename, context: "verify_page" },
          includeClientMetadata: true,
        });
        await logAuditEventAction({
          dealId: searchedDeal.id,
          eventType: auditEvent.eventType,
          actorType: "system",
          metadata: auditEvent.metadata,
        });
      }
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary relative overflow-x-hidden">
      {/* Top Right Gradient Decoration */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[80px] md:blur-[100px] pointer-events-none z-0 translate-x-1/3 -translate-y-1/3" />

      <PublicHeader currentPage="verify" />

      <main className="relative pt-28 pb-20 w-full z-10 transition-all duration-300 px-4 sm:px-6 lg:px-[112px]">
        <div className="max-w-7xl mx-auto w-full">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* LEFT COLUMN: Context & CTA */}
          <div className="lg:sticky lg:top-32 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="secondary"
                className="mb-6 px-4 py-1.5 bg-secondary/50 border-0 text-foreground"
              >
                <Shield className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Deal Verification
              </Badge>

              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-8 text-foreground leading-[1.1]">
                Verify any <br />
                <span className="text-muted-foreground">deal instantly.</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Ensure the integrity of your agreements with our cryptographic verification tool.
                Enter a Deal ID to audit the full history, view the agreed terms, and validate the
                digital seal.
              </p>
            </motion.div>

            {/* CTA Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="hidden lg:block pt-4"
            >
              <div className="bg-secondary/30 rounded-3xl p-8 border border-border relative overflow-hidden backdrop-blur-sm">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-3">Ready to create real deals?</h3>
                  <p className="text-muted-foreground mb-8 text-base">
                    Start creating enforceable agreements in seconds.
                  </p>
                  <Link href="/dashboard">
                    <Button
                      size="xl"
                      className="w-full text-base rounded-2xl shadow-lg shadow-primary/10 h-14"
                    >
                      Create Your First Proof
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Interactive Verification Card */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {!hasSearched ? (
                // Initial State: Search Form (Styled like Demo Card)
                <motion.div
                  key="search"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0, y: -20 }}
                >
                  <Card className="overflow-hidden border shadow-card bg-card/80 backdrop-blur-sm w-full">
                    {/* Header - System Style */}
                    <div className="p-4 border-b flex items-center justify-between bg-background">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/80  flex items-center justify-center text-primary/60 font-semibold shadow-lg shadow-primary/20">
                          <Terminal className="h-5 w-5 text-primary-foreground font-semibold" />
                        </div>
                        <div>
                          <p className="font-semibold text-sm">Proofo Verification</p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            System Ready
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="gap-1 px-2 h-6 text-xs bg-secondary/50">
                        <span className="relative flex h-2 w-2 mr-1">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        Online
                      </Badge>
                    </div>

                    {/* Title Bar */}
                    <div className="bg-muted dark:bg-muted/30 border-b py-4 px-5">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                          <ScanLine className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg leading-tight">Secure Lookup</CardTitle>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            Enter Deal ID to retrieve proof
                          </p>
                        </div>
                      </div>
                    </div>

                    <CardContent className="p-6 sm:p-8">
                      <form onSubmit={handleSearch} className="space-y-4">
                        <div className="space-y-2">
                          <Label
                            htmlFor="deal-id"
                            className="text-xs font-medium uppercase tracking-wider text-muted-foreground ml-1"
                          >
                            Deal ID
                          </Label>
                          <div className="relative group/input pt-2">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                            <Input
                              id="deal-id"
                              placeholder="e.g. DEMO-123..."
                              value={dealId}
                              onChange={(e) => setDealId(e.target.value)}
                              className="pl-12 h-14 text-lg bg-background border-border/50 rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-primary/20 font-mono"
                              autoFocus
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
                              <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            <>
                              Verify Deal
                              <ArrowRight className="ml-2 h-5 w-5" />
                            </>
                          )}
                        </Button>
                      </form>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : searchedDeal ? (
                // Result State: Deal Details (Compact & Unified)
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="space-y-6"
                >
                  {/* Verification Status Card */}
                  <Card className="overflow-hidden border shadow-card bg-card/80 backdrop-blur-sm w-full">
                    {/* Header - Matches Demo Style */}
                    <div className="p-4 border-b flex items-center justify-between bg-background/50 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold shadow-lg shadow-primary/20 text-sm shrink-0">
                          {searchedDeal.creatorName.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {searchedDeal.creatorName}
                          </p>
                          <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                            <Calendar className="h-3 w-3 shrink-0" />
                            Created {formatDate(searchedDeal.createdAt)}
                          </p>
                        </div>
                      </div>
                      <div className="shrink-0">
                        <PulsingShield status={hashVerificationStatus} />
                      </div>
                    </div>

                    {/* Title Bar - Matches Demo Style */}
                    <div className="bg-muted dark:bg-muted/30 border-b py-4 px-5">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                            <Fingerprint className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <CardTitle className="text-lg leading-tight truncate">
                              {searchedDeal.title}
                            </CardTitle>
                            <div className="flex items-center gap-2 mt-0.5">
                              <Badge
                                variant="outline"
                                className="font-mono text-[10px] h-5 px-1.5 bg-background border-border/50"
                              >
                                {searchedDeal.publicId}
                              </Badge>
                              {searchedDeal.status === "confirmed" ? (
                                <span className="text-[10px] text-emerald-600 font-medium">
                                  Sealed
                                </span>
                              ) : (
                                <span className="text-[10px] text-muted-foreground font-medium capitalize">
                                  {searchedDeal.status}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="p-0">
                      {/* Compact Metadata Grid */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x border-b bg-card/50">
                        <div className="p-3 sm:p-4 space-y-0.5 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Recipient
                          </div>
                          <div className="flex items-center gap-2 font-medium text-sm truncate">
                            <User className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                            <span className="truncate">
                              {searchedDeal.recipientName || "Pending"}
                            </span>
                          </div>
                        </div>
                        <div className="p-3 sm:p-4 space-y-0.5 min-w-0">
                          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                            Sealed Date
                          </div>
                          <div className="flex items-center gap-2 font-medium text-sm truncate">
                            <Clock className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                            <span className="truncate">
                              {searchedDeal.confirmedAt
                                ? formatDateTime(searchedDeal.confirmedAt)
                                : "Not sealed"}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="p-5 space-y-5">
                        {/* Hash Comparison */}
                        <div className="space-y-3">
                          <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                            <Hash className="h-3.5 w-3.5" />
                            Cryptographic Proof
                          </h3>

                          <div className="space-y-2">
                            {searchedDeal.dealSeal ? (
                              <CopyableHash
                                label="Recorded Seal Hash (Immutable)"
                                hash={searchedDeal.dealSeal}
                              />
                            ) : (
                              <div className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded border border-dashed">
                                No seal recorded yet.
                              </div>
                            )}

                            {calculatedHash && (
                              <CopyableHash
                                label="Calculated Hash"
                                hash={calculatedHash}
                                scramble={true}
                              />
                            )}

                            {hashVerificationStatus === "valid" && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 px-3 py-2 rounded-lg border border-emerald-500/20 mt-2"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                <span className="font-medium">
                                  Hashes match perfectly. Integrity verified.
                                </span>
                              </motion.div>
                            )}

                            {hashVerificationStatus === "invalid" && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-3 py-2 rounded-lg border border-destructive/20 mt-2"
                              >
                                <AlertCircle className="h-3.5 w-3.5" />
                                <span className="font-medium">
                                  Hash mismatch! Document may have been altered.
                                </span>
                              </motion.div>
                            )}
                          </div>
                        </div>

                        {/* Deal Terms (Collapsible) */}
                        <div className="space-y-2 pt-2 border-t">
                          <button
                            onClick={() => setShowTerms(!showTerms)}
                            className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-primary transition-colors py-1"
                          >
                            <div className="flex items-center gap-2">
                              <FileText className="h-3.5 w-3.5" />
                              Agreement Details
                            </div>
                            {showTerms ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </button>

                          <AnimatePresence>
                            {showTerms && (
                              <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="bg-muted/30 rounded-lg p-3 space-y-2 border text-sm mt-1">
                                  {searchedDeal.terms.map((term, i) => (
                                    <div key={i} className="grid grid-cols-3 gap-2">
                                      <span className="text-muted-foreground col-span-1 text-xs font-medium">
                                        {term.label}
                                      </span>
                                      <span className="font-medium col-span-2 text-xs">
                                        {term.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>

                        {/* Audit Trail */}
                        <div className="space-y-2 pt-2 border-t">
                          <h3 className="text-xs font-semibold flex items-center gap-2 uppercase tracking-wider text-muted-foreground">
                            <Sparkles className="h-3.5 w-3.5" />
                            Audit Trail
                          </h3>
                          <div className="max-h-[400px] overflow-y-auto pr-2 custom-scrollbar mt-1">
                            <AuditTimeline logs={auditLogs} privacyMode />
                          </div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    {searchedDeal.status === "confirmed" && (
                      <Button
                        variant="outline"
                        onClick={handleDownloadPDF}
                        disabled={isDownloading}
                        className="gap-2 h-10 rounded-xl"
                      >
                        {isDownloading ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Download className="h-4 w-4" />
                        )}
                        Download Receipt
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      onClick={handleReset}
                      className="text-muted-foreground hover:text-foreground h-10 rounded-xl"
                    >
                      Verify Another Deal
                    </Button>
                  </div>
                </motion.div>
              ) : (
                // Result State: Not Found
                <motion.div
                  key="not-found"
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="flex flex-col items-center justify-center py-16 text-center space-y-4 border rounded-3xl bg-card border-destructive/20 shadow-sm"
                >
                  <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
                    <AlertCircle className="h-8 w-8" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Deal Not Found</h3>
                    <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                      We couldn&apos;t find a deal with ID{" "}
                      <span className="font-mono text-foreground bg-secondary px-1 rounded">
                        {dealId}
                      </span>
                      . Please check the ID and try again.
                    </p>
                  </div>
                  <Button variant="outline" onClick={handleReset} className="mt-4 rounded-xl">
                    Try Again
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Mobile Only CTA (Bottom) */}
          <div className="lg:hidden pb-12">
            <div className="bg-secondary/30 rounded-3xl p-6 border border-border relative overflow-hidden">
              <div className="relative z-10 text-center">
                <h3 className="text-xl font-bold mb-2">Ready to create real deals?</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Start creating enforceable agreements in seconds.
                </p>
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="w-full text-base rounded-xl shadow-lg shadow-primary/10 h-12"
                  >
                    Create Your First Proof
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
          </div>
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
