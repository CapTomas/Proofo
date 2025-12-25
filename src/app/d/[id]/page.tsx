"use client";

import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { DealHeader } from "@/components/deal-header";
import { AuditTimeline } from "@/components/audit-timeline";
import { SealedDealView } from "@/components/sealed-deal-view";
import { CopyableId } from "@/components/dashboard/shared-components";
import { Deal, AuditLogEntry } from "@/types";
import { formatDateTime, timeAgo } from "@/lib/crypto";
import { cn } from "@/lib/utils";
import { generateDealPDF, downloadPDF, generatePDFFilename } from "@/lib/pdf";
import { getPrivateDealAction, voidDealAction, sendDealInvitationAction, getViewAccessTokenAction } from "@/app/actions/deal-actions";
import { useAppStore } from "@/store";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import confetti from "canvas-confetti";
import {
  Shield,
  CheckCircle2,
  Clock,
  XCircle,
  RefreshCw,
  ArrowLeft,
  Download,
  Copy,
  Check,
  Lock,
  AlertTriangle,
  Handshake,
  Package,
  DollarSign,
  ArrowLeftRight,
  LucideIcon,
  MoreHorizontal,
  ShieldCheck,
  Mail,
  ChevronRight,
  QrCode,
  Share2,
  Sparkles,
  Printer,
  ExternalLink,
  Zap,
  Command,
  Key,
  Trash2,
  PenLine
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Animation variants matching deal/new page
const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      ...springTransition,
      staggerChildren: 0.05,
    },
  },
};

const slideUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springTransition },
};

// Keyboard hint component
const KeyboardHint = ({ keys }: { keys: string }) => (
  <kbd className="ml-2 hidden sm:inline-flex h-5 px-1.5 bg-muted border border-border/50 rounded text-[10px] font-mono text-muted-foreground items-center gap-0.5">
    {keys.split("+").map((key, i) => (
      <span key={i}>
        {i > 0 && "+"}
        {key === "cmd" ? <Command className="h-3 w-3" /> : key}
      </span>
    ))}
  </kbd>
);

// Icon mapping for templates
const iconMap: Record<string, LucideIcon> = {
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
};

const templateIconNames: Record<string, string> = {
  "lend-item": "Package",
  "simple-agreement": "Handshake",
  "payment-promise": "DollarSign",
  "service-exchange": "ArrowLeftRight",
  custom: "PenLine",
};

// Status configuration
const statusConfig = {
  pending: {
    label: "Pending Signature",
    color: "text-amber-600",
    bg: "bg-amber-500/10",
    border: "border-amber-500/30",
    icon: Clock,
    description: "Awaiting recipient signature",
    barColor: "bg-amber-500",
  },
  sealing: {
    label: "Sealing",
    color: "text-blue-600",
    bg: "bg-blue-500/10",
    border: "border-blue-500/30",
    icon: RefreshCw,
    description: "Processing cryptographic seal",
    barColor: "bg-blue-500",
  },
  confirmed: {
    label: "Sealed & Verified",
    color: "text-emerald-600",
    bg: "bg-emerald-500/10",
    border: "border-emerald-500/30",
    icon: CheckCircle2,
    description: "Verified and enforceable",
    barColor: "bg-emerald-500",
  },
  voided: {
    label: "Voided",
    color: "text-destructive",
    bg: "bg-destructive/10",
    border: "border-destructive/30",
    icon: XCircle,
    description: "No longer valid",
    barColor: "bg-destructive",
  },
};

interface PrivateDealPageProps {
  params: Promise<{ id: string }>;
}

