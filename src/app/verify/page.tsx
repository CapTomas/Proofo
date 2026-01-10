"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";

import { PublicHeader } from "@/components/public-header";
import { useAppStore } from "@/store";
import { calculateDealSeal, transformVerificationsForHash } from "@/lib/crypto";
import { getDealByPublicIdAction, getAuditLogsAction, logAuditEventAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { Deal, AuditLogEntry } from "@/types";
import { generateDealPDF, downloadPDF, generatePDFFilename } from "@/lib/pdf";
import { prepareAuditEvent } from "@/lib/audit-utils";
import {
  Shield,
  Search,
  AlertCircle,
  RefreshCw,
  ArrowLeft,
  ArrowRight,

  Clock,
  ShieldCheck,
  XCircle,
  RotateCcw,
  Fingerprint,
  Zap,
  PlayCircle,
} from "lucide-react";
import Link from "next/link";
import { VerificationCard, VerificationStatus } from "@/components/verification-card";

import { KeyboardHint } from "@/components/dashboard/shared-components";
import { cn } from "@/lib/utils";
import { DEMO_DEAL_ID, isDemoDeal } from "@/lib/demo-deal-data";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get("id") || "";

  const { getDealByPublicId, getAuditLogsForDeal: _getAuditLogsForDeal } = useAppStore();
  const [dealId, setDealId] = useState(initialDealId);
  const [searchedDeal, setSearchedDeal] = useState<Deal | null>(null);
  const [searchedCreatorProfile, setSearchedCreatorProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [searchedRecipientProfile, setSearchedRecipientProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  // Hash verification state
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus>("idle");
  const [calculatedHash, setCalculatedHash] = useState<string | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  const performSearch = useCallback(
    async (searchId: string, updateUrl: boolean = false) => {
      if (!searchId) return;

      setIsSearching(true);
      setVerificationStatus("idle");
      setCalculatedHash(null);
      setSearchedCreatorProfile(null);
      setSearchedRecipientProfile(null);

      if (updateUrl) {
        router.push(`/verify?id=${searchId}`, { scroll: false });
      }

      let dealData: Deal | null = null;
      let cProfile: { name: string; avatarUrl?: string } | undefined;
      let rProfile: { name: string; avatarUrl?: string } | undefined;

      // Try Supabase first if configured (demo deal is now in database)
      if (isSupabaseConfigured()) {
        const { deal, creatorProfile, recipientProfile, error } = await getDealByPublicIdAction(searchId);
        if (deal && !error) {
          dealData = deal;
          cProfile = creatorProfile;
          rProfile = recipientProfile;
        }
      }

      // If not in Supabase or not configured, try local store
      if (!dealData) {
        const localDeal = getDealByPublicId(searchId);
        if (localDeal) {
          dealData = localDeal;
        }
      }

      setSearchedDeal(dealData);
      setSearchedCreatorProfile(cProfile || null);
      setSearchedRecipientProfile(rProfile || null);

      // Fetch audit logs for the deal if found
      if (dealData && isSupabaseConfigured()) {
        const { logs } = await getAuditLogsAction(dealData.id);
        setAuditLogs(logs as AuditLogEntry[]);
      } else {
        setAuditLogs([]);
      }

      setHasSearched(true);
      setIsSearching(false);
    },
    [getDealByPublicId, router]
  );

  // Handle URL changes and initial load
  useEffect(() => {
    if (!initialDealId) {
      setHasSearched(false);
      setSearchedDeal(null);
      setDealId("");
      setVerificationStatus("idle");
    } else if (initialDealId && !hasSearched) {
      setDealId(initialDealId);
      performSearch(initialDealId);
    }
  }, [initialDealId, hasSearched, performSearch]);

  // Verify hash when deal is found
  useEffect(() => {
    if (searchedDeal) {
      const verifyHash = async () => {
        setVerificationStatus("verifying");

        // Simulate calculation delay for effect
        await new Promise((resolve) => setTimeout(resolve, 1500));

        try {
          const hash = await calculateDealSeal({
            dealId: searchedDeal.id,
            terms: JSON.stringify(searchedDeal.terms),
            signatureUrl: searchedDeal.signatureUrl || "",
            timestamp: searchedDeal.confirmedAt || searchedDeal.createdAt,
            verifications: transformVerificationsForHash(searchedDeal.verifications),
          });
          setCalculatedHash(hash);

          let result: "valid" | "invalid" | "idle" = "idle";
          if (searchedDeal.dealSeal && hash === searchedDeal.dealSeal) {
            setVerificationStatus("valid");
            result = "valid";
          } else if (searchedDeal.dealSeal) {
            setVerificationStatus("invalid");
            result = "invalid";
          } else {
            setVerificationStatus("idle");
          }

          // Log verification event (only for non-idle, non-demo deals)
          if (result !== "idle" && isSupabaseConfigured() && !isDemoDeal(searchedDeal.publicId)) {
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
          setVerificationStatus("error");
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
    setAuditLogs([]);
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
      {/* Background Decorations */}
      <div className="absolute top-0 right-0 w-[400px] h-[400px] md:w-[800px] md:h-[800px] bg-primary/5 rounded-full blur-[100px] md:blur-[120px] pointer-events-none z-0 translate-x-1/3 -translate-y-1/3" />

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
                <span className="text-muted-foreground">Digital Handshake.</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                Ensure the integrity of your agreements with our cryptographic verification tool.
                Enter a Deal ID to audit the full history or validate a seal instantly.
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
                  <h3 className="text-2xl font-bold mb-3">Ready to proof it?</h3>
                  <p className="text-muted-foreground mb-8 text-base">
                    Stop hoping they&apos;ll keep their word. Start proving they agreed.
                  </p>
                  <Link href="/dashboard">
                    <Button
                      size="xl"
                      className="w-full text-base rounded-2xl shadow-lg shadow-primary/10 h-14"
                    >
                      Create a Deal
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Interactive Verification Card */}
          <motion.div
            layout
            initial={{ opacity: 0, scale: 0.99 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {isSearching ? (
                // Loading State
                <motion.div
                  key="loading"
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98 }}
                  className="w-full"
                >
                  <Card className="border border-border/50 bg-card/50 backdrop-blur-sm rounded-3xl p-16 text-center space-y-8 overflow-hidden relative">
                     <div className="absolute inset-0 bg-gradient-to-tr from-primary/5 via-transparent to-primary/5 animate-pulse" />
                     <div className="relative z-10 space-y-6">
                        <div className="relative h-24 w-24 mx-auto">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-0 rounded-full border-2 border-primary/20 border-t-primary"
                          />
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ShieldCheck className="h-10 w-10 text-primary animate-pulse" />
                          </div>
                        </div>
                        <div className="space-y-2">
                           <h3 className="text-2xl font-bold tracking-tight">Verifying Agreement</h3>
                           <p className="text-muted-foreground animate-pulse text-sm">
                             Calculating SHA-256 cryptographic hashes...
                           </p>
                        </div>
                        <div className="flex justify-center gap-1">
                           {[0, 1, 2].map((i) => (
                             <motion.div
                               key={i}
                               animate={{ opacity: [0.3, 1, 0.3] }}
                               transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                               className="h-1.5 w-1.5 rounded-full bg-primary"
                             />
                           ))}
                        </div>
                     </div>
                  </Card>
                </motion.div>
              ) : !hasSearched ? (
                // Initial State: Search Form
                <motion.div
                  key="search"
                  layout
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                  transition={{ type: "spring", damping: 25, stiffness: 200 }}
                >
                  <Card className="border border-border/50 shadow-sm rounded-2xl overflow-hidden bg-card/80 backdrop-blur-sm">
                    <div className="p-4 sm:p-6">
                      <form onSubmit={handleSearch} className="space-y-4">
                        <div className="relative group/input">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within/input:text-primary transition-colors" />
                          <Input
                            id="deal-id"
                            placeholder="Enter deal ID..."
                            value={dealId}
                            onChange={(e) => setDealId(e.target.value)}
                            className="pl-12 pr-32 h-14 text-lg bg-background border-border/50 rounded-xl transition-all shadow-sm focus:ring-2 focus:ring-primary/20 font-mono"
                            autoFocus
                          />
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
                             {dealId && !isSearching && (
                              <button
                                type="button"
                                onClick={() => setDealId("")}
                                className="p-1.5 text-muted-foreground hover:text-foreground transition-colors"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            )}
                            <Button
                              type="submit"
                              size="sm"
                              className="h-10 px-4 text-xs gap-1.5 rounded-lg shadow-md transition-all active:scale-95"
                              disabled={isSearching || !dealId}
                            >
                              {isSearching ? (
                                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <ShieldCheck className="h-3.5 w-3.5" />
                              )}
                              {isSearching ? "Verifying..." : "Verify Deal"}
                            </Button>
                          </div>
                        </div>
                      </form>

                      {/* Try Demo Section */}
                      <div className="mt-4 pt-4 border-t border-border/40">
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <PlayCircle className="h-4 w-4 text-primary" />
                            <span>Want to see how verification works?</span>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => performSearch(DEMO_DEAL_ID, true)}
                            disabled={isSearching}
                            className="h-9 px-4 text-xs gap-2 rounded-lg border-primary/20 hover:bg-primary/5 hover:border-primary/40 transition-all group w-full sm:w-auto"
                          >
                            <PlayCircle className="h-3.5 w-3.5 text-primary group-hover:scale-110 transition-transform" />
                            Try Demo Verification
                            <ArrowRight className="h-3 w-3 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="px-5 py-3 border-t border-border/40 bg-muted/10 flex items-center justify-between">
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
                </motion.div>
              ) : searchedDeal ? (
                // Result State: Shared VerificationCard
                <motion.div
                  key="result"
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10, transition: { duration: 0.2 } }}
                  className="space-y-6"
                >
                  <VerificationCard
                    deal={searchedDeal}
                    verificationStatus={verificationStatus}
                    calculatedHash={calculatedHash}
                    onDownloadPDF={handleDownloadPDF}
                    isDownloading={isDownloading}
                    onViewDeal={() => window.open(`/d/public/${searchedDeal.publicId}`, "_blank")}
                    creatorProfile={searchedCreatorProfile}
                    recipientProfile={searchedRecipientProfile}
                    auditLogs={auditLogs}
                  />

                  <div className="flex justify-center pt-4">
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
                    layout
                    initial={{ opacity: 0, scale: 0.98 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98, transition: { duration: 0.2 } }}
                    className="bg-card w-full border border-destructive/20 shadow-lg rounded-3xl p-12 text-center space-y-6 backdrop-blur-sm"
                  >
                    <div className="h-20 w-20 rounded-2xl bg-destructive/10 flex items-center justify-center text-destructive mx-auto shadow-inner">
                      <AlertCircle className="h-10 w-10" />
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-bold text-foreground">Deal Not Found</h3>
                      <p className="text-muted-foreground text-base max-w-xs mx-auto">
                        We couldn&apos;t find a deal with ID{" "}
                        <span className="font-mono text-foreground bg-secondary px-2 py-0.5 rounded-lg border border-border/50">
                          {dealId}
                        </span>
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      onClick={handleReset}
                      className="rounded-xl h-12 px-8 gap-2 border-border/50 hover:bg-secondary transition-all"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Try Another ID
                    </Button>
                  </motion.div>
              )}
            </AnimatePresence>

            {/* Why Verification Matters Section */}
            {!hasSearched && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
                className="mt-16 space-y-8"
              >
                <div className="flex items-center gap-3">
                  <div className="h-px flex-1 bg-border/50" />
                  <p className="text-[10px] uppercase font-bold tracking-widest text-muted-foreground/60 whitespace-nowrap">
                    Why Verification Matters
                  </p>
                  <div className="h-px flex-1 bg-border/50" />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-sm group hover:border-primary/20 transition-all">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Cryptographic Proof</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Every agreement is sealed with a unique SHA-256 hash that is mathematically impossible to replicate.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-sm group hover:border-primary/20 transition-all">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Fingerprint className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Tamper Detection</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Changing even a single punctuation mark will break the seal, instantly identifying any modification.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-sm group hover:border-primary/20 transition-all">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Clock className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Instant Audit</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Access the complete timeline of when the deal was created, viewed, and irrevocably signed.
                        </p>
                      </div>
                    </div>
                  </Card>

                  <Card className="p-5 border border-border/50 bg-card/40 backdrop-blur-sm group hover:border-primary/20 transition-all">
                    <div className="flex gap-4">
                      <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                        <Zap className="h-5 w-5 text-primary" />
                      </div>
                      <div className="space-y-1">
                        <h4 className="text-sm font-semibold">Universal Access</h4>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Check any Proofo ID from any device, anywhere in the world. No login or app required.
                        </p>
                      </div>
                    </div>
                  </Card>
                </div>
              </motion.div>
            )}
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
