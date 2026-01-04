"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Check,
  Copy,
  Share2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  FileCheck,
  AlertCircle,
  ChevronLeft,
  Users,
  User,
  Inbox,
  Clock,
  Sparkles,
  CheckCircle2,
  Send,
  FileText,
  LayoutTemplate,
  Shield,
  PanelLeftClose,
  PanelLeftOpen,
  Download,
  Bell,
  Loader2,
  QrCode,
  SquarePen,
  Fingerprint,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { dealTemplates } from "@/lib/templates";
import { DealTemplate, TemplateField, Deal, TrustLevel } from "@/types";
import { useAppStore, createNewDeal } from "@/store";
import { createDealAction, getDealByIdAction, lookupUserByEmailAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LoginModal } from "@/components/login-modal";
import { cn, getUserInitials } from "@/lib/utils";
import { DealHeader } from "@/components/deal-header";
import { SidebarLogo } from "@/components/sidebar-logo";
import { SidebarNavItem } from "@/components/sidebar-nav-item";
import { CopyableId } from "@/components/dashboard/shared-components";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import {
  slideUp,
  springContainerVariants,
  shakeVariant,
} from "@/lib/dashboard-ui";
import { iconMap } from "@/lib/templates";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { generateDealPDF, downloadPDF, generatePDFFilename } from "@/lib/pdf";
import { SealedDealView } from "@/components/sealed-deal-view";
import { formatDateTime } from "@/lib/crypto";
import { TrustLevelSelector, trustLevelConfig } from "@/components/trust-level-selector";


// --- CONFIGURATION ---

const templateMetadata: Record<string, { category: string }> = {
  "lend-item": { category: "Personal" },
  "simple-agreement": { category: "General" },
  "payment-promise": { category: "Financial" },
  "service-exchange": { category: "Services" },
  custom: { category: "General" },
};

// Local animation and icon definitions replaced by shared ones

type Step = "template" | "details" | "review" | "share";

const stepInfo = {
  template: {
    number: 1,
    title: "Select Template",
    description: "Choose agreement type",
    icon: LayoutTemplate,
  },
  details: {
    number: 2,
    title: "Enter Details",
    description: "Fill required terms",
    icon: SquarePen,
  },
  review: {
    number: 3,
    title: "Verification",
    description: "Review and create",
    icon: Fingerprint,
  },
  share: {
    number: 4,
    title: "Secure Share",
    description: "Send to recipient",
    icon: QrCode,
  },
};

// Formatting utilities
const formatCurrency = (val: string) => {
  if (!val) return "";
  const num = val.replace(/[^0-9.]/g, "");
  if (!num) return "";
  const parts = num.split(".");
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return parts.join(".");
};

const STEPS: Step[] = ["template", "details", "review", "share"];

