"use client";

import { useState, useEffect, useCallback, Suspense, useRef, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store";
import { calculateDealSeal, transformVerificationsForHash, timeAgo } from "@/lib/crypto";
import { getDealByPublicIdAction, getAuditLogsAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Deal, AuditLogEntry } from "@/types";
import {
  Search,
  XCircle,
  RefreshCw,
  RotateCcw,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Link2,
  AlertCircle,
  Fingerprint,
  Clock,
  CheckCircle2
} from "lucide-react";
import { dashboardStyles } from "@/lib/dashboard-ui";
import { generateDealPDF, downloadPDF, generatePDFFilename } from "@/lib/pdf";
import { KeyboardHint, useSearchShortcut } from "@/components/dashboard/shared-components";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { VerificationCard, VerificationStatus } from "@/components/verification-card";

// --- MAIN CONTENT ---

function DashboardVerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get("id") || "";

  const { getDealByPublicId, getAuditLogsForDeal: _getAuditLogsForDeal, deals: storeDeals, user } = useAppStore();
  const [dealId, setDealId] = useState(initialDealId);
  const [searchedDeal, setSearchedDeal] = useState<Deal | null>(null);
  const [searchedCreatorProfile, setSearchedCreatorProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [searchedRecipientProfile, setSearchedRecipientProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Verification state
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus>("idle");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Keyboard shortcuts
  useSearchShortcut(searchInputRef);

  const handleClearSearch = useCallback(() => {
    setDealId("");
    setHasSearched(false);
    setSearchedDeal(null);
    setSearchedCreatorProfile(null);
    setSearchedRecipientProfile(null);
    setVerificationStatus("idle");
    setCalculatedHash(null);
    setAuditLogs([]);
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
      setSearchedCreatorProfile(null);
      setSearchedRecipientProfile(null);

      if (updateUrl) {
        router.push(`/dashboard/verify?id=${searchId}`, { scroll: false });
      }

      // Deliberate delay for the "verifying" experience
      const delayPromise = new Promise((resolve) => setTimeout(resolve, 1500));

      let dealToVerify: Deal | null = null;

      try {
        // Always try Supabase first if configured
        if (isSupabaseConfigured()) {
          const { deal, creatorProfile, recipientProfile, error } = await getDealByPublicIdAction(searchId);
          if (deal && !error) {
            dealToVerify = deal;
            if (creatorProfile) setSearchedCreatorProfile(creatorProfile);
            if (recipientProfile) setSearchedRecipientProfile(recipientProfile);
          }
        }

        // If not in Supabase or not configured, try local store
        if (!dealToVerify) {
          const localDeal = getDealByPublicId(searchId);
          if (localDeal) {
            dealToVerify = localDeal;
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
              verifications: transformVerificationsForHash(dealToVerify.verifications),
            });
            setCalculatedHash(hash);
          }

          // Fetch audit logs
          if (isSupabaseConfigured()) {
            const { logs } = await getAuditLogsAction(dealToVerify.id);
            setAuditLogs(logs as AuditLogEntry[]);
          } else {
            setAuditLogs([]);
          }

          // Ensure minimum dramatic delay
          await delayPromise;

          setSearchedDeal(dealToVerify);

          if (hash) {
            setVerificationStatus(hash === dealToVerify.dealSeal ? "valid" : "invalid");
          } else {
            setVerificationStatus("idle");
          }
        } else {
          await delayPromise;
          setSearchedDeal(null);
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
    [getDealByPublicId, router]
  );

  // Initial search if ID is present
  useEffect(() => {
    // Only auto-trigger if we have an ID AND we haven't searched yet
    // AND the ID in state matches the ID in URL (to avoid race conditions during clear)
    if (initialDealId && !hasSearched && dealId === initialDealId) {
      performSearch(initialDealId);
    } else if (!initialDealId && hasSearched) {
      // If URL is cleared but we still show results, clear them
      setHasSearched(false);
      setSearchedDeal(null);
      setDealId("");
      setVerificationStatus("idle");
    }
  }, [initialDealId, hasSearched, dealId, performSearch]);

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
      {!hasSearched && (
        <div className={dashboardStyles.pageHeader}>
          <div className="min-w-0">
            <h1 className={dashboardStyles.pageTitle}>Verify</h1>
            <p className={dashboardStyles.pageDescription}>
              Authenticate and verify agreement signatures
            </p>
          </div>
        </div>
      )}

      {/* Search Section */}
      {!hasSearched && (
        <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden">
          <div className="p-4">
            <form onSubmit={handleSearch}>
              <div className={dashboardStyles.searchInputContainer}>
                <Search className={dashboardStyles.searchIcon} />
                <Input
                  ref={searchInputRef}
                  value={dealId}
                  onChange={(e) => setDealId(e.target.value)}
                  placeholder="Enter deal ID..."
                  className={cn(dashboardStyles.searchInput, "pr-32")}
                  autoFocus
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
              <div className={cn(
                "h-1.5 w-1.5 rounded-full transition-all duration-500",
                isSearching ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              )} />
              {isSearching ? "Cryptographic calculation in progress..." : "Verification service active & ready"}
            </div>
            <KeyboardHint shortcut="/" variant="absolute" className="static translate-y-0" />
          </div>
        </Card>
      )}

      {/* Results */}
      <AnimatePresence mode="wait">
        {hasSearched && searchedDeal ? (
          <motion.div
            key="result-success"
            layout
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="space-y-6"
          >
            <VerificationCard
              deal={searchedDeal}
              creatorProfile={searchedCreatorProfile}
              recipientProfile={searchedRecipientProfile}
              verificationStatus={verificationStatus}
              calculatedHash={calculatedHash}
              onDownloadPDF={handleDownloadPDF}
              isDownloading={isDownloading}
              auditLogs={auditLogs}
            />

            {/* Quick Actions after verification */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
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
          </motion.div>
        ) : hasSearched && !searchedDeal ? (
          <motion.div
            key="result-empty"
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
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
        ) : null}
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
