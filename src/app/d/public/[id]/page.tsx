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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { SignaturePad } from "@/components/signature-pad";
import { iconMap, templateIconNames } from "@/lib/templates";
import { CopyableId, getDealStatusConfig, KeyboardHint } from "@/components/dashboard/shared-components";
import { DealHeader } from "@/components/deal-header";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AuditTimeline } from "@/components/audit-timeline";
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
  Download,
  XCircle,
  Handshake,
  PenLine,
  User,
  Hash,
  TimerOff,
  ChevronRight,
  Copy,
  Key,
  ShieldCheck,
  RefreshCw,
  Users,
  Send,
  Inbox,
  Loader2,
  Check,
} from "lucide-react";
import Link from "next/link";
import { useAppStore } from "@/store";
import { Deal, AuditLogEntry, DealStatus, TrustLevel } from "@/types";
import { formatDateTime } from "@/lib/crypto";
import {
  getDealByPublicIdAction,
  getAccessTokenAction,
  confirmDealAction,
  markDealViewedAction,
  getTokenStatusAction,
  sendDealReceiptAction,
  validateViewTokenAction,
  getAuditLogsAction,
  logAuditEventAction,
  checkRecipientEmailForDealAction,
  TokenStatus,
} from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { generateDealPDF, downloadPDF, generatePDFFilename, pdfBlobToBase64 } from "@/lib/pdf";
import { cn } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { SealedDealView } from "@/components/sealed-deal-view";
import { toast } from "sonner";
import { prepareAuditEvent } from "@/lib/audit-utils";
import { VerificationStep } from "@/components/verification-step";
import { getVerificationStatus, checkProofoUserVerification } from "@/app/actions/verification-actions";

interface DealPageProps {
  params: Promise<{ id: string }>;
}

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
  | "verify"
  | "sign"
  | "complete"
  | "already_signed"
  | "sealed_no_access"
  | "voided"
  | "not_found"
  | "expired"
  | "creator_view";

