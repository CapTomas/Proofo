"use client";

import { useState, use, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SignaturePad } from "@/components/signature-pad";
import {
  Shield,
  CheckCircle2,
  FileCheck,
  Mail,
  AlertCircle,
  Sparkles,
  ArrowRight,
  Calendar,
  Lock,
  Clock,
  Download,
  ExternalLink,
  XCircle,
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
  LucideIcon,
  User,
  Hash,
  TimerOff,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { Deal } from "@/types";
import { formatDate, formatDateTime } from "@/lib/crypto";
import {
  getDealByPublicIdAction,
  getAccessTokenAction,
  confirmDealAction,
  markDealViewedAction,
  getTokenStatusAction,
  sendDealReceiptAction,
  TokenStatus
} from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generateDealPDF, downloadPDF, generatePDFFilename, pdfBlobToBase64 } from "@/lib/pdf";

interface DealPageProps {
  params: Promise<{ id: string }>;
}

// Icon mapping for templates
const iconMap: Record<string, LucideIcon> = {
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
};

// Demo deal data for when deal is not found
const demoDeal: Deal = {
  id: "demo123",
  publicId: "demo123",
  creatorId: "demo-creator",
  creatorName: "Alex Johnson",
  recipientName: "You",
  title: "Lend Camera Equipment",
  description: "Agreement to lend camera equipment",
  templateId: "lend-item",
  terms: [
    { id: "1", label: "Item Being Lent", value: "Canon EOS R5 + 24-70mm f/2.8 lens", type: "text" },
    { id: "2", label: "Estimated Value", value: "$5,000", type: "currency" },
    { id: "3", label: "Expected Return Date", value: "February 15, 2024", type: "date" },
    { id: "4", label: "Condition Notes", value: "Excellent condition, includes original box and accessories", type: "text" },
  ],
  createdAt: "2024-01-20T14:00:00Z",
  status: "pending",
};

// Demo deal for confirmed state preview
const demoConfirmedDeal: Deal = {
  id: "demo-confirmed",
  publicId: "demo-confirmed",
  creatorId: "demo-creator",
  creatorName: "Alex Johnson",
  recipientName: "Sarah Miller",
  title: "Lend Camera Equipment",
  description: "Agreement to lend camera equipment",
  templateId: "lend-item",
  terms: [
    { id: "1", label: "Item Being Lent", value: "Canon EOS R5 + 24-70mm f/2.8 lens", type: "text" },
    { id: "2", label: "Estimated Value", value: "$5,000", type: "currency" },
    { id: "3", label: "Expected Return Date", value: "February 15, 2024", type: "date" },
    { id: "4", label: "Condition Notes", value: "Excellent condition, includes original box and accessories", type: "text" },
  ],
  createdAt: "2024-01-20T14:00:00Z",
  confirmedAt: "2024-01-21T10:30:00Z",
  status: "confirmed",
  signatureUrl: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  dealSeal: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
};

type Step = "review" | "sign" | "email" | "complete" | "already_signed" | "voided" | "not_found" | "expired";

// Template icon name mapping
const templateIconNames: Record<string, string> = {
  "lend-item": "Package",
  "simple-agreement": "Handshake",
  "payment-promise": "DollarSign",
  "service-exchange": "ArrowLeftRight",
  "custom": "PenLine",
};

// Helper function to determine initial step
function getInitialStep(deal: Deal | null, tokenStatus?: TokenStatus): Step {
  if (!deal) return "not_found";
  if (deal.status === "confirmed") return "already_signed";
  if (deal.status === "voided") return "voided";
  // Check token status for pending deals
  if (deal.status === "pending" && tokenStatus === "expired") return "expired";
  if (deal.status === "pending" && tokenStatus === "used") return "already_signed";
  if (deal.status === "sealing") return "sign";
  return "review";
}

