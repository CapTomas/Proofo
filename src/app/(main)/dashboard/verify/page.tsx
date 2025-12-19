"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { AuditTimeline } from "@/components/audit-timeline";
import { useAppStore } from "@/store";
import { calculateDealSeal, formatDateTime } from "@/lib/crypto";
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
  ChevronRight,
  Download,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Hash,
  XCircle,
  Send,
  Inbox,
} from "lucide-react";
import { dashboardStyles, containerVariants, itemVariants } from "@/lib/dashboard-ui";
import { generateDealPDF, downloadPDF, generatePDFFilename } from "@/lib/pdf";
import { CopyableId, statusConfig, KeyboardHint, useSearchShortcut } from "@/components/dashboard/shared-components";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { timeAgo } from "@/lib/crypto";

// --- TYPES ---

type VerificationStatus = "idle" | "verifying" | "valid" | "invalid" | "error";

// --- MICRO COMPONENTS ---

const CopyableHash = ({ hash, label }: { hash: string; label: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50 hover:bg-secondary/50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider mb-1">
          {label}
        </div>
        <code className="text-xs font-mono text-foreground/80 break-all line-clamp-2">{hash}</code>
      </div>
      <button
        onClick={handleCopy}
        className="shrink-0 p-2 rounded-lg hover:bg-background transition-colors"
      >
        {copied ? (
          <Check className="h-4 w-4 text-emerald-500" />
        ) : (
          <Copy className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
    </div>
  );
};

const VerificationBadge = ({ status }: { status: VerificationStatus }) => {
  const config = {
    idle: { label: "Ready", color: "text-muted-foreground", bg: "bg-muted/50", icon: Shield },
    verifying: { label: "Verifying", color: "text-blue-600", bg: "bg-blue-500/10", icon: RefreshCw },
    valid: { label: "Verified", color: "text-emerald-600", bg: "bg-emerald-500/10", icon: CheckCircle2 },
    invalid: { label: "Invalid", color: "text-destructive", bg: "bg-destructive/10", icon: AlertCircle },
    error: { label: "Error", color: "text-amber-600", bg: "bg-amber-500/10", icon: AlertCircle },
  };

  const { label, color, bg, icon: Icon } = config[status];

  return (
    <Badge
      variant="outline"
      className={cn(
        "gap-1.5 px-2.5 py-1 h-auto text-xs font-medium border transition-all",
        bg,
        color,
        status === "valid" && "border-emerald-500/30",
        status === "invalid" && "border-destructive/30"
      )}
    >
      <Icon className={cn("h-3.5 w-3.5", status === "verifying" && "animate-spin")} />
      {label}
    </Badge>
  );
};

// --- RESULT CARD ---

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
  const [showDetails, setShowDetails] = useState(false);
  const [showAudit, setShowAudit] = useState(false);
  const config = statusConfig[deal.status];
  const StatusIcon = config.icon;
  const isCreator = true; // In verify context, we show "from" perspective

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 25 }}
    >
      <Card className={cn(dashboardStyles.cardBase, "cursor-default")}>
        <CardContent className="p-0">
          {/* Header Section */}
          <div className="p-5 border-b border-border/40">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div
                  className={cn(
                    "h-10 w-10 rounded-xl flex items-center justify-center border shadow-sm shrink-0",
                    verificationStatus === "valid"
                      ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600"
                      : verificationStatus === "invalid"
                      ? "bg-destructive/10 border-destructive/20 text-destructive"
                      : `${config.bg} ${config.border} ${config.color}`
                  )}
                >
                  {verificationStatus === "verifying" ? (
                    <RefreshCw className="h-5 w-5 animate-spin" />
                  ) : verificationStatus === "valid" ? (
                    <ShieldCheck className="h-5 w-5" />
                  ) : verificationStatus === "invalid" ? (
                    <AlertCircle className="h-5 w-5" />
                  ) : (
                    <StatusIcon className="h-5 w-5" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <h3 className="font-semibold text-base text-foreground truncate">
                      {deal.title}
                    </h3>
                    <Badge
                      variant={config.badgeVariant}
                      className="h-5 px-1.5 text-[10px] font-medium border"
                    >
                      {config.label}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <User className="h-3 w-3" />
                      {deal.creatorName}
                    </span>
                    <span className="text-border">→</span>
                    <span>{deal.recipientName || "Pending"}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <VerificationBadge status={verificationStatus} />
                <CopyableId id={deal.publicId} className="bg-background hidden sm:flex" />
              </div>
            </div>

            {/* Verification Status Message */}
            {verificationStatus !== "idle" && (
              <div
                className={cn(
                  "mt-4 p-3 rounded-xl text-sm",
                  verificationStatus === "valid" && "bg-emerald-500/5 text-emerald-700 dark:text-emerald-400",
                  verificationStatus === "invalid" && "bg-destructive/5 text-destructive",
                  verificationStatus === "verifying" && "bg-blue-500/5 text-blue-600",
                  verificationStatus === "error" && "bg-amber-500/5 text-amber-600"
                )}
              >
                {verificationStatus === "verifying" && "Calculating cryptographic hash and comparing signatures..."}
                {verificationStatus === "valid" && "✓ Document integrity verified. The cryptographic seal matches."}
                {verificationStatus === "invalid" && "✗ Verification failed. The calculated hash does not match the recorded seal."}
                {verificationStatus === "error" && "An error occurred during verification."}
              </div>
            )}
          </div>

          {/* Terms Preview */}
          <div className="p-5 border-b border-border/40 bg-muted/5">
            <div className="flex flex-wrap gap-1.5">
              {deal.terms.slice(0, 4).map((term) => (
                <Badge
                  key={term.id}
                  variant="neutral"
                  className="font-normal text-[10px] px-2 py-0.5 bg-secondary/50 border-transparent text-muted-foreground"
                >
                  {term.label}: {term.value}
                </Badge>
              ))}
              {deal.terms.length > 4 && (
                <Badge
                  variant="outline"
                  className="font-normal text-[10px] px-2 py-0.5 text-muted-foreground"
                >
                  +{deal.terms.length - 4} more
                </Badge>
              )}
            </div>
          </div>

          {/* Cryptographic Details (Collapsible) */}
          <div className="border-b border-border/40">
            <button
              onClick={() => setShowDetails(!showDetails)}
              className="w-full flex items-center justify-between p-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
            >
              <span className="flex items-center gap-2">
                <Fingerprint className="h-4 w-4" />
                Cryptographic Details
              </span>
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
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 space-y-3">
                    <CopyableHash
                      label="Recorded Seal"
                      hash={deal.dealSeal || "Not yet sealed"}
                    />
                    {calculatedHash && (
                      <CopyableHash label="Calculated Hash" hash={calculatedHash} />
                    )}
                    {deal.confirmedAt && (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
                        <Clock className="h-3.5 w-3.5" />
                        Sealed on {formatDateTime(deal.confirmedAt)}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Audit Trail (Collapsible) */}
          {auditLogs.length > 0 && (
            <div className="border-b border-border/40">
              <button
                onClick={() => setShowAudit(!showAudit)}
                className="w-full flex items-center justify-between p-4 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-colors"
              >
                <span className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
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
                    <div className="px-4 pb-4 max-h-64 overflow-y-auto custom-scrollbar">
                      <AuditTimeline logs={auditLogs} />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Actions Footer */}
          <div className={dashboardStyles.cardFooter}>
            <span className="text-[10px] text-muted-foreground">
              Created {timeAgo(deal.createdAt)}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-3 text-xs gap-1.5"
                onClick={() => window.open(`/d/${deal.publicId}`, "_blank")}
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View
              </Button>
              {deal.status === "confirmed" && (
                <Button
                  size="sm"
                  className="h-8 px-3 text-xs gap-1.5"
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
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// --- MAIN CONTENT ---

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
  const [isDownloading, setIsDownloading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);

  // Keyboard shortcut
  useSearchShortcut(searchInputRef);

  const performSearch = useCallback(
    async (searchId: string, updateUrl: boolean = false) => {
      if (!searchId.trim()) return;

      setIsSearching(true);
      setVerificationStatus("idle");
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

  // Verify hash when deal is found
  useEffect(() => {
    if (searchedDeal && searchedDeal.dealSeal) {
      const verifyHash = async () => {
        setVerificationStatus("verifying");

        // Brief delay for UX
        await new Promise((resolve) => setTimeout(resolve, 600));

        try {
          const hash = await calculateDealSeal({
            dealId: searchedDeal.id,
            terms: JSON.stringify(searchedDeal.terms),
            signatureUrl: searchedDeal.signatureUrl || "",
            timestamp: searchedDeal.confirmedAt || searchedDeal.createdAt,
          });
          setCalculatedHash(hash);

          if (hash === searchedDeal.dealSeal) {
            setVerificationStatus("valid");
          } else {
            setVerificationStatus("invalid");
          }
        } catch (error) {
          console.error("Hash calculation error:", error);
          setVerificationStatus("error");
        }
      };

      verifyHash();
    } else if (searchedDeal) {
      // Deal exists but isn't sealed yet
      setVerificationStatus("idle");
    }
  }, [searchedDeal]);

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

  const handleClearSearch = () => {
    setDealId("");
    setHasSearched(false);
    setSearchedDeal(null);
    setVerificationStatus("idle");
    router.push("/dashboard/verify");
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

        {hasSearched && !searchedDeal && (
          <motion.div
            key="empty"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className={dashboardStyles.emptyState}
          >
            <div className={dashboardStyles.emptyStateIcon}>
              <Search className="h-8 w-8 text-muted-foreground/50" />
            </div>
            <h3 className={dashboardStyles.emptyStateTitle}>No record found</h3>
            <p className={dashboardStyles.emptyStateDescription}>
              We couldn&apos;t find a deal with ID{" "}
              <span className="font-mono text-foreground bg-secondary px-1.5 py-0.5 rounded">
                {dealId}
              </span>
              . Please check the ID and try again.
            </p>
            <Button variant="outline" onClick={handleClearSearch} className="gap-1.5">
              <RefreshCw className="h-4 w-4" />
              Clear Search
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Info Section when no search */}
      {!hasSearched && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="grid sm:grid-cols-3 gap-4"
        >
          <Card className="p-4 border border-border/50 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-600">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">Cryptographic Verification</h3>
                <p className="text-xs text-muted-foreground">
                  Each sealed agreement has a unique SHA-256 hash that proves its authenticity.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-border/50 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-600">
                <Fingerprint className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">Tamper Detection</h3>
                <p className="text-xs text-muted-foreground">
                  Any modification to the document will result in a different hash, revealing tampering.
                </p>
              </div>
            </div>
          </Card>
          <Card className="p-4 border border-border/50 rounded-2xl">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-600">
                <Clock className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-medium text-sm mb-1">Audit Trail</h3>
                <p className="text-xs text-muted-foreground">
                  View the complete history of events from creation to signature.
                </p>
              </div>
            </div>
          </Card>
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