export default function PrivateDealPage({ params }: PrivateDealPageProps) {
  const router = useRouter();
  const { user, isSidebarCollapsed } = useAppStore();
  const { copied, copyToClipboard } = useCopyToClipboard();
  const [resolvedId, setResolvedId] = useState<string | null>(null);
  const [deal, setDeal] = useState<Deal | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [creatorProfile, setCreatorProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [recipientProfile, setRecipientProfile] = useState<{ name: string; avatarUrl?: string } | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [showVoidDialog, setShowVoidDialog] = useState(false);
  const [isVoiding, setIsVoiding] = useState(false);
  const [showAuditTrail, setShowAuditTrail] = useState(false);
  const [showQRDialog, setShowQRDialog] = useState(false);
  const [isSendingNudge, setIsSendingNudge] = useState(false);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const hasShownConfetti = useRef(false);

  // Resolve params
  useEffect(() => {
    params.then((p) => setResolvedId(p.id));
  }, [params]);

  // Fetch deal data
  useEffect(() => {
    if (!resolvedId) return;

    const fetchDeal = async () => {
      setIsLoading(true);
      const result = await getPrivateDealAction(resolvedId);

      if (result.error) {
        setError(result.error);
      } else if (result.deal) {
        setDeal(result.deal);
        setAuditLogs(result.auditLogs as AuditLogEntry[]);
        setCreatorProfile(result.creatorProfile);
        setRecipientProfile(result.recipientProfile);
        setIsCreator(result.isCreator);

        // Fetch access token for the deal (for sharing/copying)
        const { token } = await getViewAccessTokenAction(result.deal.id);
        setAccessToken(token);
      }
      setIsLoading(false);
    };

    fetchDeal();
  }, [resolvedId]);

  // Celebration confetti for confirmed deals
  useEffect(() => {
    if (deal?.status === "confirmed" && !hasShownConfetti.current) {
      hasShownConfetti.current = true;
      // Subtle confetti burst
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 },
        colors: ["#10b981", "#34d399", "#6ee7b7"],
      });
    }
  }, [deal?.status]);

  // Get template icon
  const TemplateIcon = useMemo(() => {
    if (!deal) return Handshake;
    const templateId = deal.templateId || "simple-agreement";
    const iconName = templateIconNames[templateId] || "Handshake";
    return iconMap[iconName] || Handshake;
  }, [deal]);

  // Get signing link
  const signingLink = useMemo(() => {
    if (!deal) return "";
    return `${typeof window !== "undefined" ? window.location.origin : ""}/d/public/${deal.publicId}`;
  }, [deal]);

  // Copy signing link
  const handleCopyLink = useCallback(() => {
    if (!signingLink) return;
    copyToClipboard(signingLink);
    toast.success("Link copied to clipboard!", {
      icon: <Check className="h-4 w-4 text-emerald-500" />,
    });
  }, [signingLink, copyToClipboard]);

  // Native share
  const handleShare = useCallback(async () => {
    if (!deal || !signingLink) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: deal.title,
          text: `Sign this agreement: ${deal.title}`,
          url: signingLink,
        });
        toast.success("Shared successfully!");
      } catch {
        handleCopyLink();
      }
    } else {
      handleCopyLink();
    }
  }, [deal, signingLink, handleCopyLink]);

  // Download PDF
  const handleDownloadPDF = useCallback(async () => {
    if (!deal) return;
    setIsGeneratingPDF(true);
    try {
      const verificationUrl = `${window.location.origin}/verify?id=${deal.publicId}`;
      const { pdfBlob } = await generateDealPDF({
        deal,
        signatureDataUrl: deal.signatureUrl,
        isPro: user?.isPro || false,
        verificationUrl,
      });
      downloadPDF(pdfBlob, generatePDFFilename(deal));
      toast.success("PDF downloaded!", {
        icon: <Download className="h-4 w-4 text-primary" />,
      });
    } catch (err) {
      console.error("PDF generation error:", err);
      toast.error("Failed to generate PDF");
    } finally {
      setIsGeneratingPDF(false);
    }
  }, [deal, user?.isPro]);

  // Print page
  const handlePrint = useCallback(() => {
    window.print();
  }, []);

  // Send nudge/reminder
  const handleSendNudge = useCallback(async () => {
    if (!deal || !deal.recipientEmail || !isCreator) return;
    setIsSendingNudge(true);
    try {
      const result = await sendDealInvitationAction({ dealId: deal.id, recipientEmail: deal.recipientEmail });
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Reminder sent to ${deal.recipientEmail}!`, {
          icon: <Mail className="h-4 w-4 text-primary" />,
        });
      }
    } catch {
      toast.error("Failed to send reminder");
    } finally {
      setIsSendingNudge(false);
    }
  }, [deal, isCreator]);

  // Void deal
  const handleVoidDeal = async () => {
    if (!deal || !isCreator) return;
    setIsVoiding(true);
    const { error } = await voidDealAction(deal.id);
    if (error) {
      toast.error(error);
    } else {
      toast.success("Deal voided");
      window.location.reload();
    }
    setIsVoiding(false);
    setShowVoidDialog(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      // C = Copy link
      if (e.key === "c" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleCopyLink();
      }
      // D = Download PDF
      else if (e.key === "d" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handleDownloadPDF();
      }
      // P = Print
      else if (e.key === "p" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        handlePrint();
      }
      // Q = QR Code
      else if (e.key === "q" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowQRDialog(true);
      }
      // A = Toggle audit trail
      else if (e.key === "a" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault();
        setShowAuditTrail(prev => !prev);
      }
      // Escape = Back
      else if (e.key === "Escape") {
        router.push("/dashboard/agreements");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleCopyLink, handleDownloadPDF, handlePrint, router]);

  // Loading state
  if (isLoading) {
    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <DealHeader title={deal?.title} />
        <main className={cn(
          "flex-1 overflow-y-auto py-8 lg:py-12 w-full transition-all duration-300",
          "px-4 sm:px-6",
          isSidebarCollapsed ? "lg:px-[112px]" : "lg:px-[312px]"
        )}>
          <div className="max-w-7xl mx-auto w-full">
            <div className="mb-8">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-10 w-3/4 mb-3" />
              <div className="flex gap-2">
                <Skeleton className="h-6 w-28" />
                <Skeleton className="h-6 w-20" />
              </div>
            </div>
            <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
              <div className="p-5 md:p-6 space-y-6">
                <Skeleton className="h-24 w-full rounded-lg" />
                <Skeleton className="h-40 w-full rounded-lg" />
              </div>
            </Card>
          </div>
        </main>
      </div>
    );
  }

  // Error state
  if (error) {
    const isAuthError = error === "Authentication required";
    const isUnauthorized = error.includes("Unauthorized");

    return (
      <div className="h-screen flex flex-col bg-background overflow-hidden">
        <DealHeader title={deal?.title} />
        <main className={cn(
          "flex-1 overflow-y-auto py-16 w-full transition-all duration-300",
          "px-4 sm:px-6",
          isSidebarCollapsed ? "lg:px-[112px]" : "lg:px-[312px]"
        )}>
          <div className="max-w-7xl mx-auto w-full">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={springTransition}
            >
              <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                <CardContent className="p-8 text-center">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.1, type: "spring", stiffness: 400, damping: 25 }}
                    className={cn(
                      "h-14 w-14 rounded-xl flex items-center justify-center mx-auto mb-5",
                      isAuthError ? "bg-primary/10" : "bg-destructive/10"
                    )}
                  >
                    {isAuthError ? (
                      <Lock className="h-7 w-7 text-primary" />
                    ) : isUnauthorized ? (
                      <Shield className="h-7 w-7 text-destructive" />
                    ) : (
                      <AlertTriangle className="h-7 w-7 text-destructive" />
                    )}
                  </motion.div>
                  <h1 className="text-xl font-bold mb-2">
                    {isAuthError ? "Sign In Required" : isUnauthorized ? "Access Denied" : "Something Went Wrong"}
                  </h1>
                  <p className="text-muted-foreground text-sm mb-6">
                    {isAuthError
                      ? "Please sign in to view this deal."
                      : isUnauthorized
                        ? "Only the creator and recipient can access this deal."
                        : error}
                  </p>
                  <div className="flex flex-col gap-2">
                    {isAuthError && (
                      <Link href="/login">
                        <Button className="w-full">Sign In</Button>
                      </Link>
                    )}
                    <Link href="/dashboard">
                      <Button variant={isAuthError ? "outline" : "default"} className="w-full">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </main>
      </div>
    );
  }

  if (!deal) return null;

  const config = statusConfig[deal.status as keyof typeof statusConfig] || statusConfig.pending;
  const StatusIcon = config.icon;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="h-screen flex flex-col bg-background print:bg-white overflow-hidden">
        <div className="print:hidden">
          <DealHeader title={deal?.title} />
        </div>

        <main className={cn(
          "flex-1 overflow-y-auto py-8 lg:py-12 w-full transition-all duration-300",
          "px-4 sm:px-6",
          isSidebarCollapsed ? "lg:px-[112px]" : "lg:px-[312px]"
        )}>
          <div className="max-w-7xl mx-auto w-full">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
          >
            {/* Back Navigation */}
            <motion.div variants={slideUp} className="mb-6 print:hidden">
              <Link
                href="/dashboard/agreements"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
              >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Agreements
                <KeyboardHint keys="Esc" />
              </Link>
            </motion.div>

            {/* Header */}
            <motion.div variants={slideUp} className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                <div className="flex items-start gap-4">
                  <motion.div
                    whileHover={{ scale: 1.05, rotate: 3 }}
                    transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    className={cn(
                      "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm",
                      config.bg,
                      config.border
                    )}
                  >
                    <TemplateIcon className={cn("h-6 w-6", config.color)} />
                  </motion.div>
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-1">{deal.title}</h1>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline" className={cn("gap-1.5", config.bg, config.border, config.color)}>
                        <StatusIcon className="h-3 w-3" />
                        {config.label}
                      </Badge>
                      <CopyableId id={deal.publicId} />
                      <span className="text-xs text-muted-foreground hidden sm:inline">
                        • {timeAgo(deal.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 print:hidden">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleCopyLink}
                        className="gap-2"
                      >
                        {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                        <span className="hidden sm:inline">{copied ? "Copied" : "Copy"}</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Copy signing link <KeyboardHint keys="C" /></TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadPDF}
                        disabled={isGeneratingPDF}
                        className="gap-2"
                      >
                        {isGeneratingPDF ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        <span className="hidden sm:inline">PDF</span>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download PDF <KeyboardHint keys="D" /></TooltipContent>
                  </Tooltip>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-9 w-9">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-48">
                      <DropdownMenuItem onClick={() => setShowQRDialog(true)}>
                        <QrCode className="h-4 w-4 mr-2" />
                        Show QR Code
                        <KeyboardHint keys="Q" />
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handleShare}>
                        <Share2 className="h-4 w-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={handlePrint}>
                        <Printer className="h-4 w-4 mr-2" />
                        Print
                        <KeyboardHint keys="P" />
                      </DropdownMenuItem>
                      <DropdownMenuItem asChild>
                        <Link href={`/dashboard/verify?id=${deal.publicId}`}>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          Verify
                        </Link>
                      </DropdownMenuItem>
                      {accessToken && isCreator && deal.status === "confirmed" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              const accessUrl = `${window.location.origin}/d/public/${deal.publicId}?token=${accessToken}`;
                              copyToClipboard(accessUrl);
                              toast.success("Access link copied!");
                            }}
                          >
                            <Key className="h-4 w-4 mr-2" />
                            Copy Access Link
                          </DropdownMenuItem>
                        </>
                      )}
                      {isCreator && deal.status === "pending" && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setShowVoidDialog(true)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Void Deal
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            </motion.div>

            {/* Multi-Card Layout */}
            <div className="space-y-4">
              {/* Status Alert Card */}
              <AnimatePresence>
                {deal.status === "pending" && isCreator && (
                  <motion.div variants={slideUp}>
                    <Card className="border border-amber-500/30 shadow-sm bg-card rounded-xl overflow-hidden">
                      <motion.div
                        className="h-1.5 w-full bg-amber-500"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ transformOrigin: "left" }}
                      />
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between flex-wrap gap-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                              <Clock className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">{config.description}</p>
                              <p className="text-xs text-muted-foreground">
                                {deal.recipientEmail ? `Waiting for ${deal.recipientEmail}` : "Share the link with your recipient"}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {deal.recipientEmail && (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleSendNudge}
                                    disabled={isSendingNudge}
                                    className="gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                                  >
                                    {isSendingNudge ? (
                                      <RefreshCw className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Zap className="h-4 w-4" />
                                    )}
                                    <span className="hidden sm:inline">Nudge</span>
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Send reminder email</TooltipContent>
                              </Tooltip>
                            )}
                            <Button size="sm" onClick={handleCopyLink} className="gap-2 bg-amber-600 hover:bg-amber-700 text-white">
                              <Mail className="h-4 w-4" />
                              <span className="hidden sm:inline">Send Link</span>
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {deal.status === "confirmed" && deal.confirmedAt && (
                  <motion.div variants={slideUp}>
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
                                Agreement Sealed
                                <CheckCircle2 className="h-4 w-4" />
                              </p>
                              <p className="text-xs text-muted-foreground">Signed on {formatDateTime(deal.confirmedAt)}</p>
                            </div>
                          </div>
                          <Link href={`/dashboard/verify?id=${deal.publicId}`}>
                            <Button variant="outline" size="sm" className="gap-2 border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/10">
                              <ShieldCheck className="h-4 w-4" />
                              Verify
                              <ExternalLink className="h-3 w-3" />
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}

                {deal.status === "voided" && (
                  <motion.div variants={slideUp}>
                    <Card className="border border-destructive/30 shadow-sm bg-card rounded-xl overflow-hidden">
                      <motion.div
                        className="h-1.5 w-full bg-destructive"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.5, ease: "easeOut" }}
                        style={{ transformOrigin: "left" }}
                      />
                      <CardContent className="p-5">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-lg bg-destructive/20 flex items-center justify-center">
                            <XCircle className="h-5 w-5 text-destructive" />
                          </div>
                          <div>
                            <p className="font-medium text-sm text-destructive">Deal Voided</p>
                            <p className="text-xs text-muted-foreground">This agreement is no longer valid</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Shared Deal View - Parties, Terms, Signature & Seal */}
              <SealedDealView
                deal={deal}
                creatorProfile={creatorProfile}
                recipientProfile={recipientProfile}
              />

              {/* Audit Timeline */}
              <div className="pt-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAuditTrail(!showAuditTrail)}
                  className="text-muted-foreground hover:text-foreground flex items-center gap-2 mb-4"
                >
                  <ChevronRight className={cn("h-4 w-4 transition-transform", showAuditTrail && "rotate-90")} />
                  {showAuditTrail ? "Hide" : "Show"} Audit Trail
                  <KeyboardHint keys="A" />
                </Button>

                <AnimatePresence>
                  {showAuditTrail && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <AuditTimeline logs={auditLogs} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
          </div>
        </main>

        {/* Dialogs */}
        <AlertDialog open={showVoidDialog} onOpenChange={setShowVoidDialog}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This will void the agreement for all parties. Recipient will no longer be able to sign it. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleVoidDeal}
                disabled={isVoiding}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isVoiding ? "Voiding..." : "Yes, void deal"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={showQRDialog} onOpenChange={setShowQRDialog}>
          <DialogContent className="sm:max-w-xs">
            <DialogHeader>
              <DialogTitle className="text-center">Scan to Sign</DialogTitle>
              <DialogDescription className="text-center">
                Share this QR code with the recipient.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col items-center justify-center p-6 space-y-4">
              <div className="p-3 bg-white rounded-2xl shadow-sm border">
                <QRCodeSVG value={signingLink} size={200} />
              </div>
              <p className="text-[10px] font-mono text-muted-foreground truncate w-full text-center">
                {deal.publicId}
              </p>
              <Button variant="outline" className="w-full" onClick={handleCopyLink}>
                Copy Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