export default function DealConfirmPage({ params }: DealPageProps) {
  const resolvedParams = use(params);
  const { getDealByPublicId, confirmDeal: storeConfirmDeal, addAuditLog, user } = useAppStore();
  const hasLoggedViewRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // State for database deal
  const [dbDeal, setDbDeal] = useState<Deal | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingDeal, setIsLoadingDeal] = useState(true);
  const [sealError, setSealError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("valid");
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);

  // Fetch deal from database on mount
  useEffect(() => {
    if (hasFetchedRef.current) return;
    hasFetchedRef.current = true;

    const fetchDeal = async () => {
      // Handle demo deals
      if (resolvedParams.id === "demo123") {
        setDbDeal(demoDeal);
        setIsLoadingDeal(false);
        return;
      }

      // Handle demo confirmed deal (for preview)
      if (resolvedParams.id === "demo-confirmed") {
        setDbDeal(demoConfirmedDeal);
        setIsLoadingDeal(false);
        return;
      }

      // Try to fetch from Supabase first (authoritative source)
      if (isSupabaseConfigured()) {
        const { deal: fetchedDeal, error } = await getDealByPublicIdAction(resolvedParams.id);

        if (fetchedDeal && !error) {
          setDbDeal(fetchedDeal);

          // Get token status for this deal (includes expiration check)
          const { status, expiresAt } = await getTokenStatusAction(fetchedDeal.id);
          setTokenStatus(status);
          setTokenExpiresAt(expiresAt);

          // Only get access token if status is valid
          if (status === "valid") {
            const { token } = await getAccessTokenAction(fetchedDeal.id);
            if (token) {
              setAccessToken(token);
            }
          }

          // Mark as viewed
          await markDealViewedAction(resolvedParams.id);
          setIsLoadingDeal(false);
          return;
        }

        // If Supabase failed, fall through to local store
      }

      // Fall back to local store (for demo/local mode without Supabase or if Supabase fetch failed)
      const localDeal = getDealByPublicId(resolvedParams.id);
      if (localDeal) {
        setDbDeal(localDeal);
      }

      setIsLoadingDeal(false);
    };

    fetchDeal();
  }, [resolvedParams.id, getDealByPublicId]);

  // Get the deal to display
  const deal = dbDeal;

  // Track the step state - initial value depends on whether deal is loaded
  const [stepOverride, setStepOverride] = useState<Step | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  // Pre-fill email from signed-in user if available
  const [email, setEmail] = useState(user?.email || "");
  const [isSealing, setIsSealing] = useState(false);
  // Track the deal that was confirmed by user action
  const [sealedDeal, setSealedDeal] = useState<Deal | null>(null);
  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Calculate current step based on deal state and any user navigation
  const currentStep = useMemo(() => {
    // If user has navigated to a specific step, use that
    if (stepOverride) return stepOverride;
    // If still loading, show loading (not a step per se, handled separately)
    if (isLoadingDeal) return "review";
    // If no deal, show not found
    if (!deal) return "not_found";
    // Otherwise determine from deal status (including token status)
    return getInitialStep(deal, tokenStatus);
  }, [stepOverride, isLoadingDeal, deal, tokenStatus]);

  // Helper to navigate to a step
  const setCurrentStep = (step: Step) => {
    setStepOverride(step);
  };

  // The confirmed deal is either one we just sealed, or one that was already confirmed in DB
  const confirmedDeal = sealedDeal || (deal?.status === "confirmed" ? deal : null);

  // Pre-fill email when user becomes available (e.g., logs in after page load)
  useEffect(() => {
    if (user?.email && !email) {
      setEmail(user.email);
    }
  }, [user?.email, email]);

  // Log deal view for non-demo deals (using ref to track)
  useEffect(() => {
    if (deal && deal.id !== "demo123" && !hasLoggedViewRef.current) {
      hasLoggedViewRef.current = true;
      addAuditLog({
        dealId: deal.id,
        eventType: "deal_viewed",
        actorId: user?.id || null,
        actorType: "recipient",
        metadata: {
          viewedAt: new Date().toISOString(),
          isLoggedIn: !!user,
        },
      });
    }
  }, [deal, addAuditLog, user]);

  // Get creator initials
  const creatorInitials = useMemo(() => {
    if (!deal) return "??";
    return deal.creatorName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }, [deal]);

  const handleProceedToSign = () => {
    setCurrentStep("sign");
  };

  const handleSign = async () => {
    if (!signature || !deal) return;

    setIsSealing(true);
    setSealError(null);

    // If it's a demo deal, use local store
    if (deal.id === "demo123") {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      setIsSealing(false);
      setCurrentStep("email");
      return;
    }

    // Check if we have an access token and should use Supabase
    if (accessToken && isSupabaseConfigured()) {
      // Use server action for secure sealing
      const { deal: confirmedResult, error } = await confirmDealAction({
        dealId: deal.id,
        publicId: deal.publicId,
        token: accessToken,
        signatureBase64: signature,
        recipientEmail: email || undefined,
      });

      if (error || !confirmedResult) {
        setSealError(error || "Failed to seal deal");
        setIsSealing(false);
        return;
      }

      setSealedDeal(confirmedResult);
    } else {
      // Use local store (demo mode)
      const result = await storeConfirmDeal(deal.id, signature, email || undefined);
      if (result) {
        setSealedDeal(result);
      }
    }

    setIsSealing(false);
    setCurrentStep("email");
  };

  const handleSkipEmail = () => {
    setCurrentStep("complete");
  };

  // PDF Download Handler
  const handleDownloadPDF = async () => {
    if (!confirmedDeal && !displayDeal) return;
    
    const targetDeal = confirmedDeal || displayDeal;
    if (!targetDeal) return;

    setIsGeneratingPDF(true);
    try {
      const verificationUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/verify?id=${targetDeal.publicId}`
        : `https://proofo.app/verify?id=${targetDeal.publicId}`;

      const { pdfBlob } = await generateDealPDF({
        deal: targetDeal,
        signatureDataUrl: signature || targetDeal.signatureUrl,
        isPro: user?.isPro || false,
        verificationUrl,
      });

      const filename = generatePDFFilename(targetDeal);
      downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      setSealError("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  // Send Receipt Email Handler
  const handleSendReceiptEmail = async () => {
    if (!email || !confirmedDeal) return;

    setIsSendingEmail(true);
    setEmailError(null);

    try {
      // First generate the PDF
      const verificationUrl = typeof window !== "undefined" 
        ? `${window.location.origin}/verify?id=${confirmedDeal.publicId}`
        : `https://proofo.app/verify?id=${confirmedDeal.publicId}`;

      const { pdfBlob } = await generateDealPDF({
        deal: confirmedDeal,
        signatureDataUrl: signature || confirmedDeal.signatureUrl,
        isPro: user?.isPro || false,
        verificationUrl,
      });

      // Convert PDF to base64 for email attachment
      const pdfBase64 = await pdfBlobToBase64(pdfBlob);
      const pdfFilename = generatePDFFilename(confirmedDeal);

      // Send the email with PDF attachment
      const { success, error } = await sendDealReceiptAction({
        dealId: confirmedDeal.id,
        recipientEmail: email,
        pdfBase64,
        pdfFilename,
      });

      if (!success) {
        setEmailError(error || "Failed to send email");
      } else {
        setEmailSent(true);
        // Move to complete step after successful email
        setTimeout(() => setCurrentStep("complete"), 1500);
      }
    } catch (error) {
      console.error("Error sending receipt email:", error);
      setEmailError("Failed to send email. Please try again.");
    } finally {
      setIsSendingEmail(false);
    }
  };

  // Show loading if deal is being fetched
  if (isLoadingDeal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto mb-4"
          />
          <p className="text-muted-foreground">Loading deal...</p>
        </div>
      </div>
    );
  }

  // Show not found if no deal after loading
  if (!deal && !isLoadingDeal) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center py-12">
          <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="text-2xl font-bold mb-3">Deal Not Found</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            This deal doesn&apos;t exist or the link may have expired. Please check with the person who sent you this link.
          </p>
          <Link href="/">
            <Button>Go to Proofo</Button>
          </Link>
        </div>
      </div>
    );
  }

  // Current deal data to display
  const displayDeal = confirmedDeal || deal || demoDeal;

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-40">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Proofo</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-2xl">
        <AnimatePresence mode="wait">
          {/* Not Found State */}
          {currentStep === "not_found" && (
            <motion.div
              key="not_found"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-muted-foreground" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Deal Not Found</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                This deal doesn&apos;t exist or the link may have expired. Please check with the person who sent you this link.
              </p>
              <Link href="/">
                <Button>Go to Proofo</Button>
              </Link>
            </motion.div>
          )}

          {/* Voided State */}
          {currentStep === "voided" && displayDeal && (
            <motion.div
              key="voided"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                <XCircle className="h-10 w-10 text-destructive" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Deal Voided</h1>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                This deal has been voided by {displayDeal.creatorName} and is no longer available for signing.
              </p>
              <Link href="/">
                <Button variant="outline">Go to Proofo</Button>
              </Link>
            </motion.div>
          )}

          {/* Expired State - Token has expired */}
          {currentStep === "expired" && displayDeal && (
            <motion.div
              key="expired"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12"
            >
              <div className="h-20 w-20 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-6">
                <TimerOff className="h-10 w-10 text-amber-600" />
              </div>
              <h1 className="text-2xl font-bold mb-3">Link Expired</h1>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                This signing link has expired{tokenExpiresAt ? ` on ${formatDateTime(tokenExpiresAt)}` : ""}.
              </p>
              <Card className="mb-6 max-w-md mx-auto">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-left text-sm">
                      <p className="font-medium mb-1">What happened?</p>
                      <p className="text-muted-foreground">
                        For security reasons, signing links expire after 7 days. Please contact {displayDeal.creatorName} to request a new signing link.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Link href="/">
                  <Button variant="outline">Go to Proofo</Button>
                </Link>
                <Link href="/dashboard">
                  <Button>View Your Deals</Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Already Signed State */}
          {currentStep === "already_signed" && displayDeal && (
            <motion.div
              key="already_signed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Success Header */}
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4 px-4 py-1.5 bg-emerald-500/10 text-emerald-700 border-emerald-500/30">
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                  Sealed & Verified
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                  Deal Complete
                </h1>
                <p className="text-muted-foreground">
                  This agreement was sealed on {displayDeal.confirmedAt ? formatDateTime(displayDeal.confirmedAt) : "a previous date"}
                </p>
              </div>

              {/* Creator & Status Info */}
              <Card className="mb-6 border-emerald-500/30">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center text-white font-semibold">
                      {creatorInitials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{displayDeal.creatorName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {formatDate(displayDeal.createdAt)}
                      </p>
                    </div>
                    <Badge variant="success" className="gap-1.5">
                      <CheckCircle2 className="h-3 w-3" />
                      Confirmed
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Deal Details */}
              <Card className="mb-6 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const templateId = displayDeal.templateId || "simple-agreement";
                      const iconName = templateIconNames[templateId] || "Handshake";
                      const IconComp = iconMap[iconName] || Handshake;
                      return (
                        <div className="h-14 w-14 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <IconComp className="h-7 w-7 text-emerald-600" />
                        </div>
                      );
                    })()}
                    <div>
                      <CardTitle className="text-xl">{displayDeal.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {displayDeal.description || "Agreement"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Deal metadata */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Recipient:</span>
                      <span className="font-medium">{displayDeal.recipientName || "Recipient"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Deal ID:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {displayDeal.publicId}
                      </Badge>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Agreement Terms</h4>
                    {displayDeal.terms.map((term, index) => (
                      <motion.div
                        key={term.id}
                        className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b last:border-0"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className="text-muted-foreground text-sm">{term.label}</span>
                        <span className="font-medium">{term.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Signature Display */}
              {displayDeal.signatureUrl && (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <PenLine className="h-5 w-5 text-muted-foreground" />
                      Recipient Signature
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="bg-muted/30 rounded-lg p-4 flex justify-center">
                      {displayDeal.signatureUrl.startsWith('data:') ? (
                        <img
                          src={displayDeal.signatureUrl}
                          alt="Signature"
                          className="max-h-24 object-contain"
                        />
                      ) : (
                        <img
                          src={displayDeal.signatureUrl}
                          alt="Signature"
                          className="max-h-24 object-contain"
                        />
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Cryptographic Seal */}
              {displayDeal.dealSeal && (
                <Card className="mb-6">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Lock className="h-5 w-5 text-muted-foreground" />
                      Cryptographic Seal (SHA-256)
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <code className="block p-3 bg-muted rounded-lg text-xs font-mono break-all">
                      {displayDeal.dealSeal}
                    </code>
                    <p className="text-xs text-muted-foreground mt-2">
                      This hash proves the deal data has not been modified since signing.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span>Encrypted & Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span>Cryptographically Sealed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span>Legally Binding</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download Receipt
                    </>
                  )}
                </Button>
                <Link href={`/verify?id=${displayDeal.publicId}`}>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <Shield className="h-4 w-4" />
                    Verify Deal
                  </Button>
                </Link>
                <Link href="/">
                  <Button className="gap-2 w-full sm:w-auto">
                    <Sparkles className="h-4 w-4" />
                    Create Your Own Deals
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Step 1: Review Deal */}
          {currentStep === "review" && displayDeal && (
            <motion.div
              key="review"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4 px-4 py-1.5">
                  <Shield className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Secure Agreement
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">
                  {displayDeal.creatorName} wants to make a deal
                </h1>
                <p className="text-muted-foreground">
                  Review the terms below before signing
                </p>
                {user && (
                  <Badge variant="outline" className="mt-3 gap-1.5">
                    <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                    Signing as {user.name}
                  </Badge>
                )}
              </div>

              {/* Creator Info */}
              <Card className="mb-6">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold">
                      {creatorInitials}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{displayDeal.creatorName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {formatDate(displayDeal.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1.5">
                      <Clock className="h-3 w-3" />
                      Pending
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              {/* Deal Details */}
              <Card className="mb-6 overflow-hidden">
                <CardHeader className="bg-muted/30 border-b pb-4">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const templateId = displayDeal.templateId || "simple-agreement";
                      const iconName = templateIconNames[templateId] || "Handshake";
                      const IconComp = iconMap[iconName] || Handshake;
                      return (
                        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <IconComp className="h-7 w-7 text-primary" />
                        </div>
                      );
                    })()}
                    <div>
                      <CardTitle className="text-xl">{displayDeal.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {displayDeal.description || "Agreement"}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {/* Deal metadata */}
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b">
                    <div className="flex items-center gap-2 text-sm">
                      <User className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Recipient:</span>
                      <span className="font-medium">{displayDeal.recipientName || "You"}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Hash className="h-4 w-4 text-muted-foreground" />
                      <span className="text-muted-foreground">Deal ID:</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {displayDeal.publicId}
                      </Badge>
                    </div>
                  </div>

                  {/* Terms */}
                  <div className="space-y-1">
                    <h4 className="text-sm font-medium text-muted-foreground mb-3">Agreement Terms</h4>
                    {displayDeal.terms.map((term, index) => (
                      <motion.div
                        key={term.id}
                        className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b last:border-0"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <span className="text-muted-foreground text-sm">{term.label}</span>
                        <span className="font-medium">{term.value}</span>
                      </motion.div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-6 mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Shield className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span>Encrypted & Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <Lock className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span>Cryptographically Sealed</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <FileCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <span>Legally Binding</span>
                </div>
              </div>

              <Button
                className="w-full shadow-xl shadow-primary/25"
                size="xl"
                onClick={handleProceedToSign}
              >
                Review Complete — Sign to Accept
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* Step 2: Sign */}
          {currentStep === "sign" && displayDeal && (
            <motion.div
              key="sign"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-4 px-4 py-1.5">
                  <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                  Almost Done
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Sign to Accept</h1>
                <p className="text-muted-foreground">
                  Draw your signature below to seal this agreement
                </p>
              </div>

              {sealError && (
                <Card className="mb-6 border-destructive/50 bg-destructive/5">
                  <CardContent className="p-4 flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{sealError}</p>
                  </CardContent>
                </Card>
              )}

              <Card className="mb-6">
                <CardContent className="p-6 sm:p-8">
                  <SignaturePad
                    onSignatureChange={setSignature}
                    className="flex flex-col items-center"
                  />
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep("review")}
                >
                  Back
                </Button>
                <Button
                  className="flex-1 shadow-xl shadow-primary/25"
                  size="lg"
                  onClick={handleSign}
                  disabled={!signature || isSealing}
                >
                  {isSealing ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-5 w-5 mr-2" />
                      </motion.div>
                      Sealing...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Agree & Seal
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Sealing Animation Overlay */}
          {isSealing && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/90 backdrop-blur-md z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
                className="text-center max-w-sm mx-auto px-4"
              >
                {/* Animated Seal */}
                <div className="relative h-32 w-32 mx-auto mb-8">
                  <motion.div
                    animate={{
                      scale: [1, 1.2, 1],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-primary/20"
                  />
                  <motion.div
                    animate={{
                      scale: [1, 1.1, 1],
                    }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="absolute inset-2 rounded-full bg-primary/30"
                  />
                  <motion.div
                    animate={{
                      rotate: [0, 360],
                    }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-4 border-dashed border-primary/40"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5, type: "spring" }}
                    className="absolute inset-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30"
                  >
                    <FileCheck className="h-10 w-10 text-primary-foreground" />
                  </motion.div>
                </div>

                <motion.h2
                  className="text-2xl font-bold mb-2"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 }}
                >
                  Sealing Your Deal
                </motion.h2>
                <motion.p
                  className="text-muted-foreground"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  Creating cryptographic proof...
                </motion.p>
              </motion.div>
            </motion.div>
          )}

          {/* Step 3: Email (Optional) */}
          {currentStep === "email" && (
            <motion.div
              key="email"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
                >
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-3 tracking-tight">Deal Sealed! 🎉</h1>
                <p className="text-muted-foreground">
                  Where should we send your receipt?
                </p>
                {user && (
                  <Badge variant="outline" className="mt-3 gap-1.5">
                    <User className="h-3 w-3" />
                    Signed in as {user.name || user.email}
                  </Badge>
                )}
              </div>

              <Card className="mb-6">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-muted-foreground">({user?.email ? "Auto-filled" : "Optional"})</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="pl-11"
                        disabled={isSendingEmail || emailSent}
                      />
                    </div>
                  </div>

                  {emailError && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-destructive/10 border border-destructive/30">
                      <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                      <p className="text-sm text-destructive">{emailError}</p>
                    </div>
                  )}

                  {emailSent && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                      <p className="text-sm text-emerald-700">Receipt sent successfully! Check your inbox.</p>
                    </div>
                  )}

                  {!emailSent && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        We&apos;ll send you a PDF copy of this agreement with the cryptographic seal for your records. Your email is never shared.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={handleSkipEmail} disabled={isSendingEmail}>
                  Skip for Now
                </Button>
                <Button
                  className="flex-1 shadow-xl shadow-primary/25"
                  onClick={handleSendReceiptEmail}
                  disabled={!email || isSendingEmail || emailSent}
                >
                  {isSendingEmail ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4 mr-2" />
                      </motion.div>
                      Sending...
                    </>
                  ) : emailSent ? (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Sent!
                    </>
                  ) : (
                    <>
                      <Mail className="h-4 w-4 mr-2" />
                      Send Receipt
                    </>
                  )}
                </Button>
              </div>
            </motion.div>
          )}

          {/* Step 4: Complete */}
          {currentStep === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
              className="text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-8 shadow-xl shadow-emerald-500/30"
              >
                <CheckCircle2 className="h-12 w-12 text-white" />
              </motion.div>

              <h1 className="text-2xl sm:text-3xl font-bold mb-4 tracking-tight">You&apos;re All Set!</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                This agreement has been cryptographically sealed and is now enforceable.
                {email && " A copy has been sent to your email."}
              </p>

              <Card className="mb-8 text-left">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-muted-foreground text-sm">Deal ID</span>
                      <Badge variant="outline" className="font-mono text-xs">
                        {resolvedParams.id}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-muted-foreground text-sm">Status</span>
                      <Badge variant="success" className="gap-1.5">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmed
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between py-2 border-b">
                      <span className="text-muted-foreground text-sm">Sealed At</span>
                      <span className="font-medium text-sm">
                        {confirmedDeal?.confirmedAt
                          ? formatDate(confirmedDeal.confirmedAt)
                          : new Date().toLocaleString('en-US', {
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                      </span>
                    </div>
                    {confirmedDeal?.dealSeal && (
                      <div className="flex items-center justify-between py-2 border-b">
                        <span className="text-muted-foreground text-sm">Seal Hash</span>
                        <Badge variant="outline" className="font-mono text-xs max-w-[200px] truncate">
                          {confirmedDeal.dealSeal.slice(0, 16)}...
                        </Badge>
                      </div>
                    )}
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground text-sm">With</span>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-xs font-medium">
                          {creatorInitials}
                        </div>
                        <span className="font-medium text-sm">{displayDeal.creatorName}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button 
                  variant="outline" 
                  className="gap-2"
                  onClick={handleDownloadPDF}
                  disabled={isGeneratingPDF}
                >
                  {isGeneratingPDF ? (
                    <>
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                      Generating...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Download PDF
                    </>
                  )}
                </Button>
                <Button variant="outline" className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  View Details
                </Button>
              </div>

              <Separator className="my-8" />

              <div className="text-center">
                <p className="text-sm text-muted-foreground mb-4">Want to create your own deals?</p>
                <Link href="/dashboard">
                  <Button className="shadow-lg shadow-primary/20 gap-2">
                    <Sparkles className="h-4 w-4" />
                    Get Started with Proofo
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 sm:px-6 text-center text-sm text-muted-foreground">
          <p className="flex items-center justify-center gap-2">
            <Shield className="h-4 w-4" />
            Powered by Proofo • Evidence that holds up
          </p>
        </div>
      </footer>
    </div>
  );
}