function NewDealContent() {
  const { user, addDeal, addAuditLog, getDealById, isSidebarCollapsed, setIsSidebarCollapsed } = useAppStore();

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };
  const searchParams = useSearchParams();
  const sourceId = searchParams.get("source");

  const [currentStep, setCurrentStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<DealTemplate | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [recipientEmail, setRecipientEmail] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);
  const [createdDeal, setCreatedDeal] = useState<Deal | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [expandedTemplates, setExpandedTemplates] = useState<Record<string, boolean>>({});
  const [pendingDealCreation, setPendingDealCreation] = useState(false);
  const [shake, setShake] = useState(false);
  const [reviewId] = useState(() => Date.now().toString(36).toUpperCase());
  const [restored, setRestored] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [registeredRecipient, setRegisteredRecipient] = useState<{
    id: string;
    name: string;
    avatarUrl?: string;
  } | null>(null);
  const [isLookingUpEmail, setIsLookingUpEmail] = useState(false);
  const [trustLevel, setTrustLevel] = useState<TrustLevel>("basic");
  const { copyToClipboard } = useCopyToClipboard();

  const dealCreationInProgressRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);



  // Auto-focus first input when entering details step
  useEffect(() => {
    if (currentStep === "details") {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [currentStep]);

  // Debounced email lookup for registered recipients
  useEffect(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!recipientEmail || !emailRegex.test(recipientEmail)) {
      setRegisteredRecipient(null);
      return;
    }

    // Prevent self-deals - don't match with your own email
    if (user?.email && recipientEmail.toLowerCase().trim() === user.email.toLowerCase()) {
      setRegisteredRecipient(null);
      toast.error("You can't create a deal with yourself", {
        description: "Please enter a different recipient email.",
      });
      setRecipientEmail("");
      return;
    }

    const debounceTimer = setTimeout(async () => {
      setIsLookingUpEmail(true);
      try {
        const result = await lookupUserByEmailAction(recipientEmail);
        if (result.found && result.profile) {
          // Double-check the profile isn't the current user (in case user object wasn't available earlier)
          if (result.profile.id === user?.id) {
            setRegisteredRecipient(null);
          } else {
            setRegisteredRecipient(result.profile);
            // Auto-fill name if empty or user hasn't typed anything
            if (!recipientName || recipientName === "") {
              setRecipientName(result.profile.name);
            }
          }
        } else {
          setRegisteredRecipient(null);
        }
      } catch {
        setRegisteredRecipient(null);
      } finally {
        setIsLookingUpEmail(false);
      }
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [recipientEmail, user?.email, user?.id, recipientName]);

  // Scroll to top on step change for mobile
  useEffect(() => {
    topRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [currentStep]);

  // Confetti on success
  useEffect(() => {
    if (currentStep === "share") {
       confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 }
       });
    }
  }, [currentStep]);

  // Restoration Logic
  useEffect(() => {
    if (!user && (selectedTemplate || recipientName || recipientEmail || Object.keys(formData).length > 0)) {
      const progressData = {
        selectedTemplate: selectedTemplate?.id,
        recipientName,
        recipientEmail,
        formData,
        timestamp: Date.now(),
      };
      localStorage.setItem("proofo-guest-form-progress", JSON.stringify(progressData));
    }
  }, [selectedTemplate, recipientName, recipientEmail, formData, user]);

  useEffect(() => {
    if (!user && !sourceId) {
      const savedProgress = localStorage.getItem("proofo-guest-form-progress");
      if (savedProgress) {
        try {
          const progress = JSON.parse(savedProgress);
          if (Date.now() - progress.timestamp < 86400000) {
            let restoredAny = false;
            if (progress.selectedTemplate) {
              const template = dealTemplates.find((t) => t.id === progress.selectedTemplate);
              if (template) {
                setSelectedTemplate(template);
                setCurrentStep("details");
                restoredAny = true;
              }
            }
            if (progress.recipientName) { setRecipientName(progress.recipientName); restoredAny = true; }
            if (progress.recipientEmail) { setRecipientEmail(progress.recipientEmail); restoredAny = true; }
            if (progress.formData) { setFormData(progress.formData); restoredAny = true; }

            if (restoredAny && !restored) {
               setRestored(true);
               toast("Draft Restored", { description: "We brought back your previous work." });
            }
          } else {
            localStorage.removeItem("proofo-guest-form-progress");
          }
        } catch (e) {
          console.error("Failed to restore form progress", e);
        }
      }
    }
  }, [user, sourceId, restored]);

  // Unsaved Changes Guard
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if ((currentStep === "details" || currentStep === "review") && !createdDeal) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [currentStep, createdDeal]);

  useEffect(() => {
    if (createdDeal && currentStep === "share") {
      localStorage.removeItem("proofo-guest-form-progress");
    }
  }, [createdDeal, currentStep]);

  useEffect(() => {
    if (!sourceId) return;
    const prefillFromDeal = (deal: Deal) => {
      const template = dealTemplates.find((t) => t.id === deal.templateId);
      if (template) {
        setSelectedTemplate(template);
        const data: Record<string, string> = {};
        deal.terms.forEach((term) => {
          const field = template.fields.find((f) => f.label === term.label);
          if (field) {
            const value = term.value.startsWith("$") ? term.value.slice(1) : term.value;
            data[field.id] = value;
          }
        });
        setFormData(data);
        setRecipientName(deal.recipientName || "");
        setRecipientEmail(deal.recipientEmail || "");
        setCurrentStep("details");
      }
    };

    const loadSourceDeal = async () => {
      if (isSupabaseConfigured()) {
        const { deal: sourceDeal } = await getDealByIdAction(sourceId);
        if (sourceDeal) {
          prefillFromDeal(sourceDeal);
          return;
        }
      }
      const localDeal = getDealById(sourceId);
      if (localDeal) prefillFromDeal(localDeal);
    };
    loadSourceDeal();
  }, [sourceId, getDealById]);

  const dealLink = shareUrl || (createdDeal ? typeof window !== "undefined" ? `${window.location.origin}/d/public/${createdDeal.publicId}` : `https://proofo.app/d/public/${createdDeal.publicId}` : "");

  const handleDownloadPDF = async () => {
    if (!createdDeal) return;
    setIsGeneratingPDF(true);
    try {
      const verificationUrl = typeof window !== "undefined"
        ? `${window.location.origin}/verify?id=${createdDeal.publicId}`
        : `https://proofo.app/verify?id=${createdDeal.publicId}`;

      const { pdfBlob } = await generateDealPDF({
        deal: createdDeal,
        isPro: user?.isPro || false,
        verificationUrl,
      });

      const filename = generatePDFFilename(createdDeal);
      downloadPDF(pdfBlob, filename);
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const copyToClipboardHandler = useCallback(() => {
    copyToClipboard(dealLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success("Link copied!");
  }, [copyToClipboard, dealLink]);

  const handleCreateDeal = useCallback(async () => {
    if (!selectedTemplate) return;
    setIsCreating(true);
    setCreateError(null);

    const terms = selectedTemplate.fields
      .filter((field) => formData[field.id])
      .map((field) => ({
        label: field.label,
        value: field.type === "currency" ? `$${formData[field.id]}` : formData[field.id],
        type: field.type === "textarea" ? "text" : field.type,
      }));

    if (!user) {
      setCreateError("Sign in required");
      setIsCreating(false);
      return;
    }

    const isRealUser = isSupabaseConfigured() && user?.id && !user.id.startsWith("demo-");

    if (isRealUser) {
      const { deal, shareUrl: serverShareUrl, error } = await createDealAction({
        title: selectedTemplate.name,
        description: `${selectedTemplate.name} agreement with ${recipientName}`,
        templateId: selectedTemplate.id,
        recipientName,
        recipientEmail: recipientEmail || undefined,
        recipientId: registeredRecipient?.id,
        terms,
        trustLevel,
      });

      if (error || !deal) {
        setCreateError(error || "Failed to create deal");
        setIsCreating(false);
        setShake(true);
        setTimeout(() => setShake(false), 500);
        return;
      }
      addDeal(deal);
      setCreatedDeal(deal);
      setShareUrl(serverShareUrl || "");
    } else {
      const newDeal = createNewDeal(user, {
        templateId: selectedTemplate.id,
        title: selectedTemplate.name,
        recipientName,
        terms,
        description: `${selectedTemplate.name} agreement with ${recipientName}`,
      });
      addDeal(newDeal);
      addAuditLog({
        dealId: newDeal.id,
        eventType: "deal_created",
        actorId: user.id,
        actorType: "creator",
        metadata: { templateId: selectedTemplate.id, recipientName },
      });
      setCreatedDeal(newDeal);
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(`${baseUrl}/d/public/${newDeal.publicId}`);
    }
    setIsCreating(false);
    setCurrentStep("share");
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 },
      colors: ["#22c55e", "#10b981", "#34d399", "#A7F3D0"],
      gravity: 1.2,
      drift: 0,
      ticks: 300
    });
  }, [user, selectedTemplate, recipientName, recipientEmail, formData, addDeal, addAuditLog, registeredRecipient, trustLevel]);

  const handleNext = useCallback(() => {
    if (currentStep === "details") {
       if (!recipientName) {
         setShake(true);
         setTimeout(() => setShake(false), 500);
         toast.error("Please enter a recipient name.");
         return;
       }
       setCurrentStep("review");
    }
    else if (currentStep === "review") {
      if (!user) {
        setPendingDealCreation(true);
        setShowLoginModal(true);
      } else {
        handleCreateDeal();
      }
    }
  }, [currentStep, user, handleCreateDeal, recipientName]);

  const handleBack = useCallback(() => {
    if (currentStep === "details") {
      setCurrentStep("template");
      setSelectedTemplate(null);
    } else if (currentStep === "review") {
      setCurrentStep("details");
    } else if (currentStep === "share") {
       setCurrentStep("template");
       setSelectedTemplate(null);
       setRecipientName("");
       setFormData({});
       setCreatedDeal(null);
    }
  }, [currentStep]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleGlobalKeys = (e: KeyboardEvent) => {
      // Cmd+Enter / Ctrl+Enter to proceed
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
        e.preventDefault();
        if (currentStep === "details" || currentStep === "review") {
          handleNext();
        }
      }
      // Esc to go back (unless in inputs, checking logic inside)
      if (e.key === "Escape") {
         if (currentStep !== "template" && currentStep !== "share") {
            handleBack();
         }
      }
      /* Simple Enter logic already in inputs */
    };
    window.addEventListener("keydown", handleGlobalKeys);
    return () => window.removeEventListener("keydown", handleGlobalKeys);
  }, [currentStep, handleNext, handleBack]);

  // Stepper Navigation
  const handleStepClick = useCallback((step: Step) => {
    const stepIdx = STEPS.indexOf(step);
    const currentIdx = STEPS.indexOf(currentStep);

    // Only allow going back or to current step
    if (stepIdx <= currentIdx) {
        if (currentStep === 'share') return;
        if (step === 'template') setSelectedTemplate(null);
        setCurrentStep(step);
    }
  }, [currentStep]);

  useEffect(() => {
    if (pendingDealCreation && user && !dealCreationInProgressRef.current) {
      dealCreationInProgressRef.current = true;
      // Use setTimeout to avoid synchronous state update in effect
      setTimeout(() => {
        setPendingDealCreation(false);
        handleCreateDeal();
      }, 0);
    }
  }, [user, pendingDealCreation, handleCreateDeal]);

  const handleTemplateSelect = (template: DealTemplate) => {
    setSelectedTemplate(template);
    const initialData: Record<string, string> = {};
    template.fields.forEach((field) => {
      initialData[field.id] = field.defaultValue || "";
    });
    setFormData(initialData);
    setCurrentStep("details");
  };

  const handleFieldChange = (fieldId: string, value: string, type?: string) => {
    let finalValue = value;
    if (type === "currency") {
       finalValue = formatCurrency(value);
    }
    setFormData((prev) => ({ ...prev, [fieldId]: finalValue }));
  };



  const handleShare = async () => {
    if (navigator.share && createdDeal && user) {
      try {
        await navigator.share({
          title: `${selectedTemplate?.name} - Proofo`,
          text: `Review and sign: ${selectedTemplate?.name}`,
          url: dealLink,
        });
      } catch {
        copyToClipboardHandler();
      }
    } else {
      copyToClipboardHandler();
    }
  };

  const renderField = (field: TemplateField) => {
    const commonProps = {
      id: field.id,
      value: formData[field.id] || "",
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => handleFieldChange(field.id, e.target.value, field.type),
      placeholder: field.placeholder,
      "aria-required": field.required,
      className: cn(
        "h-10 rounded-xl bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all duration-200 shadow-sm",
        (field.type === "currency" || field.type === "number" || field.type === "date") && "tabular-nums"
      )
    };

    switch (field.type) {
      case "textarea":
        return <Textarea {...commonProps} className={cn(commonProps.className, "min-h-[100px] resize-none leading-relaxed")} />;
      case "date":
        return <Input {...commonProps} type="date" />;
      case "number":
        return <Input {...commonProps} type="number" />;
      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground font-medium pointer-events-none">$</span>
            <Input {...commonProps} type="text" inputMode="decimal" className={cn(commonProps.className, "pl-8")} />
            {/* Valid Indicator */}
            {formData[field.id] && (
               <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                  <Check className="h-4 w-4" />
               </motion.div>
            )}
          </div>
        );
      default:
        // Text inputs with validation check
        const hasContent = formData[field.id]?.length > 2;
        return (
          <div className="relative">
             <Input {...commonProps} />
             <AnimatePresence>
               {hasContent && (
                  <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                     <Check className="h-4 w-4" />
                  </motion.div>
               )}
             </AnimatePresence>
          </div>
        );
    }
  };

  const currentStepIndex = STEPS.indexOf(currentStep);

  return (
    <TooltipProvider delayDuration={0}>
    <div className="h-screen flex w-full overflow-hidden bg-background" ref={topRef}>
        {/* Progress Sidebar */}
        <motion.aside
          initial={false}
          animate={{
            width: isSidebarCollapsed ? 80 : 280,
          }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="hidden lg:flex flex-col border-r bg-card dark:bg-card/50 backdrop-blur-xl z-40 shrink-0"
        >
          {/* Logo Area */}
          <SidebarLogo isCollapsed={isSidebarCollapsed} />

            <nav className="flex-1 px-3 py-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar relative">

            {STEPS.map((step, index) => {
              const isCompleted = currentStepIndex > index;
              const isCurrent = currentStep === step;
              const canNavigate = STEPS.indexOf(step) <= currentStepIndex && currentStep !== "share";

              return (
                <SidebarNavItem
                  key={step}
                  label={stepInfo[step as Step].title}
                  icon={stepInfo[step as Step].icon}
                  index={index}
                  isActive={isCurrent}
                  isCollapsed={isSidebarCollapsed}
                  isCompleted={isCompleted}
                  onClick={() => canNavigate && handleStepClick(step)}
                  className={cn(!canNavigate && "opacity-50 cursor-not-allowed")}
                />
              );
            })}

            {/* Active indicator dot - single element that travels between steps */}
            {!isSidebarCollapsed && (() => {
              const activeIndex = currentStepIndex;
              if (activeIndex === -1) return null;
              // Each nav item is h-10 (40px) + gap-1 (4px)
              const itemHeight = 44;
              const navPaddingTop = 24; // py-6 = 24px
              const dotY = navPaddingTop + activeIndex * itemHeight + 20;
              return (
                <motion.div
                  className="absolute right-6 w-1.5 h-1.5 rounded-full bg-primary pointer-events-none"
                  initial={false}
                  animate={{ top: dotY }}
                  transition={{
                    type: "spring",
                    stiffness: 300,
                    damping: 30,
                  }}
                  style={{ marginTop: -3 }}
                />
              );
            })()}

            {/* Agreement Progress Label - Inside Nav, under items */}
            <div className="px-3 mt-6 mb-2">
              {isSidebarCollapsed ? (
                <div className="flex justify-center h-4 items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Step
                  </span>
                </div>
              ) : (
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60 flex justify-between items-center">
                  <span>Agreement Progress</span>
                  <span className="font-mono opacity-50">({currentStepIndex + 1}/{STEPS.length})</span>
                </h2>
              )}
            </div>
          </nav>

          {/* Footer Actions - Matching Dashboard */}
          <div className="p-3 space-y-3 shrink-0">

            {/* Security Label - Anchors position */}
            <div className="px-3 mb-1">
              {isSidebarCollapsed ? (
                <div className="flex justify-center h-4 items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Sec
                  </span>
                </div>
              ) : (
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Security
                </h2>
              )}
            </div>

            {/* Secure & Immutable Agreements (Banner Style) */}
            <div
              className={cn(
                "rounded-xl bg-linear-to-br from-emerald-500/5 via-emerald-500/10 to-transparent border border-emerald-500/10 transition-all duration-300 overflow-hidden",
                isSidebarCollapsed ? "p-0" : "p-4"
              )}
            >
              {isSidebarCollapsed ? (
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <div className="w-full h-10 flex items-center justify-center shrink-0">
                      <div className="w-8 h-8 flex items-center justify-center shrink-0">
                        <Shield className="h-4 w-4 text-emerald-500" />
                      </div>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right">Secure & Immutable Agreements</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 flex items-center justify-center shrink-0">
                      <div className="p-1.5 rounded-lg bg-background shadow-sm">
                        <Shield className="h-3.5 w-3.5 text-emerald-500" />
                      </div>
                    </div>
                    <span className="text-[10px] font-bold uppercase tracking-tight text-emerald-600">Secure Protocol</span>
                  </div>
                  <div className="pl-11 pr-2">
                    <p className="text-[10px] text-muted-foreground leading-relaxed">
                      Agreements on Proofo are sealed with cryptographic proofs, making them cryptographically verifiable & immutable.
                    </p>
                  </div>
                </>
              )}
            </div>

            <div className="border-t border-border/40 pt-3">
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start h-10 px-3 rounded-xl text-muted-foreground hover:text-foreground transition-all duration-200"
                onClick={toggleSidebar}
              >
                <div className="w-8 h-8 flex items-center justify-center shrink-0">
                  {isSidebarCollapsed ? (
                    <PanelLeftOpen className="h-4.5 w-4.5" />
                  ) : (
                    <PanelLeftClose className="h-4.5 w-4.5" />
                  )}
                </div>
                <AnimatePresence mode="popLayout">
                  {!isSidebarCollapsed && (
                    <motion.span
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -10 }}
                      className="ml-3 text-sm font-medium"
                    >
                      Collapse
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </div>

          </div>
        </motion.aside>

        <div className="flex flex-col flex-1 min-w-0 h-full relative">
          <DealHeader title="New Agreement" hideLogo />

          <main className="flex-1 overflow-y-auto p-3 sm:p-8 pb-16 lg:pb-8 w-full scroll-smooth">
            <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start justify-center">
              <div className="flex-1 w-full min-w-0">
                {/* Mobile Header (Progress simplified) */}
                <div className="lg:hidden mb-6 flex items-center justify-between">
                  <div>
                    <h1 className="text-2xl font-bold tracking-tight">New Agreement</h1>
                    <div className="text-sm text-muted-foreground flex items-center gap-2 mt-1">
                      Step {currentStepIndex + 1} of {STEPS.length}: <span className="font-medium text-foreground">{stepInfo[currentStep].title}</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
                    {currentStepIndex + 1}/{STEPS.length}
                  </div>
                </div>

                <AnimatePresence mode="wait">
                  {/* STEP 1: TEMPLATE SELECTION */}
                  {currentStep === "template" && (
                    <motion.div
                      key="template"
                      variants={springContainerVariants}
                      initial="hidden" animate="show" exit="exit"
                      className="space-y-4 sm:space-y-6"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-6">
                        {dealTemplates.map((template, idx) => {
                          const Icon = iconMap[template.icon] || FileCheck;
                          return (
                            <motion.div
                              key={template.id}
                              variants={slideUp}
                              custom={idx}
                              layout
                              className="h-full"
                            >
                              <div
                                className="group h-full flex flex-col overflow-hidden bg-card border hover:border-primary/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative cursor-pointer"
                                onClick={() => handleTemplateSelect(template)}
                                tabIndex={0}
                                role="button"
                                aria-label={`Select ${template.name} template`}
                                onKeyDown={(e) => e.key === "Enter" && handleTemplateSelect(template)}
                              >
                                <div className="flex flex-col h-full">
                                  <div className="flex-1 p-4 pb-0 flex flex-col">
                                    {/* Header */}
                                    <div className="flex justify-between items-start mb-4">
                                      <div
                                        className={cn(
                                          "h-10 w-10 rounded-lg flex items-center justify-center transition-colors border shadow-sm",
                                          "bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20"
                                        )}
                                      >
                                        <Icon className="h-5 w-5" />
                                      </div>
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 font-medium bg-background text-muted-foreground border-border/50"
                                      >
                                        {templateMetadata[template.id]?.category || "General"}
                                      </Badge>
                                    </div>

                                    {/* Content */}
                                    <div className="mb-4 min-h-[4rem]">
                                      <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">
                                        {template.name}
                                      </h3>
                                      <p className="text-sm text-muted-foreground line-clamp-2">
                                        {template.description}
                                      </p>
                                    </div>

                                    {/* Field Tags */}
                                    <div className="flex flex-wrap gap-1.5 mb-4 content-start flex-1 items-start">
                                      {(expandedTemplates[template.id] ? template.fields : template.fields.slice(0, 3)).map((field) => (
                                        <Badge
                                          key={field.id}
                                          variant="secondary"
                                          className="text-[10px] px-1.5 py-0.5 font-normal bg-secondary/30 text-muted-foreground border border-transparent group-hover:border-border/50 transition-colors h-6 flex items-center"
                                        >
                                          {field.label}
                                        </Badge>
                                      ))}
                                      {!expandedTemplates[template.id] && template.fields.length > 3 && (
                                        <Badge
                                          variant="outline"
                                          className="text-[10px] px-1.5 py-0.5 font-normal text-muted-foreground border-dashed h-6 flex items-center cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setExpandedTemplates(prev => ({ ...prev, [template.id]: true }));
                                          }}
                                        >
                                          +{template.fields.length - 3}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>

                                  {/* Footer Action Bar */}
                                  <div className="mt-auto px-4 py-3 flex items-center justify-between">
                                    <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
                                      Use Template
                                    </span>
                                    <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/50 group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: DETAILS */}
                  {currentStep === "details" && selectedTemplate && (
                    <motion.div
                      key="details"
                      variants={springContainerVariants}
                      initial="hidden" animate="show" exit="exit"
                      className="space-y-6"
                    >
                      {/* Parties Card */}
                      <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                        <div className="p-5 md:p-6">
                          <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                            <Users className="h-4 w-4" /> Parties Involved
                          </div>

                          <div className="grid sm:grid-cols-2 gap-4">
                            {/* Creator / Issuer (Static in this step) */}
                            <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-medium text-sm shadow-sm">
                                {getUserInitials(user?.name || "G U")}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-sm truncate">{user?.name || "Guest User"}</span>
                                  <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold uppercase tracking-tight bg-primary/10 text-primary border-primary/20">
                                    Creator
                                  </Badge>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Send className="h-2.5 w-2.5" />
                                  Issuer
                                </div>
                              </div>
                            </div>

                            {/* Recipient (Input) */}
                            <div className={cn(
                              "p-4 rounded-xl bg-background border shadow-sm flex flex-col gap-3 transition-colors",
                              registeredRecipient ? "border-emerald-500/40" : "border-primary/20"
                            )}>
                              <div className="flex items-center gap-2">
                                {/* Avatar with registered user ring */}
                                <div className="relative">
                                  {registeredRecipient?.avatarUrl ? (
                                    // eslint-disable-next-line @next/next/no-img-element
                                    <img
                                      src={registeredRecipient.avatarUrl}
                                      alt={registeredRecipient.name}
                                      className={cn(
                                        "h-8 w-8 rounded-full object-cover",
                                        registeredRecipient && "ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                                      )}
                                    />
                                  ) : (
                                    <div className={cn(
                                      "h-8 w-8 rounded-full flex items-center justify-center font-medium text-xs",
                                      registeredRecipient
                                        ? "bg-emerald-500/20 text-emerald-600 ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                                        : "bg-muted text-muted-foreground"
                                    )}>
                                      {getUserInitials(recipientName) || <User className="h-4 w-4" />}
                                    </div>
                                  )}
                                  {isLookingUpEmail && (
                                    <div className="absolute -right-0.5 -bottom-0.5 h-3 w-3 rounded-full bg-background flex items-center justify-center">
                                      <Loader2 className="h-2.5 w-2.5 animate-spin text-muted-foreground" />
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{recipientName || "Recipient"}</span>
                                    {registeredRecipient ? (
                                      <Badge variant="secondary" className="h-4 px-1.5 text-[9px] font-bold uppercase tracking-tight bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                                        Proofo User
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="h-4 px-1 text-[9px] font-bold uppercase tracking-tight">
                                        Recipient
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                                    <Inbox className="h-2.5 w-2.5" />
                                    {registeredRecipient ? "Will be notified in-app" : "Signer"}
                                  </div>
                                </div>
                              </div>

                              <div className="space-y-2.5 pt-0.5">
                                {/* Email first */}
                                <div className="grid gap-1.5">
                                  <Label htmlFor="recipientEmail" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1">Email</Label>
                                  <div className="relative">
                                    <Input
                                      id="recipientEmail"
                                      ref={firstInputRef}
                                      type="email"
                                      placeholder="email@example.com"
                                      value={recipientEmail}
                                      onChange={(e) => setRecipientEmail(e.target.value)}
                                      className={cn(
                                        "h-9 text-sm rounded-lg bg-muted/30 border-border focus:ring-1 transition-all",
                                        registeredRecipient && "border-emerald-500/30 bg-emerald-500/5"
                                      )}
                                    />
                                    {registeredRecipient && (
                                      <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500"
                                      >
                                        <Check className="h-4 w-4" />
                                      </motion.div>
                                    )}
                                  </div>
                                </div>
                                {/* Name second, with Required label */}
                                <div className="grid gap-1.5">
                                  <Label htmlFor="recipientName" className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground ml-1 flex items-center">
                                    Name <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-600 border border-red-500/20 font-bold ml-2 uppercase tracking-tight select-none">REQ</span>
                                  </Label>
                                  <Input
                                    id="recipientName"
                                    placeholder="e.g. John Doe"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className={cn(
                                      "h-9 text-sm rounded-lg bg-muted/30 border-border focus:ring-1 transition-all",
                                      shake && "border-destructive animate-pulse",
                                      registeredRecipient && "border-emerald-500/30 bg-emerald-500/5"
                                    )}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>

                      {/* Terms Card */}
                      <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                        <div className="p-5 md:p-6">
                          <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                            <FileText className="h-4 w-4" /> Agreement Terms
                          </div>

                          <div className="space-y-1.5 sm:space-y-2">
                            {selectedTemplate.fields.map((field) => (
                              <div key={field.id} className="group relative">
                                <div className="grid sm:grid-cols-2 gap-4 p-3 rounded-xl bg-secondary/20 transition-colors hover:bg-secondary/40 items-center">
                                  <div className="flex items-start gap-3">
                                    <div className="mt-1 h-5 w-5 rounded bg-background border border-border/50 flex items-center justify-center shrink-0">
                                      {formData[field.id] && (
                                        <motion.div
                                          initial={{ scale: 0 }}
                                          animate={{ scale: 1 }}
                                          className="h-1.5 w-1.5 rounded-full bg-primary"
                                        />
                                      )}
                                    </div>
                                    <Label htmlFor={field.id} className="text-sm font-medium pt-1 cursor-pointer flex items-center gap-2">
                                      {field.label} {field.required && <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-red-500/10 text-red-600 border border-red-500/20 font-bold uppercase tracking-tight select-none">REQ</span>}
                                    </Label>
                                  </div>
                                  <div className="w-full">
                                    {renderField(field)}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Card>

                      {/* Trust Level Card */}
                      <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                        <div className="p-5 md:p-6">
                          <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                            <ShieldCheck className="h-4 w-4" /> Verification Level
                          </div>
                          <p className="text-xs text-muted-foreground mb-4">
                            Choose how recipients verify their identity before signing
                          </p>
                          <TrustLevelSelector
                            value={trustLevel}
                            onChange={(level) => {
                              setTrustLevel(level);
                            }}
                          />
                        </div>
                      </Card>

                      {/* Action Buttons (Outside) */}
                      <div className="flex justify-between items-center pt-2">
                        <Button variant="ghost" onClick={handleBack} className="hover:bg-muted">
                          <ChevronLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        <motion.div variants={shakeVariant} animate={shake ? "shake" : ""}>
                          <Button
                            onClick={handleNext}
                            className="shadow-sm bg-foreground hover:bg-foreground/90 text-background px-8 h-10 rounded-lg font-medium transition-all hover:translate-y-[-1px] active:translate-y-[1px]"
                          >
                            Review & Create <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 3: REVIEW */}
                  {currentStep === "review" && (
                    <motion.div
                      key="review"
                      variants={springContainerVariants}
                      initial="hidden" animate="show" exit="exit"
                      className="space-y-6"
                    >
                      {/* Page Header (Matching Unified Style) */}
                      <div className="mb-0">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl flex items-center justify-center shrink-0 border shadow-sm bg-secondary/30 border-border/50">
                              <ShieldCheck className="h-6 w-6 text-foreground" />
                            </div>
                            <div>
                              <div className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground mb-1">Draft Agreement</div>
                              <h1 className="text-xl sm:text-3xl font-bold tracking-tight mb-1">{selectedTemplate?.name}</h1>
                              <div className="flex items-center gap-2 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "gap-1.5 border-border/50",
                                    trustLevelConfig[trustLevel].bgColor,
                                    trustLevelConfig[trustLevel].color,
                                    trustLevelConfig[trustLevel].borderColor
                                  )}
                                >
                                  {trustLevelConfig[trustLevel].label} Level
                                </Badge>
                                <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                  <Clock className="h-3 w-3" />
                                  {new Date().toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Parties Card */}
                      <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden mt-4 sm:mt-6">
                        <CardContent className="p-5 md:p-6">
                          <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                            <Users className="h-4 w-4" /> Parties
                          </div>
                          <div className="grid sm:grid-cols-2 gap-4">
                            {/* Issuer */}
                            <motion.div
                              whileHover={{ scale: 1.02 }}
                              transition={{ type: "spring", stiffness: 400, damping: 17 }}
                              className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default"
                            >
                              {user?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={user.avatarUrl}
                                  alt={user.name || "Creator"}
                                  className="h-10 w-10 rounded-full object-cover shadow-sm"
                                />
                              ) : (
                                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-medium text-sm shadow-sm">
                                  {getUserInitials(user?.name || "G U")}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{user?.name || "Guest User"}</p>
                                  <Badge variant="secondary" className="text-[10px] h-4 shrink-0 bg-primary/10 text-primary border-primary/20">Issuer</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
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
                                "flex items-center gap-3 p-4 rounded-xl border cursor-default",
                                registeredRecipient
                                  ? "bg-emerald-500/5 border-emerald-500/30"
                                  : "bg-secondary/30 border-border/50"
                              )}
                            >
                              {registeredRecipient?.avatarUrl ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={registeredRecipient.avatarUrl}
                                  alt={registeredRecipient.name}
                                  className="h-10 w-10 rounded-full object-cover ring-2 ring-emerald-500 ring-offset-2 ring-offset-background shadow-sm"
                                />
                              ) : (
                                <div className={cn(
                                  "h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm shadow-sm",
                                  registeredRecipient
                                    ? "bg-emerald-500/20 text-emerald-600 ring-2 ring-emerald-500 ring-offset-2 ring-offset-background"
                                    : "bg-muted text-muted-foreground"
                                )}>
                                  {getUserInitials(recipientName) || <User className="h-4 w-4" />}
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <p className="font-medium text-sm truncate">{recipientName || "Recipient"}</p>
                                  {registeredRecipient ? (
                                    <Badge variant="secondary" className="text-[10px] h-4 shrink-0 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 flex items-center gap-1">
                                      <Check className="h-2.5 w-2.5" />
                                      Proofo User
                                    </Badge>
                                  ) : (
                                    <Badge variant="outline" className="text-[10px] h-4 shrink-0">Recipient</Badge>
                                  )}
                                </div>
                                <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                  <Inbox className="h-3 w-3" />
                                  {registeredRecipient ? "Will be notified in-app" : "Signer"}
                                </p>
                              </div>
                            </motion.div>
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
                              {selectedTemplate?.fields.length} {selectedTemplate?.fields.length === 1 ? "term" : "terms"}
                            </Badge>
                          </div>

                          <div className="space-y-2">
                            {selectedTemplate?.fields.map((field, index) => {
                              const value = formData[field.id];
                              const isFilled = !!value;

                              return (
                                <motion.div
                                  key={field.id}
                                  initial={{ opacity: 0, x: -10 }}
                                  animate={{ opacity: 1, x: 0 }}
                                  transition={{ delay: index * 0.05 }}
                                  whileHover={isFilled ? { scale: 1.01 } : {}}
                                  className={cn(
                                    "flex items-center justify-between py-3 px-4 rounded-lg transition-all",
                                    isFilled
                                      ? "bg-secondary/20 hover:bg-secondary/40 cursor-pointer group/term"
                                      : "bg-secondary/5 opacity-40 cursor-default"
                                  )}
                                  onClick={() => {
                                    if (!isFilled) return;
                                    const displayVal = field.type === "currency" ? `$${value}` : value;
                                    navigator.clipboard.writeText(`${field.label}: ${displayVal}`);
                                    toast.success(`Copied: ${field.label}`);
                                  }}
                                >
                                  <span className={cn(
                                    "text-sm font-medium transition-all",
                                    isFilled ? "text-muted-foreground" : "text-muted-foreground/50 line-through decoration-muted-foreground/30"
                                  )}>
                                    {field.label}
                                  </span>
                                  <span className="font-medium text-sm text-foreground flex items-center gap-2">
                                    {isFilled ? (
                                      <>
                                        {field.type === "currency" && "$"}{value}
                                        <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover/term:opacity-100 transition-opacity" />
                                      </>
                                    ) : (
                                      <span className="text-[10px] uppercase tracking-wider opacity-30 font-bold italic">Omitted</span>
                                    )}
                                  </span>
                                </motion.div>
                              );
                            })}
                          </div>

                          {createError && (
                            <div className="mt-4 bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-top-1">
                              <AlertCircle className="h-5 w-5 shrink-0" />
                              <span className="font-medium">{createError}</span>
                            </div>
                          )}
                        </CardContent>
                        <div className="bg-muted/30 p-4 border-t border-border flex justify-between items-center backdrop-blur-sm">
                           <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                             <Globe className="h-3.5 w-3.5" />
                             <span>Proofo Managed Agreement</span>
                           </div>
                           <div className="text-[10px] font-mono opacity-50 uppercase tracking-wider">Draft: {reviewId}</div>
                         </div>
                      </Card>

                      {/* Action Buttons (Outside) */}
                      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 mx-auto">
                        <Button variant="outline" className="flex-1 h-11 rounded-lg border-border hover:bg-muted" onClick={handleBack} disabled={isCreating}>
                          Edit Details
                        </Button>
                        <motion.div className="flex-[2]" variants={shakeVariant} animate={shake ? "shake" : ""}>
                          <Button
                            className="w-full h-11 rounded-lg shadow-sm bg-foreground hover:bg-foreground/90 text-background text-base font-semibold transition-all hover:scale-[1.02] active:scale-[0.98]"
                            onClick={handleNext}
                            disabled={isCreating}
                          >
                            {isCreating ? (
                              <><span className="animate-spin mr-2">⏳</span> Minting...</>
                            ) : (
                              <>Generate Secure Link <ArrowRight className="ml-2 h-4 w-4" /></>
                            )}
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: SHARE */}
                  {currentStep === "share" && createdDeal && (
                    <motion.div
                      key="share"
                      variants={springContainerVariants}
                      initial="hidden" animate="show" exit="exit"
                      className="max-w-4xl mx-auto space-y-8 py-4 flex-1 w-full"
                    >
                      {/* Functional Success Header */}
                      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 border-b border-border pb-8">
                        <div className="flex items-start gap-5">
                          <motion.div
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ type: "spring", stiffness: 400, damping: 20 }}
                            className="h-14 w-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20 shadow-sm shrink-0"
                          >
                            <ShieldCheck className="h-8 w-8 text-emerald-600" />
                          </motion.div>
                          <div className="space-y-1.5">
                            <h1 className="text-3xl font-bold tracking-tight text-foreground">Agreement Ready!</h1>
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant="secondary" className="gap-1.5 h-6 px-3 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium rounded-full">
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                Sealed & Verified
                              </Badge>
                              <CopyableId id={createdDeal.publicId} className="bg-muted/50 border-border/50 h-6" />
                            </div>
                          </div>
                        </div>

                        {/* Top Actions */}
                        <div className="flex items-center gap-3 shrink-0">
                          <Button
                            variant="outline"
                            className="h-11 px-5 gap-2 border-border hover:bg-secondary/50 rounded-xl transition-all"
                            onClick={handleDownloadPDF}
                            disabled={isGeneratingPDF}
                          >
                            {isGeneratingPDF ? <Sparkles className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            <span>Download PDF</span>
                          </Button>
                          <Link href={`/verify?id=${createdDeal.publicId}`} target="_blank">
                            <Button variant="outline" className="h-11 px-5 gap-2 border-border hover:bg-secondary/50 rounded-xl transition-all">
                              <Shield className="h-4 w-4" />
                              <span>Verify</span>
                            </Button>
                          </Link>
                        </div>
                      </div>

                      {/* Main Success Content Grid */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4">
                        {/* QR Code & Digital Pass Card */}
                        <Card className="overflow-hidden border border-border shadow-sm rounded-2xl bg-card">
                          <CardContent className="p-0">
                             <div className="p-6 flex flex-col items-center bg-gradient-to-b from-card to-background">
                               <div className="p-4 rounded-2xl bg-white shadow-xl shadow-black/5 mb-4 border border-border/50">
                                 <QRCodeSVG value={dealLink} size={160} marginSize={2} bgColor="transparent" fgColor="#000" />
                               </div>
                               <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground uppercase tracking-widest px-4 py-1.5 rounded-full border border-border/50 bg-background/50">
                                 <Zap className="h-3 w-3 text-amber-500" /> Digital Sign Pass
                               </div>
                             </div>
                             <div className="p-4 bg-muted/30 border-t border-border/50 flex flex-col gap-0.5 items-center text-center">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Public Access Point</p>
                                <p className="text-[11px] font-mono text-foreground truncate w-full opacity-80">{dealLink}</p>
                             </div>
                          </CardContent>
                        </Card>

                        {/* Share & Dashboard Card */}
                        <div className="space-y-4">
                          <Card className="border border-emerald-500/30 shadow-sm bg-emerald-500/5 rounded-2xl overflow-hidden">
                            <CardContent className="p-5 space-y-4">
                              <div className="flex items-start gap-4">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
                                  <Sparkles className="h-5 w-5 text-emerald-600" />
                                </div>
                                <div className="space-y-1">
                                  <p className="font-semibold text-sm text-foreground">Created successfully</p>
                                  <p className="text-xs text-muted-foreground">
                                    {formatDateTime(new Date().toISOString())} • Logged to Audit Trail
                                  </p>
                                </div>
                              </div>
                              <Separator className="bg-emerald-500/10" />
                              <div className="relative group">
                                <Button
                                  variant="outline"
                                  className={cn(
                                    "w-full h-11 justify-between px-4 bg-background border-border/50 rounded-xl transition-all hover:border-primary/30",
                                    copied && "border-emerald-500/50 bg-emerald-50/50"
                                  )}
                                  onClick={copyToClipboardHandler}
                                >
                                  <div className="flex items-center gap-3 truncate">
                                    <Globe className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-xs font-mono text-muted-foreground truncate">{dealLink}</span>
                                  </div>
                                  <div className="flex items-center gap-2 shrink-0 ml-2">
                                    {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
                                    <span className="text-[10px] font-bold uppercase tracking-wider">{copied ? "Copied" : "Copy"}</span>
                                  </div>
                                </Button>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Recipient Notified Card - Only for registered recipients */}
                          {registeredRecipient && (
                            <motion.div
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ delay: 0.2 }}
                            >
                              <Card className="border border-sky-500/30 bg-sky-500/5 rounded-2xl overflow-hidden">
                                <CardContent className="p-5 flex items-center gap-4">
                                  <div className="h-10 w-10 rounded-xl bg-sky-500/20 flex items-center justify-center shrink-0">
                                    <Bell className="h-5 w-5 text-sky-600" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <p className="font-semibold text-sm text-foreground">Recipient notified in-app</p>
                                    <p className="text-xs text-muted-foreground">
                                      {registeredRecipient.name} will see this in their Inbox
                                    </p>
                                  </div>
                                  <Badge variant="secondary" className="shrink-0 bg-sky-500/10 text-sky-600 border-sky-500/20">
                                    Proofo User
                                  </Badge>
                                </CardContent>
                              </Card>
                            </motion.div>
                          )}

                          <div className="grid grid-cols-2 gap-3">
                            <Button
                              variant="outline"
                              className="h-12 gap-2 border-border hover:bg-secondary/50 rounded-xl font-medium transition-all"
                              onClick={handleShare}
                            >
                              <Share2 className="h-4 w-4" /> Share
                            </Button>
                            <Link href="/dashboard" className="w-full">
                              <Button className="h-12 w-full gap-2 rounded-xl bg-foreground text-background hover:bg-foreground/90 font-medium transition-all">
                                Go to Dashboard <ArrowRight className="h-4 w-4" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>

                      {/* Seal Preview Section */}
                      <div className="pt-8 space-y-6">
                        <div className="flex items-center gap-3">
                          <Separator className="flex-1" />
                          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-[0.2em] whitespace-nowrap">Sealed Agreement Preview</span>
                          <Separator className="flex-1" />
                        </div>

                        <div className="opacity-90 grayscale-[0.2] pointer-events-none scale-[0.98] origin-top">
                          <SealedDealView
                            deal={createdDeal}
                            creatorProfile={{ name: user?.name || "You" }}
                            recipientProfile={{ name: recipientName }}
                            isCreator={true}
                            isRecipient={false}
                            recipientStatusLabel="Pending Signature"
                            showSignatureSeal={false}
                          />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        title="Sign in to create your deal"
        description="To generate a secure, enforceable link, we need to verify your identity."
        onSuccess={() => setShowLoginModal(false)}
      />
    </div>
    </TooltipProvider>
  );
}

export default function NewDealPage() {
  return (
    <Suspense fallback={
       <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
          <div className="h-12 w-12 rounded-full border-4 border-muted border-t-foreground animate-spin" />
          <div className="text-sm font-medium text-muted-foreground animate-pulse">Loading experience...</div>
       </div>
    }>
      <NewDealContent />
    </Suspense>
  );
}