// Helper function to determine initial step
function getInitialStep(deal: Deal | null, tokenStatus?: TokenStatus, hasAuthorizedAccess?: boolean, isCreator?: boolean): Step {
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
  // If the logged-in user is the creator, show a special view instead of letting them sign
  if (deal.status === "pending" && isCreator) return "creator_view";
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
  const [creatorProfile, setCreatorProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
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
  // Audit trail state
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [showAuditTrail, setShowAuditTrail] = useState(false);

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
        const { deal: fetchedDeal, creatorProfile: fetchedCreator, recipientProfile: fetchedRecipient, error } = await getDealByPublicIdAction(resolvedParams.id);

        if (fetchedDeal && !error) {
          // If creatorProfile was returned, update the deal's creatorName with fresh data
          if (fetchedCreator?.name) {
            fetchedDeal.creatorName = fetchedCreator.name;
          }
          // Set profiles
          setCreatorProfile(fetchedCreator || null);
          setRecipientProfile(fetchedRecipient || null);

          setDbDeal(fetchedDeal);

          // Get token status for this deal (includes expiration check)
          const { status, expiresAt } = await getTokenStatusAction(fetchedDeal.id);
          setTokenStatus(status);
          setTokenExpiresAt(expiresAt);

          // Only get access token if status is valid
          if (status === "valid") {
            const { token } = await getAccessTokenAction(fetchedDeal.id, fetchedDeal.publicId);
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
              // Fetch audit logs for authorized users
              const { logs } = await getAuditLogsAction(fetchedDeal.id, urlToken);
              if (logs.length > 0) {
                setAuditLogs(logs as AuditLogEntry[]);
              }
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
  // Pre-fill email from deal's recipient email, then from signed-in user if available
  const [email, setEmail] = useState("");
  const [isSealing, setIsSealing] = useState(false);
  // Track the deal that was confirmed by user action
  const [sealedDeal, setSealedDeal] = useState<Deal | null>(null);
  // Track access token URL for user to save (generated after signing)
  const [signedAccessUrl, setSignedAccessUrl] = useState<string | null>(null);
  // PDF generation state
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  // Email lookup state (for registered Proofo users)
  const [isLookingUpEmail, setIsLookingUpEmail] = useState(false);
  const [registeredRecipient, setRegisteredRecipient] = useState<{
    id: string;
    name: string;
    avatarUrl?: string;
  } | null>(null);
  const [isCreatorEmail, setIsCreatorEmail] = useState(false); // Track if email belongs to creator
  // Track if we've already pre-filled email (to allow user to clear it)
  const hasPrefilledEmailRef = useRef(false);
  // Verification state
  const [verificationComplete, setVerificationComplete] = useState(false);

  // Calculate current step based on deal state and any user navigation
  const currentStep = useMemo(() => {
    // If user has navigated to a specific step, use that
    if (stepOverride) return stepOverride;
    // If still loading, show loading (not a step per se, handled separately)
    if (isLoadingDeal) return "review";
    // If no deal, show not found
    if (!deal) return "not_found";
    // Check if current user is the creator
    const isCreatorUser = !!(user && deal.creatorId === user.id);
    // Otherwise determine from deal status (including token status and access authorization)
    return getInitialStep(deal, tokenStatus, hasAuthorizedAccess, isCreatorUser);
  }, [stepOverride, isLoadingDeal, deal, tokenStatus, hasAuthorizedAccess, user]);

  // Helper to navigate to a step
  const setCurrentStep = (step: Step) => {
    setStepOverride(step);
  };

  // The confirmed deal is either one we just sealed, or one that was already confirmed in DB
  const confirmedDeal = sealedDeal || (deal?.status === "confirmed" ? deal : null);

  // Current deal data to display
  const displayDeal = confirmedDeal || deal || demoDeal;


  // Calculate status config
  // Force "Action Required" for anonymous users on public page since they are here to sign
  const config = useMemo(() => {
    if (!deal) return getDealStatusConfig(displayDeal, user?.id, user?.email);

    const baseConfig = getDealStatusConfig(deal, user?.id, user?.email);

    // If pending and (anonymous OR not creator), we treat as recipient/action required for public page
    if (deal.status === "pending" && (!user || deal.creatorId !== user.id)) {
      return {
        ...baseConfig,
        label: "Action Required",
        color: "text-rose-600 dark:text-rose-400",
        bg: "bg-rose-500/10",
        border: "border-rose-500/20",
        // We use PenLine as it's already imported and similar enough, or we can trust the base config's icon if it was pending
        icon: baseConfig.icon,
        badgeVariant: "action" as const,
      };
    }
    return baseConfig;
  }, [deal, displayDeal, user]);

  const StatusIcon = config.icon;

  // Determine breadcrumbs based on user state
  const isCreator = user && deal?.creatorId === user.id;

  const breadcrumbItems = useMemo(() => {
    if (!user) {
      return [
        { label: "Proofo", href: "/" },
        { label: "Review" }
      ];
    }

    return [
      { label: "Dashboard", href: "/dashboard" },
      { label: isCreator ? "Agreements" : "Inbox", href: isCreator ? "/dashboard/agreements" : "/dashboard/inbox" },
      { label: "Review" }
    ];
  }, [user, isCreator]);

  const mobileBreadcrumbItems = useMemo(() => {
    if (!user) {
      return [{ label: "Review" }];
    }
    return [
      { label: isCreator ? "Agreements" : "Inbox", href: isCreator ? "/dashboard/agreements" : "/dashboard/inbox" },
      { label: "Review" }
    ];
  }, [user, isCreator]);

  // Pre-fill email when deal or user becomes available (only once)
  // Priority: 1) deal.recipientEmail 2) logged-in user's email
  useEffect(() => {
    // Only pre-fill once - after that, user controls the value
    if (hasPrefilledEmailRef.current) return;

    if (deal?.recipientEmail) {
      setEmail(deal.recipientEmail);
      hasPrefilledEmailRef.current = true;
    } else if (user?.email) {
      setEmail(user.email);
      hasPrefilledEmailRef.current = true;
    }
  }, [deal?.recipientEmail, user?.email]);

  // Debounced email lookup for registered Proofo users
  // SECURITY: Uses deal-scoped action that returns minimal info for anonymous users
  useEffect(() => {
    // Skip lookup if user is already logged in (we use their account info)
    if (user?.id) {
      setRegisteredRecipient(null);
      setIsCreatorEmail(false);
      return;
    }

    // Need deal public ID for the secure lookup
    if (!deal?.publicId) {
      setRegisteredRecipient(null);
      setIsCreatorEmail(false);
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setRegisteredRecipient(null);
      setIsCreatorEmail(false);
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsLookingUpEmail(true);
      try {
        // Use secure deal-scoped action that returns minimal info
        const result = await checkRecipientEmailForDealAction({
          publicId: deal.publicId,
          email: email,
        });

        if (result.isCreator) {
          // Email belongs to the deal creator - prevent self-signing
          setIsCreatorEmail(true);
          setRegisteredRecipient(null);
        } else if (result.isProofoUser) {
          // Email belongs to a registered Proofo user (not creator)
          setIsCreatorEmail(false);
          setRegisteredRecipient({
            id: "proofo-user", // Don't expose actual ID
            name: result.userName || "Proofo User",
            avatarUrl: result.userAvatarUrl,
          });
        } else {
          // Not a registered user
          setIsCreatorEmail(false);
          setRegisteredRecipient(null);
        }
      } catch {
        setIsCreatorEmail(false);
        setRegisteredRecipient(null);
      } finally {
        setIsLookingUpEmail(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [email, user?.id, deal?.publicId]);

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
        // Fetch audit logs for authorized users
        const { logs } = await getAuditLogsAction(deal.id, manualToken);
        if (logs.length > 0) {
          setAuditLogs(logs as AuditLogEntry[]);
        }
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
    // Check if deal requires verification and verification is not complete
    const trustLevel = deal?.trustLevel || "basic";
    if (trustLevel !== "basic" && !verificationComplete) {
      setCurrentStep("verify");
    } else {
      setCurrentStep("sign");
    }
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

    // Log the signature event (before sealing attempt)
    if (deal.id !== "demo123" && isSupabaseConfigured()) {
      const auditEvent = prepareAuditEvent({
        eventType: "deal_signed",
        metadata: { signatureMethod: "drawn" },
        includeClientMetadata: true,
      });
      await logAuditEventAction({
        dealId: deal.id,
        eventType: auditEvent.eventType,
        actorType: "recipient",
        metadata: auditEvent.metadata,
      });
    }

    // If it's a demo deal, use local store
    if (deal.id === "demo123") {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      setIsSealing(false);
      setCurrentStep("complete");
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

      // Auto-send receipt email in background if we have an email
      if (recipientEmailToUse) {
        sendReceiptForLoggedInUser(confirmedResult, recipientEmailToUse);
      }

      setIsSealing(false);
      setCurrentStep("complete");
      return;
    } else {
      // Use local store (demo mode)
      const result = await storeConfirmDeal(deal.id, signature, recipientEmailToUse);
      if (result) {
        setSealedDeal(result);
        setHasAuthorizedAccess(true); // User just signed, they have access
      }
    }

    setIsSealing(false);
    setCurrentStep("complete");
  };

  // PDF Download Handler
  const handleDownloadPDF = useCallback(async () => {
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

      // Log PDF download event
      if (targetDeal.id !== "demo123" && isSupabaseConfigured()) {
        const auditEvent = prepareAuditEvent({
          eventType: "pdf_downloaded",
          metadata: { filename },
          includeClientMetadata: true,
        });
        await logAuditEventAction({
          dealId: targetDeal.id,
          eventType: auditEvent.eventType,
          actorType: "recipient",
          metadata: auditEvent.metadata,
        });
      }
    } catch (error) {
      console.error("Error generating PDF:", error);
      setSealError("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [confirmedDeal, deal, signature, user?.isPro]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // A = Toggle audit trail
      if (e.key === "a" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowAuditTrail(prev => !prev);
      }
      // D = Download PDF
      else if (e.key === "d" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleDownloadPDF();
      }
      // V = Verify
      else if (e.key === "v" && !e.metaKey && !e.ctrlKey && deal) {
        e.preventDefault();
        window.location.href = `/verify?id=${deal.publicId}`;
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [deal, handleDownloadPDF]);

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





  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-background via-background to-muted/30 overflow-hidden">
      {/* Header */}
      <DealHeader
        title={displayDeal?.title}
        homeHref="/"
        breadcrumbItems={breadcrumbItems}
        mobileBreadcrumbItems={mobileBreadcrumbItems}
      />

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

          {/* Creator View State - When logged-in user is the deal creator */}
          {currentStep === "creator_view" && displayDeal && (
            <motion.div
              key="creator_view"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              {/* Header Section - Matching Standardized Style */}
              <div className="mb-8 pl-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 border border-amber-500/20">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">You Created This Deal</h1>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-700 border-amber-500/20">
                        Cannot Sign
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-border" />
                        Logged in as {user?.name || user?.email}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Multi-Card Layout */}
              <div className="space-y-4">
                {/* Warning Card */}
                <Card className="border border-amber-500/30 shadow-sm bg-card rounded-xl overflow-hidden">
                  <motion.div
                    className="h-1.5 w-full bg-amber-500/50"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                        <User className="h-5 w-5 text-amber-600" />
                      </div>
                      <div>
                        <p className="font-medium text-sm text-amber-700">Self-Signing Not Allowed</p>
                        <p className="text-xs text-muted-foreground">
                          You cannot sign an agreement that you created
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
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Agreement</span>
                        </div>
                        <span className="font-medium">{displayDeal.title}</span>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Recipient</span>
                        </div>
                        <span className="font-medium">{displayDeal.recipientName || "Pending"}</span>
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

                {/* What to Do Card */}
                <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                  <CardContent className="p-5">
                    <div className="space-y-4">
                      <div className="flex items-start gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Send className="h-5 w-5 text-primary" />
                        </div>
                        <div className="text-left">
                          <p className="font-medium text-sm mb-1">What should you do?</p>
                          <p className="text-xs text-muted-foreground">
                            Share the signing link with {displayDeal.recipientName || "the recipient"} so they can review and sign.
                            Or, log out if you need to sign as a different user for testing.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 mt-6">
                <Link href={`/d/${displayDeal.publicId}`}>
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <FileText className="h-4 w-4" />
                    View in Dashboard
                  </Button>
                </Link>
                <Link href="/auth/logout">
                  <Button variant="outline" className="gap-2 w-full sm:w-auto">
                    <Lock className="h-4 w-4" />
                    Log Out to Sign
                  </Button>
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
                    className="h-1.5 w-full bg-emerald-500/50"
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
                <TooltipProvider delayDuration={300}>
                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
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
                      </TooltipTrigger>
                      <TooltipContent>Download PDF <KeyboardHint shortcut="D" /></TooltipContent>
                    </Tooltip>

                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Link href={`/verify?id=${displayDeal.publicId}`}>
                          <Button variant="outline" size="sm" className="gap-2">
                            <Shield className="h-4 w-4" />
                            Verify
                          </Button>
                        </Link>
                      </TooltipTrigger>
                      <TooltipContent>Verify Deal <KeyboardHint shortcut="V" /></TooltipContent>
                    </Tooltip>
                  </div>
                </TooltipProvider>
              </div>

              {/* Sealed Status Card - visible only when sealed */}
              {displayDeal.status === "confirmed" && (
                <Card className={cn(
                  "border shadow-sm bg-card rounded-xl overflow-hidden mt-6",
                  (() => {
                    const isRecipient = !!(
                      (user?.id && displayDeal.recipientId === user.id) ||
                      (user?.email && displayDeal.recipientEmail?.toLowerCase() === user.email.toLowerCase())
                    );
                    return isRecipient ? "border-sky-500/30" : "border-emerald-500/30";
                  })()
                )}>
                  <motion.div
                    className={cn(
                      "h-1.5 w-full",
                      (() => {
                        const isRecipient = !!(
                          (user?.id && displayDeal.recipientId === user.id) ||
                          (user?.email && displayDeal.recipientEmail?.toLowerCase() === user.email.toLowerCase())
                        );
                        return isRecipient ? "bg-sky-500/50" : "bg-emerald-500/50";
                      })()
                    )}
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    style={{ transformOrigin: "left" }}
                  />
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div className="flex items-center gap-3">
                        {(() => {
                          const isRecipient = !!(
                            (user?.id && displayDeal.recipientId === user.id) ||
                            (user?.email && displayDeal.recipientEmail?.toLowerCase() === user.email.toLowerCase())
                          );
                          return (
                            <>
                              <div className={cn(
                                "h-10 w-10 rounded-lg flex items-center justify-center",
                                isRecipient ? "bg-sky-500/20" : "bg-emerald-500/20"
                              )}>
                                <CheckCircle2 className={cn("h-5 w-5", isRecipient ? "text-sky-600" : "text-emerald-600")} />
                              </div>
                              <div>
                                <p className={cn(
                                  "font-medium text-sm",
                                  isRecipient ? "text-sky-700" : "text-emerald-700"
                                )}>
                                  {isRecipient ? "Agreement Signed" : "Agreement Sealed"}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  Signed on {displayDeal.confirmedAt ? formatDateTime(displayDeal.confirmedAt) : "a previous date"}
                                </p>
                              </div>
                            </>
                          );
                        })()}
                      </div>
                      <div className="flex items-center gap-2">
                        {(() => {
                          const isRecipient = !!(
                            (user?.id && displayDeal.recipientId === user.id) ||
                            (user?.email && displayDeal.recipientEmail?.toLowerCase() === user.email.toLowerCase())
                          );
                          return (
                            <Link href={`/verify?id=${displayDeal.publicId}`}>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "gap-2",
                                  isRecipient
                                    ? "border-sky-500/30 text-sky-600 hover:bg-sky-500/10"
                                    : "border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10"
                                )}
                              >
                                <ShieldCheck className="h-4 w-4" />
                                Verify
                              </Button>
                            </Link>
                          );
                        })()}
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
              )}

              {/* Shared Deal View - Parties, Terms, Signature & Seal */}
              <SealedDealView
                deal={displayDeal}
                creatorProfile={{ name: displayDeal.creatorName || "Unknown" }}
                recipientProfile={{
                  name: displayDeal.recipientName || "Recipient"
                }}
                isCreator={user?.id === displayDeal.creatorId}
                isRecipient={
                  !!(
                    (user?.id && displayDeal.recipientId === user.id) ||
                    (user?.email && displayDeal.recipientEmail?.toLowerCase() === user.email.toLowerCase())
                  )
                }
                recipientStatusLabel="Signed"
                showSignatureSeal={true}
              />

              {/* Audit Trail - only shown when user has authorized access and there are logs */}
              {auditLogs.length > 0 && (
                <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                  <CardContent className="p-5">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowAuditTrail(!showAuditTrail)}
                      className="text-muted-foreground hover:text-foreground flex items-center gap-2 -ml-2"
                    >
                      <ChevronRight className={cn("h-4 w-4 transition-transform", showAuditTrail && "rotate-90")} />
                      {showAuditTrail ? "Hide" : "Show"} Audit Trail
                      <KeyboardHint shortcut="A" />
                    </Button>

                    <AnimatePresence>
                      {showAuditTrail && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden pt-2"
                        >
                          <AuditTimeline logs={auditLogs} dealStatus={displayDeal.status as DealStatus} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              )}

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
                        Signing as <span className={cn(
                          "font-semibold",
                          user?.id ? "text-sky-600" : registeredRecipient ? "text-emerald-600" : "text-foreground"
                        )}>{registeredRecipient?.name || user?.name || displayDeal.recipientName || "Recipient"}</span>
                        {user?.id && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-sky-500/10 text-sky-600 border-sky-500/20">
                            Logged In
                          </Badge>
                        )}
                        {registeredRecipient && !user?.id && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                            <Check className="h-2.5 w-2.5" />
                            Proofo User
                          </Badge>
                        )}
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
                        <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                          <AvatarImage src={creatorProfile?.avatarUrl} alt={displayDeal.creatorName} />
                          <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-medium text-sm">
                            {creatorInitials}
                          </AvatarFallback>
                        </Avatar>
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
                        className={cn(
                          "flex items-center gap-3 p-4 rounded-xl border cursor-default transition-colors",
                          user?.id
                            ? "bg-sky-500/5 border-sky-500/30"
                            : registeredRecipient
                              ? "bg-emerald-500/5 border-emerald-500/30"
                              : "bg-secondary/30 border-border/50"
                        )}
                      >
                        <Avatar className={cn(
                          "h-10 w-10 shadow-sm",
                          user?.id
                            ? "ring-2 ring-sky-500 ring-offset-2 ring-offset-background"
                            : registeredRecipient
                              ? "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                              : "border border-border/50"
                        )}>
                          <AvatarImage
                            src={user?.avatarUrl || registeredRecipient?.avatarUrl || recipientProfile?.avatarUrl}
                            alt={user?.name || registeredRecipient?.name || displayDeal.recipientName || "Recipient"}
                          />
                          <AvatarFallback className={cn(
                            "font-medium text-sm",
                            user?.id
                              ? "bg-sky-500/20 text-sky-600"
                              : registeredRecipient
                                ? "bg-emerald-500/20 text-emerald-600"
                                : "bg-muted text-muted-foreground"
                          )}>
                            {(user?.name || registeredRecipient?.name || displayDeal.recipientName || "You")
                              .split(" ")
                              .map((n: string) => n[0])
                              .join("")
                              .toUpperCase()
                              .slice(0, 2)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className={cn(
                              "font-medium text-sm truncate",
                              user?.id ? "text-sky-600" : registeredRecipient && "text-emerald-700"
                            )}>
                              {user?.name || registeredRecipient?.name || displayDeal.recipientName || "You"}
                            </p>
                            {user?.id ? (
                              <Badge variant="secondary" className="text-[10px] h-4 shrink-0 bg-sky-500/10 text-sky-600 border-sky-500/20">
                                Logged In
                              </Badge>
                            ) : registeredRecipient ? (
                              <Badge variant="secondary" className="text-[10px] h-4 shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                                <Check className="h-2.5 w-2.5" />
                                Proofo User
                              </Badge>
                            ) : (
                              <Badge variant="secondary" className="text-[10px] h-4 shrink-0">You</Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <Inbox className="h-3 w-3" />
                            {user?.id ? "Your Account" : registeredRecipient ? "Verified Proofo User" : "Recipient"}
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
                          {(() => {
                            const desc = displayDeal.description || "Agreement";
                            // If we have a looked-up name and the description contains the original name, replace it
                            if (registeredRecipient?.name && displayDeal.recipientName && desc.includes(displayDeal.recipientName)) {
                              const parts = desc.split(displayDeal.recipientName);
                              return (
                                <>
                                  {parts[0]}
                                  <span className="text-emerald-600 font-medium">{registeredRecipient.name}</span>
                                  {parts.slice(1).join(displayDeal.recipientName)}
                                </>
                              );
                            }
                            return desc;
                          })()}
                        </p>
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            {formatDateTime(displayDeal.createdAt)}
                          </div>
                          <CopyableId id={displayDeal.publicId} />
                          <Badge variant="outline" className={cn("gap-1.5", config.bg, config.border, config.color)}>
                            <StatusIcon className="h-3 w-3" />
                            {config.label}
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
                  <span>Cryptographically Verified</span>
                </div>
              </div>

              <Button
                className="w-full"
                size="xl"
                onClick={handleProceedToSign}
              >
                Review Complete — Sign to Accept
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </motion.div>
          )}

          {/* Verification Step - Required for Verified/Strong/Maximum trust levels */}
          {currentStep === "verify" && displayDeal && deal && (
            <motion.div
              key="verify"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
              className="max-w-2xl mx-auto w-full py-8"
            >
              <VerificationStep
                dealId={deal.id}
                publicId={deal.publicId}
                trustLevel={(deal as Deal & { trustLevel?: TrustLevel })?.trustLevel || "basic"}
                verifications={deal.verifications}
                onVerificationComplete={() => {
                  setVerificationComplete(true);
                  setCurrentStep("sign");
                }}
                onBack={() => setCurrentStep("review")}
              />
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
                        Signing as <span className={cn(
                          "font-semibold",
                          user?.id ? "text-sky-600" : registeredRecipient ? "text-emerald-600" : "text-foreground"
                        )}>{registeredRecipient?.name || user?.name || user?.email || displayDeal.recipientName}</span>
                        {user?.id && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-sky-500/10 text-sky-600 border-sky-500/20">
                            Logged In
                          </Badge>
                        )}
                        {registeredRecipient && !user?.id && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                            <Check className="h-2.5 w-2.5" />
                            Proofo User
                          </Badge>
                        )}
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

                {/* Recipient Email Section - Only show if not logged in */}
                {!user?.id && (
                  <Card className={cn(
                    "border shadow-sm rounded-2xl overflow-hidden bg-card transition-colors",
                    isCreatorEmail
                      ? "border-destructive/50 bg-destructive/5"
                      : registeredRecipient
                        ? "border-emerald-500/30 bg-emerald-500/5"
                        : "border-border/50"
                  )}>
                    <CardContent className="p-4">
                      <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-muted-foreground" />
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
                              Your Email
                            </span>
                            {!displayDeal.recipientEmail && (
                              <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-rose-500/10 text-rose-600 border-rose-500/20">
                                Required
                              </Badge>
                            )}
                          </div>
                          {registeredRecipient && (
                            <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                              <Check className="h-2.5 w-2.5" />
                              Proofo User
                            </Badge>
                          )}
                        </div>
                        <div className="relative">
                          {registeredRecipient?.avatarUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={registeredRecipient.avatarUrl}
                              alt={registeredRecipient.name}
                              className="absolute left-3 top-1/2 -translate-y-1/2 h-6 w-6 rounded-full object-cover ring-2 ring-emerald-500 ring-offset-1 ring-offset-background"
                            />
                          ) : (
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          )}
                          <Input
                            id="recipient-email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="your@email.com"
                            className={cn(
                              registeredRecipient?.avatarUrl ? "pl-12" : "pl-10",
                              "h-11 text-sm rounded-xl bg-muted/30 border-border focus:ring-1 transition-all",
                              registeredRecipient && "border-emerald-500/30 bg-emerald-500/5"
                            )}
                          />
                          {isLookingUpEmail && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            </div>
                          )}
                          {registeredRecipient && !isLookingUpEmail && (
                            <motion.div
                              initial={{ scale: 0 }}
                              animate={{ scale: 1 }}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"
                            >
                              <Check className="h-4 w-4" />
                            </motion.div>
                          )}
                        </div>
                        {registeredRecipient && (
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Signing as</span>
                            <span className="font-semibold text-foreground">{registeredRecipient.name}</span>
                          </div>
                        )}
                        {isCreatorEmail && (
                          <div className="flex items-center gap-2 text-xs text-destructive font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            <span>You cannot sign a deal you created. Use a different email.</span>
                          </div>
                        )}
                        {displayDeal.recipientEmail && displayDeal.recipientEmail !== email && (
                          <p className="text-[10px] text-muted-foreground">
                            Original email from creator: {displayDeal.recipientEmail}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

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
                        savedSignatureUrl={user?.signatureUrl}
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
                      disabled={!signature || isSealing || (!user?.id && !email) || isCreatorEmail}
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

          {/* Step 3: Complete - Full Deal View */}
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
                        <div className="flex items-center justify-between">
                          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
                            {displayDeal.title}
                          </h1>
                          {(() => {
                            const config = getDealStatusConfig(displayDeal, user?.id, user?.email);
                            const Icon = config.icon;
                            return (
                              <Badge variant={config.badgeVariant} className="ml-2 gap-1.5 h-6">
                                <Icon className="h-3 w-3" />
                                {config.label}
                              </Badge>
                            );
                          })()}
                        </div>
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
                    className="h-1.5 w-full bg-emerald-500/50"
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
                    name: displayDeal.recipientName || "Recipient"
                  }}
                  isCreator={user?.id === displayDeal.creatorId}
                  isRecipient={
                    !!(
                      (user?.id && displayDeal.recipientId === user.id) ||
                      (user?.email && displayDeal.recipientEmail?.toLowerCase() === user.email.toLowerCase())
                    )
                  }
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
