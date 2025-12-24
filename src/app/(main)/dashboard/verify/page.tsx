"use client";

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AuditTimeline } from "@/components/audit-timeline";
import { useAppStore } from "@/store";
import { calculateDealSeal, formatDateTime, timeAgo } from "@/lib/crypto";
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
  Fingerprint,
  Copy,
  Check,
  FileText,
  ChevronDown,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Hash,
  XCircle,
  ScanLine,
  Link2,
  RotateCcw,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { dashboardStyles } from "@/lib/dashboard-ui";
import { generateDealPDF, downloadPDF, generatePDFFilename } from "@/lib/pdf";
import { KeyboardHint, useSearchShortcut } from "@/components/dashboard/shared-components";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// --- TYPES ---

type VerificationStatus = "idle" | "verifying" | "valid" | "invalid" | "error";

// --- ENGAGING MICRO COMPONENTS ---

// Scramble text effect for hashes - hacker style
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

// Animated pulsing shield for verification status
const PulsingShield = ({ status }: { status: VerificationStatus }) => {
  const colors = {
    idle: "border-border/50 text-muted-foreground",
    verifying: "border-primary/50 text-primary",
    valid: "border-emerald-500/50 text-emerald-600",
    invalid: "border-destructive/50 text-destructive",
    error: "border-amber-500/50 text-amber-600",
  };

  const bgColors = {
    idle: "bg-muted/20",
    verifying: "bg-primary/5",
    valid: "bg-emerald-500/10",
    invalid: "bg-destructive/10",
    error: "bg-amber-500/10",
  };

  return (
    <div className="relative flex items-center justify-center w-16 h-16">
      {status === "verifying" && (
        <>
          <motion.div
            className="absolute inset-0 rounded-2xl border-2 border-primary/20"
            animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
          />
          <motion.div
            className="absolute inset-2 rounded-xl border border-primary/40"
            animate={{ scale: [1, 1.15, 1], opacity: [0.8, 0.2, 0.8] }}
            transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
          />
        </>
      )}
      {status === "valid" && (
        <motion.div
          className="absolute inset-0 rounded-2xl bg-emerald-500/20"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: [1, 1.1, 1], opacity: [0.5, 0.3, 0.5] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div
        className={cn(
          "h-14 w-14 rounded-2xl border-2 flex items-center justify-center transition-all duration-500 shadow-lg",
          colors[status],
          bgColors[status]
        )}
      >
        {status === "verifying" ? (
          <RefreshCw className="h-6 w-6 animate-spin" />
        ) : status === "valid" ? (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 15 }}
          >
            <ShieldCheck className="h-6 w-6" />
          </motion.div>
        ) : status === "invalid" ? (
          <XCircle className="h-6 w-6" />
        ) : status === "error" ? (
          <AlertCircle className="h-6 w-6" />
        ) : (
          <Shield className="h-6 w-6" />
        )}
      </div>
    </div>
  );
};

