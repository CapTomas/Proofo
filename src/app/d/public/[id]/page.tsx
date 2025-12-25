"use client";

import { useState, use, useEffect, useMemo, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { SignaturePad } from "@/components/signature-pad";
import { DealHeader } from "@/components/deal-header";
import { CopyableId } from "@/components/dashboard/shared-components";
import {
  Shield,
  CheckCircle2,
  FileCheck,
  FileText,
  Mail,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Calendar,
  Lock,
  Clock,
  Download,
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
  Copy,
  Key,
  ShieldCheck,
  RefreshCw,
  Users,
  Send,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { Deal } from "@/types";
import { formatDateTime } from "@/lib/crypto";
import {
  getDealByPublicIdAction,
  getAccessTokenAction,
  confirmDealAction,
  markDealViewedAction,
  getTokenStatusAction,
  sendDealReceiptAction,
  validateViewTokenAction,
  TokenStatus,
} from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generateDealPDF, downloadPDF, generatePDFFilename, pdfBlobToBase64 } from "@/lib/pdf";
import { getUserInitials, cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { SealedDealView } from "@/components/sealed-deal-view";
import { toast } from "sonner";

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
    {
      id: "4",
      label: "Condition Notes",
      value: "Excellent condition, includes original box and accessories",
      type: "text",
    },
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
    {
      id: "4",
      label: "Condition Notes",
      value: "Excellent condition, includes original box and accessories",
      type: "text",
    },
  ],
  createdAt: "2024-01-20T14:00:00Z",
  confirmedAt: "2024-01-21T10:30:00Z",
  status: "confirmed",
  signatureUrl:
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==",
  dealSeal: "a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef12345678",
};

type Step =
  | "review"
  | "sign"
  | "email"
  | "complete"
  | "already_signed"
  | "sealed_no_access"
  | "voided"
  | "not_found"
  | "expired";

// Template icon name mapping
const templateIconNames: Record<string, string> = {
  "lend-item": "Package",
  "simple-agreement": "Handshake",
  "payment-promise": "DollarSign",
  "service-exchange": "ArrowLeftRight",
  custom: "PenLine",
};

// Helper function to determine initial step
function getInitialStep(deal: Deal | null, tokenStatus?: TokenStatus, hasAuthorizedAccess?: boolean): Step {
  if (!deal) return "not_found";
  // For confirmed deals, check if user has authorized access (token or authenticated party)
  if (deal.status === "confirmed") {
    return hasAuthorizedAccess ? "already_signed" : "sealed_no_access";
  }
  if (deal.status === "voided") return "voided";
  // Check token status for pending deals
  if (deal.status === "pending" && tokenStatus === "expired") return "expired";
  if (deal.status === "pending" && tokenStatus === "used") return "sealed_no_access"; // Was already signed, no access
  if (deal.status === "sealing") return "sign";
  return "review";
}

