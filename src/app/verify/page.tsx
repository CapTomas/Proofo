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
import { useAppStore } from "@/store";
import { calculateDealSeal } from "@/lib/crypto";
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
  ScanLine,
  Terminal,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { VerificationCard, VerificationStatus } from "@/components/verification-card";

function VerifyContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDealId = searchParams.get("id") || "";

  const { getDealByPublicId, getAuditLogsForDeal } = useAppStore();
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

      // Always try Supabase first if configured
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
          // Local store doesn't have partial profiles separate usually, or we can mock it
        }
      }

      setSearchedDeal(dealData);
      setSearchedCreatorProfile(cProfile || null);
      setSearchedRecipientProfile(rProfile || null);

      setHasSearched(true);
      setIsSearching(false);
    },
    [getDealByPublicId, getAuditLogsForDeal, router]
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

          // Log verification event (only for non-idle status)
          if (result !== "idle" && isSupabaseConfigured()) {
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
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            <AnimatePresence mode="wait">
              {!hasSearched ? (
                // Initial State: Search Form
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
                // Result State: Shared VerificationCard
                <div className="space-y-6">
                  <VerificationCard
                    deal={searchedDeal}
                    verificationStatus={verificationStatus}
                    calculatedHash={calculatedHash}
                    onDownloadPDF={handleDownloadPDF}
                    isDownloading={isDownloading}
                    onViewDeal={() => window.open(`/d/public/${searchedDeal.publicId}`, "_blank")}
                    creatorProfile={searchedCreatorProfile}
                    recipientProfile={searchedRecipientProfile}
                  />
                  <div className="flex justify-center">
                    <Button
                      variant="ghost"
                      onClick={handleReset}
                      className="text-muted-foreground hover:text-foreground h-10 rounded-xl"
                    >
                      Verify Another Deal
                    </Button>
                  </div>
                </div>
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