// Animated copyable hash with scramble effect
const AnimatedCopyableHash = ({
  hash,
  label,
  scramble = false,
}: {
  hash: string;
  label: string;
  scramble?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      navigator.vibrate(50);
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-1.5 w-full">
      <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium flex items-center justify-between">
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
        className="group cursor-pointer font-mono text-[10px] sm:text-xs text-muted-foreground bg-secondary/50 px-3 py-2.5 rounded-xl border border-border/50 hover:bg-secondary/70 hover:border-primary/30 transition-all duration-200 flex items-start justify-between gap-3 w-full active:scale-[0.99]"
      >
        <span className="break-all whitespace-normal leading-relaxed text-left">
          {scramble ? <ScrambleText text={hash} /> : hash}
        </span>
        <div className="shrink-0 mt-0.5 relative w-4 h-4">
          <AnimatePresence mode="wait">
            {copied ? (
              <motion.div
                key="check"
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.5, opacity: 0 }}
              >
                <Check className="h-4 w-4 text-emerald-500" />
              </motion.div>
            ) : (
              <motion.div
                key="copy"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Copy className="h-4 w-4" />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// --- VERIFICATION RESULT CARD ---

const VerificationResultCard = ({
  deal,
  auditLogs,
  verificationStatus,
  calculatedHash,
  onDownloadPDF,
  isDownloading,
}: {
  deal: Deal;
  auditLogs: AuditLogEntry[];
  verificationStatus: VerificationStatus;
  calculatedHash: string | null;
  onDownloadPDF: () => void;
  isDownloading: boolean;
}) => {
  const [showDetails, setShowDetails] = useState(true);
  const [showAudit, setShowAudit] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card
        className={cn(
          "overflow-hidden border shadow-lg transition-all duration-500",
          verificationStatus === "valid" && "border-emerald-500/30 shadow-emerald-500/10",
          verificationStatus === "invalid" && "border-destructive/30 shadow-destructive/10"
        )}
      >
        {/* System-style Header */}
        <div className="p-4 border-b flex items-center justify-between bg-muted/30">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold shadow-lg shadow-primary/20 text-sm shrink-0">
              {deal.creatorName.slice(0, 2).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm truncate">{deal.creatorName}</p>
              <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
                <Clock className="h-3 w-3 shrink-0" />
                {timeAgo(deal.createdAt)}
              </p>
            </div>
          </div>
          <PulsingShield status={verificationStatus} />
        </div>

        {/* Title Bar */}
        <div className="bg-background border-b py-4 px-5">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className={cn(
                  "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                  verificationStatus === "valid"
                    ? "bg-emerald-500/10 text-emerald-600"
                    : verificationStatus === "invalid"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-primary/10 text-primary"
                )}
              >
                <Fingerprint className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <CardTitle className="text-lg leading-tight truncate">{deal.title}</CardTitle>
                <div className="flex items-center gap-2 mt-0.5">
                  <Badge
                    variant="outline"
                    className="font-mono text-[10px] h-5 px-1.5 bg-secondary/50 border-border/50"
                  >
                    {deal.publicId}
                  </Badge>
                  {deal.status === "confirmed" ? (
                    <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Sealed
                    </span>
                  ) : (
                    <span className="text-[10px] text-muted-foreground font-medium capitalize">
                      {deal.status}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Verification Status Banner */}
        <AnimatePresence>
          {verificationStatus !== "idle" && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className={cn(
                "px-5 py-3 text-sm font-medium flex items-center gap-2 border-b overflow-hidden",
                verificationStatus === "verifying" && "bg-primary/5 text-primary",
                verificationStatus === "valid" &&
                  "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
                verificationStatus === "invalid" && "bg-destructive/10 text-destructive",
                verificationStatus === "error" && "bg-amber-500/10 text-amber-700"
              )}
            >
              {verificationStatus === "verifying" && (
                <>
                  <ScanLine className="h-4 w-4 animate-pulse" />
                  Calculating cryptographic hash and comparing signatures...
                </>
              )}
              {verificationStatus === "valid" && (
                <>
                  <CheckCircle2 className="h-4 w-4" />✓ Document integrity verified. The
                  cryptographic seal matches perfectly.
                </>
              )}
              {verificationStatus === "invalid" && (
                <>
                  <AlertCircle className="h-4 w-4" />✗ Verification failed. Hash mismatch detected.
                </>
              )}
              {verificationStatus === "error" && (
                <>
                  <AlertCircle className="h-4 w-4" />
                  An error occurred during verification.
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Compact Metadata Grid */}
        <div className="grid grid-cols-2 divide-x border-b">
          <div className="p-4 space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Recipient
            </div>
            <div className="flex items-center gap-2 font-medium text-sm">
              <User className="h-3.5 w-3.5 text-primary/60" />
              <span className="truncate">{deal.recipientName || "Pending"}</span>
            </div>
          </div>
          <div className="p-4 space-y-0.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              Sealed Date
            </div>
            <div className="flex items-center gap-2 font-medium text-sm">
              <Clock className="h-3.5 w-3.5 text-primary/60" />
              <span className="truncate">
                {deal.confirmedAt ? formatDateTime(deal.confirmedAt) : "Not sealed"}
              </span>
            </div>
          </div>
        </div>

        {/* Cryptographic Proof Section */}
        <div className="p-5 space-y-4 border-b">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-between w-full text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground transition-colors"
          >
            <div className="flex items-center gap-2">
              <Hash className="h-3.5 w-3.5" />
              Cryptographic Proof
            </div>
            <ChevronDown
              className={cn("h-4 w-4 transition-transform", showDetails && "rotate-180")}
            />
          </button>

          <AnimatePresence>
            {showDetails && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden space-y-3"
              >
                {deal.dealSeal ? (
                  <AnimatedCopyableHash
                    label="Recorded Seal Hash (Immutable)"
                    hash={deal.dealSeal}
                  />
                ) : (
                  <div className="text-xs text-muted-foreground italic bg-muted/30 p-3 rounded-xl border border-dashed">
                    No seal recorded yet. This deal hasn&apos;t been confirmed.
                  </div>
                )}

                {calculatedHash && (
                  <AnimatedCopyableHash
                    label="Calculated Hash (Live)"
                    hash={calculatedHash}
                    scramble={true}
                  />
                )}

                {verificationStatus === "valid" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-xs text-emerald-600 bg-emerald-500/10 px-4 py-3 rounded-xl border border-emerald-500/20"
                  >
                    <CheckCircle2 className="h-4 w-4" />
                    <span className="font-medium">
                      Hashes match perfectly. Document integrity verified.
                    </span>
                  </motion.div>
                )}

                {verificationStatus === "invalid" && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="flex items-center gap-2 text-xs text-destructive bg-destructive/10 px-4 py-3 rounded-xl border border-destructive/20"
                  >
                    <AlertCircle className="h-4 w-4" />
                    <span className="font-medium">
                      Hash mismatch! Document may have been altered.
                    </span>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Terms Preview */}
        <div className="p-5 border-b bg-muted/5">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium mb-2 flex items-center gap-2">
            <FileText className="h-3.5 w-3.5" />
            Agreement Terms
          </div>
          <div className="flex flex-wrap gap-1.5">
            {deal.terms.map((term) => (
              <Badge
                key={term.id}
                variant="secondary"
                className="font-normal text-[10px] px-2 py-1 bg-secondary/50 border border-border/50 text-muted-foreground"
              >
                {term.label}: <span className="text-foreground ml-1">{term.value}</span>
              </Badge>
            ))}
          </div>
        </div>

        {/* Audit Trail (Collapsible) */}
        {auditLogs.length > 0 && (
          <div className="border-b">
            <button
              onClick={() => setShowAudit(!showAudit)}
              className="w-full flex items-center justify-between p-4 text-xs font-semibold uppercase tracking-wider text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Sparkles className="h-3.5 w-3.5" />
                Audit Trail ({auditLogs.length} events)
              </span>
              <ChevronDown
                className={cn("h-4 w-4 transition-transform", showAudit && "rotate-180")}
              />
            </button>
            <AnimatePresence>
              {showAudit && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 max-h-48 overflow-y-auto custom-scrollbar">
                    <AuditTimeline logs={auditLogs} compact />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Actions Footer */}
        <div className="p-4 flex items-center justify-between bg-muted/20">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-3 text-xs gap-1.5"
              onClick={() => window.open(`/d/${deal.publicId}`, "_blank")}
            >
              <ExternalLink className="h-3.5 w-3.5" />
              View Deal
            </Button>
          </div>
          {deal.status === "confirmed" && (
            <Button
              size="sm"
              className="h-8 px-4 text-xs gap-1.5"
              onClick={onDownloadPDF}
              disabled={isDownloading}
            >
              {isDownloading ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Download className="h-3.5 w-3.5" />
              )}
              Download PDF
            </Button>
          )}
        </div>
      </Card>
    </motion.div>
  );
};

// --- MAIN CONTENT ---

function DashboardVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get("id") || "";

  const { getDealByPublicId, getAuditLogsForDeal, deals: storeDeals, user } = useAppStore();
  const [dealId, setDealId] = useState(initialDealId);
  const [searchedDeal, setSearchedDeal] = useState<Deal | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);

  // Keyboard shortcuts
  useSearchShortcut(searchInputRef);

  const handleClearSearch = useCallback(() => {
    setDealId("");
    setHasSearched(false);
    setSearchedDeal(null);
    setVerificationStatus("idle");
    setCalculatedHash(null);
    router.push("/dashboard/verify");
    searchInputRef.current?.focus();
  }, [router]);

  // Escape key to clear
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && hasSearched) {
        handleClearSearch();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasSearched, handleClearSearch]);

  // Recent confirmed deals for quick access
  const recentConfirmedDeals = useMemo(() => {
    return storeDeals
      .filter(
        (d) =>
          d.status === "confirmed" && (d.creatorId === user?.id || d.recipientEmail === user?.email)
      )
      .sort(
        (a, b) =>
          new Date(b.confirmedAt || b.createdAt).getTime() -
          new Date(a.confirmedAt || a.createdAt).getTime()
      )
      .slice(0, 3);
  }, [storeDeals, user]);

  const performSearch = useCallback(
    async (searchId: string, updateUrl: boolean = false) => {
      if (!searchId.trim()) return;

      setIsSearching(true);
      setVerificationStatus("verifying");
      setCalculatedHash(null);
      setSearchedDeal(null); // Clear for smooth transition

      if (updateUrl) {
        router.push(`/dashboard/verify?id=${searchId}`, { scroll: false });
      }

      // Deliberate delay for the "verifying" experience
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 1500));

      let dealToVerify: Deal | null = null;
      let logsToVerify: AuditLogEntry[] = [];

      try {
        // First try local store
        const localDeal = getDealByPublicId(searchId);
        if (localDeal) {
          dealToVerify = localDeal;
          logsToVerify = getAuditLogsForDeal(localDeal.id);
        } else if (isSupabaseConfigured()) {
          // Try Supabase
          const { deal, error } = await getDealByPublicIdAction(searchId);
          if (deal && !error) {
            dealToVerify = deal;
            const { logs } = await getAuditLogsAction(deal.id);
            logsToVerify = logs.map((log) => ({
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

        if (dealToVerify) {
          let hash: string | null = null;
          if (dealToVerify.dealSeal) {
            hash = await calculateDealSeal({
              dealId: dealToVerify.id,
              terms: JSON.stringify(dealToVerify.terms),
              signatureUrl: dealToVerify.signatureUrl || "",
              timestamp: dealToVerify.confirmedAt || dealToVerify.createdAt,
            });
            setCalculatedHash(hash);
          }

          // Ensure minimum dramatic delay
          await delayPromise;

          setSearchedDeal(dealToVerify);
          setAuditLogs(logsToVerify);

          if (hash) {
            setVerificationStatus(hash === dealToVerify.dealSeal ? "valid" : "invalid");
          } else {
            setVerificationStatus("idle");
          }
        } else {
          await delayPromise;
          setSearchedDeal(null);
          setAuditLogs([]);
          setVerificationStatus("idle");
        }
      } catch (error) {
        console.error("Verification error:", error);
        await delayPromise;
        setVerificationStatus("error");
      } finally {
        setHasSearched(true);
        setIsSearching(false);
      }
    },
    [getDealByPublicId, getAuditLogsForDeal, router]
  );

  // Initial search if ID is present
  useEffect(() => {
    if (initialDealId && !hasSearched) {
      performSearch(initialDealId);
    } else if (!initialDealId) {
      setHasSearched(false);
      setSearchedDeal(null);
      setDealId("");
      setVerificationStatus("idle");
    }
  }, [initialDealId, hasSearched, performSearch]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    performSearch(dealId, true);
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
      downloadPDF(pdfBlob, generatePDFFilename(searchedDeal));
    } catch (error) {
      console.error("Failed to generate PDF", error);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleCopyVerificationLink = () => {
    if (!searchedDeal) return;
    const url = `${window.location.origin}/dashboard/verify?id=${searchedDeal.publicId}`;
    navigator.clipboard.writeText(url);
    toast.success("Verification link copied!", {
      description: "Share this link to let others verify this agreement.",
    });
  };

  const handleQuickVerify = (publicId: string) => {
    setDealId(publicId);
    performSearch(publicId, true);
  };

  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>Verify</h1>
          <p className={dashboardStyles.pageDescription}>
            Authenticate and verify agreement signatures
          </p>
        </div>
      </div>

      {/* Search Section */}
      <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
        <div className="p-4">
          <form onSubmit={handleSearch}>
            <div className={dashboardStyles.searchInputContainer}>
              <Search className={dashboardStyles.searchIcon} />
              <Input
                ref={searchInputRef}
                value={dealId}
                onChange={(e) => setDealId(e.target.value)}
                placeholder="Enter deal ID to verify (e.g., DEMO-123456)"
                className={cn(dashboardStyles.searchInput, "pr-32")}
              />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                {dealId && !isSearching && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <XCircle className="h-4 w-4" />
                  </button>
                )}
                <Button
                  type="submit"
                  size="sm"
                  disabled={!dealId.trim() || isSearching}
                  className="h-7 px-3 text-xs gap-1.5"
                >
                  {isSearching ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5" />
                  )}
                  {isSearching ? "Verifying..." : "Verify"}
                </Button>
              </div>
            </div>
          </form>
        </div>
        <div className="px-4 py-2.5 border-t border-border/40 bg-muted/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Verification service active
          </div>
          <KeyboardHint className="static translate-y-0" />
        </div>
      </Card>

      {/* Results */}
      <AnimatePresence mode="wait">
        {hasSearched && searchedDeal && (
          <VerificationResultCard
            key="result"
            deal={searchedDeal}
            auditLogs={auditLogs}
            verificationStatus={verificationStatus}
            calculatedHash={calculatedHash}
            onDownloadPDF={handleDownloadPDF}
            isDownloading={isDownloading}
          />
        )}

        {/* Quick Actions after verification */}
        {hasSearched && searchedDeal && (
          <motion.div
            key="actions"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center justify-center gap-3"
          >
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs gap-1.5 rounded-xl"
              onClick={handleClearSearch}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Verify Another
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-9 px-4 text-xs gap-1.5 rounded-xl"
              onClick={handleCopyVerificationLink}
            >
              <Link2 className="h-3.5 w-3.5" />
              Copy Link
            </Button>
          </motion.div>
        )}

        {hasSearched && !searchedDeal && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center py-16 text-center space-y-4 border rounded-2xl bg-card border-destructive/20 shadow-sm"
          >
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center text-destructive">
              <AlertCircle className="h-8 w-8" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-foreground">Deal Not Found</h3>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mt-1">
                We couldn&apos;t find a deal with ID{" "}
                <span className="font-mono text-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {dealId}
                </span>
                . Please check the ID and try again.
              </p>
            </div>
            <Button
              variant="outline"
              onClick={handleClearSearch}
              className="mt-4 rounded-xl gap-1.5"
            >
              <RotateCcw className="h-4 w-4" />
              Try Again
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Section */}
      {!hasSearched && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid sm:grid-cols-3 gap-4 mb-8"
        >
          <Card className="p-4 border border-border/50 rounded-2xl hover:border-primary/20 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center border shadow-sm bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 transition-colors">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">Cryptographic Verification</h3>
                <p className="text-xs text-muted-foreground">
                  Each sealed agreement has a unique SHA-256 hash that proves its authenticity.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-border/50 rounded-2xl hover:border-primary/20 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center border shadow-sm bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 transition-colors">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">Tamper Detection</h3>
                <p className="text-xs text-muted-foreground">
                  Any modification to the document will result in a different hash, revealing
                  tampering.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-border/50 rounded-2xl hover:border-primary/20 transition-colors group">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-lg flex items-center justify-center border shadow-sm bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 transition-colors">
                <Clock className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-sm mb-1">Audit Trail</h3>
                <p className="text-xs text-muted-foreground">
                  View the complete history of events from creation to signature.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      )}

      {/* Quick Verify Section */}
      {!hasSearched && recentConfirmedDeals.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-foreground flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              Quick Verify
            </h2>
            <span className="text-[10px] text-muted-foreground">
              Your recent confirmed agreements
            </span>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {recentConfirmedDeals.map((deal: Deal, index: number) => (
              <motion.div
                key={deal.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + index * 0.05 }}
              >
                <Card
                  className="p-4 border border-border/50 rounded-xl hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 transition-all cursor-pointer group"
                  onClick={() => handleQuickVerify(deal.publicId)}
                >
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm bg-emerald-500/10 border-emerald-500/20 text-emerald-600 shrink-0 group-hover:scale-105 transition-transform">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-sm truncate group-hover:text-primary transition-colors">
                        {deal.title}
                      </h3>
                      <p className="text-[10px] text-muted-foreground truncate">
                        {deal.recipientName || deal.creatorName} •{" "}
                        {timeAgo(deal.confirmedAt || deal.createdAt)}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
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