export default function DealConfirmPage({ params }: DealPageProps) {
  const resolvedParams = use(params);
  const searchParams = useSearchParams();
  const urlToken = searchParams.get("token");
  const { getDealByPublicId, confirmDeal: storeConfirmDeal, addAuditLog, user, isSidebarCollapsed } = useAppStore();
  const { copyToClipboard } = useCopyToClipboard();
  const hasLoggedViewRef = useRef(false);
  const hasFetchedRef = useRef(false);

  // State for database deal
  const [dbDeal, setDbDeal] = useState<Deal | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoadingDeal, setIsLoadingDeal] = useState(true);
  const [sealError, setSealError] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<TokenStatus>("valid");
  const [tokenExpiresAt, setTokenExpiresAt] = useState<string | null>(null);
  // Track if user has authorized access to view sealed deal details (via URL token or just signed)
  const [hasAuthorizedAccess, setHasAuthorizedAccess] = useState(false);
  // State for manual token entry
  const [manualToken, setManualToken] = useState("");
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [tokenError, setTokenError] = useState<string | null>(null);

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

      // Handle demo confirmed deal (for preview) - grant access for demo purposes
      if (resolvedParams.id === "demo-confirmed") {
        setDbDeal(demoConfirmedDeal);
        setHasAuthorizedAccess(true); // Demo always has access
        setIsLoadingDeal(false);
        return;
      }

      // Try to fetch from Supabase first (authoritative source)
      if (isSupabaseConfigured()) {
        const { deal: fetchedDeal, creatorProfile, error } = await getDealByPublicIdAction(resolvedParams.id);

        if (fetchedDeal && !error) {
          // If creatorProfile was returned, update the deal's creatorName with fresh data
          if (creatorProfile?.name) {
            fetchedDeal.creatorName = creatorProfile.name;
          }
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

          // Check if user has authorized access via URL token (for viewing sealed deals)
          // This is the ONLY way to get access - being logged in is NOT enough
          if (fetchedDeal.status === "confirmed" && urlToken) {
            const { isValid } = await validateViewTokenAction(fetchedDeal.id, urlToken, fetchedDeal.publicId);
            if (isValid) {
              setHasAuthorizedAccess(true);
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
  }, [resolvedParams.id, getDealByPublicId, urlToken]);

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
  // Track access token URL for user to save (generated after signing)
  const [signedAccessUrl, setSignedAccessUrl] = useState<string | null>(null);
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
    // Otherwise determine from deal status (including token status and access authorization)
    return getInitialStep(deal, tokenStatus, hasAuthorizedAccess);
  }, [stepOverride, isLoadingDeal, deal, tokenStatus, hasAuthorizedAccess]);

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

  // Handle manual token validation for sealed deals
  const handleValidateToken = async () => {
    if (!manualToken || !deal) return;

    setIsValidatingToken(true);
    setTokenError(null);

    try {
      const { isValid, error } = await validateViewTokenAction(deal.id, manualToken, deal.publicId);

      if (isValid) {
        setHasAuthorizedAccess(true);
      } else {
        setTokenError(error || "Invalid or expired access token");
      }
    } catch {
      setTokenError("Failed to validate token. Please try again.");
    } finally {
      setIsValidatingToken(false);
    }
  };

  const handleProceedToSign = () => {
    setCurrentStep("sign");
  };

  // Auto-send receipt email for logged-in users (fire-and-forget)
  const sendReceiptForLoggedInUser = useCallback(async (deal: Deal, recipientEmail: string) => {
    try {
      const verificationUrl =
        typeof window !== "undefined"
          ? `${window.location.origin}/verify?id=${deal.publicId}`
          : `https://proofo.app/verify?id=${deal.publicId}`;

      const { pdfBlob } = await generateDealPDF({
        deal: deal,
        signatureDataUrl: signature || deal.signatureUrl,
        isPro: user?.isPro || false,
        verificationUrl,
      });

      const pdfBase64 = await pdfBlobToBase64(pdfBlob);
      const pdfFilename = generatePDFFilename(deal);

      const { success } = await sendDealReceiptAction({
        dealId: deal.id,
        publicId: deal.publicId, // Pass publicId for RLS bypass
        recipientEmail: recipientEmail,
        pdfBase64,
        pdfFilename,
      });

      // Only set emailSent to true if the email was actually sent successfully
      if (success) {
        setEmailSent(true);
      }
    } catch (error) {
      // Silent failure for auto-send - user can still download PDF manually
      console.error("Auto-send receipt failed (non-blocking):", error);
    }
  }, [signature, user?.isPro]);

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

    // Determine email to use - logged-in user's email takes priority
    const recipientEmailToUse = user?.email || email || undefined;

    // Check if we have an access token and should use Supabase
    if (accessToken && isSupabaseConfigured()) {
      // Use server action for secure sealing
      // Note: The server action automatically links the deal to the logged-in user's ID
      const { deal: confirmedResult, error } = await confirmDealAction({
        dealId: deal.id,
        publicId: deal.publicId,
        token: accessToken,
        signatureBase64: signature,
        recipientEmail: recipientEmailToUse,
      });

      if (error || !confirmedResult) {
        setSealError(error || "Failed to seal deal");
        setIsSealing(false);
        return;
      }

      setSealedDeal(confirmedResult);
      setHasAuthorizedAccess(true); // User just signed, they have access to view details

      // Generate access URL with token for user to save
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setSignedAccessUrl(`${baseUrl}/d/public/${deal.publicId}?token=${accessToken}`);

      // For logged-in users: skip email step entirely and go to complete
      // Their user.id is already linked, and we can auto-send receipt
      if (user?.id && user?.email) {
        setIsSealing(false);
        // Auto-send receipt email in background for logged-in users
        sendReceiptForLoggedInUser(confirmedResult, user.email);
        setCurrentStep("complete");
        return;
      }
    } else {
      // Use local store (demo mode)
      const result = await storeConfirmDeal(deal.id, signature, recipientEmailToUse);
      if (result) {
        setSealedDeal(result);
        setHasAuthorizedAccess(true); // User just signed, they have access
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
    const targetDeal = confirmedDeal || deal;
    if (!targetDeal) return;

    setIsGeneratingPDF(true);
    try {
      const verificationUrl =
        typeof window !== "undefined"
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
      const verificationUrl =
        typeof window !== "undefined"
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
        publicId: confirmedDeal.publicId, // Pass publicId for RLS bypass
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
            This deal doesn&apos;t exist or the link may have expired. Please check with the person
            who sent you this link.
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
    <div className="h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/30 overflow-hidden">
      {/* Header */}
      <DealHeader title={displayDeal?.title} homeHref="/" />

      <main className={cn(
        "flex-1 overflow-y-auto w-full transition-all duration-300 py-8 lg:py-12",
        "px-4 sm:px-6",
        isSidebarCollapsed ? "lg:px-[112px]" : "lg:px-[312px]"
      )}>
        <div className="max-w-7xl mx-auto w-full">
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
                This deal doesn&apos;t exist or the link may have expired. Please check with the
                person who sent you this link.
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
                This deal has been voided by {displayDeal.creatorName} and is no longer available
                for signing.
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
                This signing link has expired
                {tokenExpiresAt ? ` on ${formatDateTime(tokenExpiresAt)}` : ""}.
              </p>
              <Card className="mb-6 max-w-md mx-auto">
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="text-left text-sm">
                      <p className="font-medium mb-1">What happened?</p>
                      <p className="text-muted-foreground">
                        For security reasons, signing links expire after 7 days. Please contact{" "}
                        {displayDeal.creatorName} to request a new signing link.
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

          {/* Sealed - No Access State (GDPR compliant minimal view) */}
          {currentStep === "sealed_no_access" && displayDeal && (
            <motion.div
              key="sealed_no_access"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Header Section - Matching Standardized Style */}
              <div className="mb-8 pl-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                    <Lock className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Deal Sealed</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        Verified
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-border" />
                        Access token required
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Card Layout */}
              <div className="space-y-4">
                {/* Status Card */}
                <Card className="border border-emerald-500/30 shadow-sm bg-card rounded-xl overflow-hidden">
                  <motion.div
                    className="h-1.5 w-full bg-emerald-500"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-emerald-700">Agreement Verified</p>
                        <p className="text-xs text-muted-foreground">
                          {displayDeal.confirmedAt
                            ? `Sealed on ${formatDateTime(displayDeal.confirmedAt)}`
                            : "Cryptographically sealed and verified"}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Deal Info Card */}
                <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                  <CardContent className="p-5">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Creator</span>
                        </div>
                        <span className="font-medium">{displayDeal.creatorName}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          {(() => {
                            const templateId = displayDeal.templateId || "simple-agreement";
                            const iconName = templateIconNames[templateId] || "Handshake";
                            const IconComp = iconMap[iconName] || Handshake;
                            return <IconComp className="h-4 w-4 text-muted-foreground" />;
                          })()}
                          <span className="text-muted-foreground">Deal Type</span>
                        </div>
                        <span className="font-medium">
                          {displayDeal.templateId === "lend-item" ? "Lend Item" :
                           displayDeal.templateId === "simple-agreement" ? "Simple Agreement" :
                           displayDeal.templateId === "payment-promise" ? "Payment Promise" :
                           displayDeal.templateId === "service-exchange" ? "Service Exchange" :
                           displayDeal.templateId === "custom" ? "Custom Deal" :
                           "Agreement"}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Deal ID</span>
                        </div>
                        <CopyableId id={displayDeal.publicId} />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Token Entry Form Card */}
                <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm mb-1">Have an access token?</p>
                          <p className="text-xs text-muted-foreground">
                            Enter the access token from your signing link to view full deal details.
                          </p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="access-token" className="sr-only">Access Token</Label>
                        <Input
                          id="access-token"
                          type="text"
                          placeholder="Enter access token..."
                          value={manualToken}
                          onChange={(e) => setManualToken(e.target.value)}
                          className="font-mono text-sm"
                        />
                        {tokenError && (
                          <p className="text-sm text-destructive flex items-center gap-1.5">
                            <AlertCircle className="h-3.5 w-3.5" />
                            {tokenError}
                          </p>
                        )}
                      </div>

                      <Button
                        onClick={handleValidateToken}
                        disabled={!manualToken || isValidatingToken}
                        className="w-full gap-2"
                      >
                        {isValidatingToken ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <Sparkles className="h-4 w-4" />
                            </motion.div>
                            Validating...
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4" />
                            Unlock Full Details
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex gap-3 mt-6">
                <Link href={`/verify?id=${displayDeal.publicId}`}>
                  <Button variant="outline" className="gap-2">
                    <Shield className="h-4 w-4" />
                    Verify Deal
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}

          {/* Already Signed State - matches private deal page layout */}
          {currentStep === "already_signed" && displayDeal && (
            <motion.div
              key="already_signed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              {/* Header - matching private page style */}
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center shrink-0 border border-emerald-500/20 shadow-sm">
                    {(() => {
                      const templateId = displayDeal.templateId || "simple-agreement";
                      const iconName = templateIconNames[templateId] || "Handshake";
                      const IconComp = iconMap[iconName] || Handshake;
                      return <IconComp className="h-6 w-6 text-emerald-600" />;
                    })()}
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{displayDeal.title}</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-700">
                        <CheckCircle2 className="h-3 w-3" />
                        Confirmed
                      </Badge>
                      <CopyableId id={displayDeal.publicId} />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        • Sealed {displayDeal.confirmedAt ? formatDateTime(displayDeal.confirmedAt) : ""}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions - matching private page */}
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    disabled={isGeneratingPDF}
                    className="gap-2"
                  >
                    {isGeneratingPDF ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      >
                        <Sparkles className="h-4 w-4" />
                      </motion.div>
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                    PDF
                  </Button>
                  <Link href={`/verify?id=${displayDeal.publicId}`}>
                    <Button variant="outline" size="sm" className="gap-2">
                      <Shield className="h-4 w-4" />
                      Verify
                    </Button>
                  </Link>
                </div>
              </div>

              {/* Sealed Status Card - matching private page */}
              <Card className="border border-emerald-500/30 shadow-sm bg-card rounded-xl overflow-hidden">
                <motion.div
                  className="h-1.5 w-full bg-emerald-500"
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  style={{ transformOrigin: "left" }}
                />
                <CardContent className="p-5">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-emerald-700">
                          Agreement Sealed
                         </p>
                        <p className="text-xs text-muted-foreground">
                          Signed on {displayDeal.confirmedAt ? formatDateTime(displayDeal.confirmedAt) : "a previous date"}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Link href={`/verify?id=${displayDeal.publicId}`}>
                        <Button variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                          <ShieldCheck className="h-4 w-4" />
                          Verify
                        </Button>
                      </Link>
                      {!user && (
                        <Link href="/auth/signup">
                          <Button size="sm" className="gap-2">
                            <Sparkles className="h-4 w-4" />
                            Create Account
                          </Button>
                        </Link>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Shared Deal View - Parties, Terms, Signature & Seal */}
              <SealedDealView
                deal={displayDeal}
                creatorProfile={{ name: displayDeal.creatorName || "Unknown" }}
                recipientProfile={{
                  name: user?.name || displayDeal.recipientName || "Recipient"
                }}
                isCreator={false}
                isRecipient={true}
                recipientStatusLabel="Signed"
                showSignatureSeal={true}
              />

              {/* Footer - matching public complete step */}
              <div className="mt-8 text-center text-sm text-muted-foreground">
                {user ? (
                  <p className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    This deal is linked to your account • <Link href="/dashboard/agreements" className="text-primary hover:underline">View in Dashboard</Link>
                  </p>
                ) : (
                  <p className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    Save your access link to view this deal anytime
                  </p>
                )}
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
              {/* Header Section - Matching Signature Step Style */}
              <div className="mb-8 pl-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Review Agreement</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/10">
                        Step 1 of 2
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-border" />
                        Signing as <span className="font-semibold text-foreground">{user?.name || displayDeal.recipientName || "Recipient"}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Card Layout - Matching Private Deal Page Style */}
              <div className="space-y-4">
                {/* Parties Card */}
                <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                      <Users className="h-4 w-4" />
                      Parties
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      {/* Creator */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default"
                      >
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-medium text-sm shadow-sm">
                          {creatorInitials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{displayDeal.creatorName}</p>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Send className="h-3 w-3" />
                            Creator
                          </p>
                        </div>
                      </motion.div>

                      {/* Recipient */}
                      <motion.div
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                        className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default"
                      >
                        <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center font-medium text-sm text-muted-foreground shadow-sm">
                          {(displayDeal.recipientName || user?.name || "You")
                            .split(" ")
                            .map((n: string) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm truncate">{displayDeal.recipientName || user?.name || "You"}</p>
                            <Badge variant="secondary" className="text-[10px] h-4 shrink-0">You</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Inbox className="h-3 w-3" />
                            Recipient
                          </p>
                        </div>
                      </motion.div>
                    </div>
                  </CardContent>
                </Card>

                {/* Deal Info Card */}
                <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-start gap-4">
                      {(() => {
                        const templateId = displayDeal.templateId || "simple-agreement";
                        const iconName = templateIconNames[templateId] || "Handshake";
                        const IconComp = iconMap[iconName] || Handshake;
                        return (
                          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                            <IconComp className="h-6 w-6 text-primary" />
                          </div>
                        );
                      })()}
                      <div className="flex-1 min-w-0">
                        <h2 className="text-xl font-bold tracking-tight">{displayDeal.title}</h2>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {displayDeal.description || "Agreement"}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDateTime(displayDeal.createdAt)}
                          </div>
                          <CopyableId id={displayDeal.publicId} />
                          <Badge variant="outline" className="gap-1.5 bg-amber-500/10 border-amber-500/30 text-amber-700">
                            <Clock className="h-3 w-3" />
                            Pending
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Terms Card */}
                <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                  <CardContent className="p-5 md:p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                        <FileText className="h-4 w-4" />
                        Terms
                      </div>
                      <Badge variant="secondary" className="text-[10px]">
                        {displayDeal.terms.length} {displayDeal.terms.length === 1 ? "term" : "terms"}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      {displayDeal.terms.map((term, index) => (
                        <motion.div
                          key={term.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.05 }}
                          whileHover={{ scale: 1.01 }}
                          className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer group/term"
                          onClick={() => {
                            copyToClipboard(`${term.label}: ${term.value}`);
                            toast.success(`Copied: ${term.label}`);
                          }}
                        >
                          <span className="text-sm text-muted-foreground">{term.label}</span>
                          <span className="font-medium text-sm flex items-center gap-2">
                            {term.value}
                            <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover/term:opacity-100 transition-opacity" />
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-6 my-8 text-sm text-muted-foreground">
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
              className="max-w-7xl mx-auto w-full"
            >
              {/* Header Section */}
              <div className="mb-8 pl-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                    <PenLine className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Sign Agreement</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/10">
                        Step 2 of 2
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-border" />
                        Signing as <span className="font-semibold text-foreground">{user?.name || user?.email || displayDeal.recipientName}</span>
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {/* Summary Section (Top Row) */}
                <div className="grid sm:grid-cols-2 gap-4">
                  <Card className="border border-border/50 shadow-card rounded-2xl overflow-hidden bg-card">
                    <CardContent className="p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm border shadow-xs">
                          {creatorInitials}
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Creator</p>
                          <p className="font-semibold truncate text-sm">{displayDeal.creatorName}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1 text-right">Agreement ID</p>
                        <CopyableId id={displayDeal.publicId} className="bg-background" />
                      </div>
                    </CardContent>
                  </Card>

                  <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Lock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-wider text-primary mb-0.5">Immutable Seal</p>
                      <p className="text-[11px] text-muted-foreground leading-tight">
                        Signed deals are cryptographically sealed. Neither party can alter terms without breaking verification.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Full Width Signature Pad */}
                <div className="w-full">
                  {sealError && (
                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-4">
                      <div className="p-3 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-medium flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {sealError}
                      </div>
                    </motion.div>
                  )}

                  <Card className="border border-border/50 shadow-card rounded-2xl overflow-hidden bg-card">
                    <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                        <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Signature Input</span>
                      </div>
                      <Badge variant="outline" className="text-[10px] uppercase tracking-tighter border-border font-mono px-1.5">
                        Live Verification
                      </Badge>
                    </div>
                    <CardContent className="p-4 sm:p-10">
                      <SignaturePad
                        onSignatureChange={setSignature}
                      />
                    </CardContent>
                  </Card>

                  {/* Actions Area */}
                  <div className="flex flex-col sm:flex-row items-center gap-4 mt-8">
                    <Button
                      variant="ghost"
                      size="lg"
                      className="w-full sm:w-auto px-6 rounded-xl text-muted-foreground hover:text-foreground order-2 sm:order-1"
                      onClick={() => setCurrentStep("review")}
                    >
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back to Terms
                    </Button>
                    <Button
                      size="xl"
                      className="w-full sm:flex-1 rounded-2xl shadow-lg shadow-primary/20 gap-2 text-base font-bold transition-all hover:translate-y-[-1px] active:translate-y-[1px] order-1 sm:order-2"
                      onClick={handleSign}
                      disabled={!signature || isSealing}
                    >
                      {isSealing ? (
                        <>
                          <RefreshCw className="h-5 w-5 animate-spin" />
                          Finalizing Seal...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="h-5 w-5" />
                          Accept & Seal Deal
                        </>
                      )}
                    </Button>
                  </div>
                </div>
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
                    className="absolute inset-6 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30"
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
              {/* Header Section - Matching Review/Sign Step Style */}
              <div className="mb-8 pl-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Agreement Sealed</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-700 border-emerald-500/20">
                        Complete
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-border" />
                        Get your receipt
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <Card className="mb-6">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address{" "}
                      <span className="text-muted-foreground">
                        ({user?.email ? "Auto-filled" : "Optional"})
                      </span>
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
                      <p className="text-sm text-emerald-700">
                        Receipt sent successfully! Check your inbox.
                      </p>
                    </div>
                  )}

                  {!emailSent && (
                    <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
                      <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                      <p className="text-sm text-muted-foreground">
                        We&apos;ll send you a PDF copy of this agreement with the cryptographic seal
                        for your records. Your email is never shared.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleSkipEmail}
                  disabled={isSendingEmail}
                >
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

          {/* Step 4: Complete - Full Deal View */}
          {currentStep === "complete" && (
            <motion.div
              key="complete"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {/* Header - matching private page */}
              <div className="mb-8">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <motion.div
                      whileHover={{ scale: 1.05, rotate: 3 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm bg-emerald-500/10 border-emerald-500/30"
                    >
                      {(() => {
                        const templateId = displayDeal.templateId || "simple-agreement";
                        const iconName = templateIconNames[templateId] || "Handshake";
                        const IconComp = iconMap[iconName] || Handshake;
                        return <IconComp className="h-6 w-6 text-emerald-600" />;
                      })()}
                    </motion.div>
                    <div>
                      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{displayDeal.title}</h1>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600">
                          <CheckCircle2 className="h-3 w-3" />
                          Sealed & Verified
                        </Badge>
                        <CopyableId id={displayDeal.publicId} />
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadPDF}
                      disabled={isGeneratingPDF}
                      className="gap-2"
                    >
                      {isGeneratingPDF ? <Sparkles className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      <span className="hidden sm:inline">PDF</span>
                    </Button>
                    <Link href={`/verify?id=${displayDeal.publicId}`}>
                      <Button variant="outline" size="sm" className="gap-2">
                        <Shield className="h-4 w-4" />
                        <span className="hidden sm:inline">Verify</span>
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>

              {/* Multi-Card Layout */}
              <div className="space-y-4">
                {/* Success Status Card with emerald border */}
                <Card className="border border-emerald-500/30 shadow-sm bg-card rounded-xl overflow-hidden">
                  <motion.div
                    className="h-1.5 w-full bg-emerald-500"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <motion.div
                          className="h-10 w-10 rounded-lg bg-emerald-500/20 flex items-center justify-center"
                          initial={{ rotate: -10 }}
                          animate={{ rotate: 0 }}
                          transition={{ type: "spring", stiffness: 400, damping: 10 }}
                        >
                          <Sparkles className="h-5 w-5 text-emerald-600" />
                        </motion.div>
                        <div>
                          <p className="font-medium text-sm text-emerald-600 flex items-center gap-2">
                            Agreement Sealed Successfully
                            <CheckCircle2 className="h-4 w-4" />
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Signed on {confirmedDeal?.confirmedAt ? formatDateTime(confirmedDeal.confirmedAt) : new Date().toLocaleString()}
                            {emailSent && " • Receipt sent to your email"}
                          </p>
                        </div>
                      </div>
                      {user && (
                        <Link href="/dashboard/agreements">
                          <Button variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                            View in Dashboard
                            <ArrowRight className="h-3 w-3" />
                          </Button>
                        </Link>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Access Token Card - Only for non-logged-in users */}
                {!user && signedAccessUrl && (
                  <Card className="border border-primary/30 shadow-sm bg-card rounded-xl overflow-hidden">
                    <CardContent className="p-5">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Key className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-1">Save Your Access Link</p>
                          <p className="text-xs text-muted-foreground mb-3">
                            This link gives you full access to view this deal anytime. Save it somewhere safe!
                          </p>
                          <div className="flex items-center gap-2">
                            <code className="flex-1 px-3 py-2 bg-muted rounded-lg text-xs font-mono truncate">
                              {signedAccessUrl}
                            </code>
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 gap-2"
                              onClick={() => {
                                copyToClipboard(signedAccessUrl);
                                toast.success("Access link copied!");
                              }}
                            >
                              <Copy className="h-4 w-4" />
                              Copy
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Shared Deal View - Parties, Terms, Signature & Seal */}
                <SealedDealView
                  deal={displayDeal}
                  creatorProfile={{ name: displayDeal.creatorName || "Unknown" }}
                  recipientProfile={{
                    name: user?.name || displayDeal.recipientName || "Recipient"
                  }}
                  isCreator={false}
                  isRecipient={true}
                  recipientStatusLabel="Signed"
                  showSignatureSeal={true}
                />
              </div>

              {/* Footer */}
              <div className="mt-8 text-center text-sm text-muted-foreground">
                {user ? (
                  <p className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    This deal is linked to your account • <Link href="/dashboard/agreements" className="text-primary hover:underline">View in Dashboard</Link>
                  </p>
                ) : (
                  <p className="flex items-center justify-center gap-2">
                    <Shield className="h-4 w-4" />
                    Save your access link above to view this deal anytime
                  </p>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
