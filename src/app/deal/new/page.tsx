"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { AnimatedLogo } from "@/components/animated-logo";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Check,
  Copy,
  Share2,
  Mail,
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
  LucideIcon,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  FileCheck,
  AlertCircle,
  ChevronLeft,
  Users
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { dealTemplates } from "@/lib/templates";
import { DealTemplate, TemplateField, Deal } from "@/types";
import { useAppStore, createNewDeal } from "@/store";
import { createDealAction, getDealByIdAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LoginModal } from "@/components/login-modal";
import { cn } from "@/lib/utils";
import { DealHeader } from "@/components/deal-header";
import { SidebarLogo } from "@/components/sidebar-logo";
import { SidebarNavItem } from "@/components/sidebar-nav-item";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
  LayoutTemplate,
  FileText,
  Shield,
  Send,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

// Enhanced Spring Physics for "Snappy" feel
const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const slideUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springTransition }
};

const shakeVariant = {
  shake: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.3 }
  }
};

const containerVariants = {
  hidden: { opacity: 0, scale: 0.98 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 400,
      damping: 30,
      staggerChildren: 0.05
    }
  },
  exit: {
    opacity: 0,
    scale: 0.98,
    transition: { duration: 0.15 }
  }
};

const iconMap: Record<string, LucideIcon> = {
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
};

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
    icon: FileText,
  },
  review: {
    number: 3,
    title: "Verification",
    description: "Review and create",
    icon: Shield,
  },
  share: {
    number: 4,
    title: "Secure Share",
    description: "Send to recipient",
    icon: Send,
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

const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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
  const [pendingDealCreation, setPendingDealCreation] = useState(false);
  const [shake, setShake] = useState(false);
  const [reviewId] = useState(() => Date.now().toString(36).toUpperCase());
  const [restored, setRestored] = useState(false);

  const dealCreationInProgressRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);



  // Auto-focus first input when entering details step
  useEffect(() => {
    if (currentStep === "details") {
      setTimeout(() => firstInputRef.current?.focus(), 100);
    }
  }, [currentStep]);

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
                // eslint-disable-next-line react-hooks/set-state-in-effect
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
        terms,
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
  }, [user, selectedTemplate, recipientName, recipientEmail, formData, addDeal, addAuditLog]);

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

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(dealLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      try { toast.success("Link copied!"); } catch {}
    } catch {
       // fallback
    }
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
        copyToClipboard();
      }
    } else {
      copyToClipboard();
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

          <nav className="flex-1 px-3 py-6 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
            <div className="px-3 mb-4">
              {isSidebarCollapsed ? (
                <div className="flex justify-center h-4 items-center">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                    Step
                  </span>
                </div>
              ) : (
                <h2 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                  Agreement Progress
                </h2>
              )}
            </div>

            {STEPS.map((step, index) => {
              const isCompleted = currentStepIndex > index;
              const isCurrent = currentStep === step;
              const canNavigate = STEPS.indexOf(step) <= currentStepIndex && currentStep !== "share";

              return (
                <SidebarNavItem
                  key={step}
                  label={stepInfo[step as Step].title}
                  index={index}
                  isActive={isCurrent}
                  isCollapsed={isSidebarCollapsed}
                  isCompleted={isCompleted}
                  onClick={() => canNavigate && handleStepClick(step)}
                  className={cn(!canNavigate && "opacity-50 cursor-not-allowed")}
                >
                  <Check className="h-4 w-4" strokeWidth={3} />
                </SidebarNavItem>
              );
            })}
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
                      Agreements on Proofo are sealed with cryptographic proofs, making them legally binding & immutable.
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

          <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-20 lg:pb-8 w-full scroll-smooth">
            <div className="max-w-7xl mx-auto w-full">
            <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 items-start justify-center">
              <div className="flex-1 w-full min-w-0">
                {/* Mobile Header (Progress simplified) */}
                <div className="lg:hidden mb-8 flex items-center justify-between">
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
                      variants={containerVariants}
                      initial="hidden" animate="show" exit="exit"
                      className="space-y-4"
                    >
                      <div className="grid sm:grid-cols-2 gap-4">
                        {dealTemplates.map((template, idx) => {
                          const Icon = iconMap[template.icon] || FileCheck;
                          return (
                            <motion.div
                              key={template.id}
                              variants={slideUp}
                              custom={idx}
                              whileHover={{ y: -4, transition: springTransition }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <div
                                className="group relative cursor-pointer overflow-hidden rounded-xl bg-card border border-border hover:border-foreground/20 shadow-sm hover:shadow-md transition-all duration-300 h-full p-5 flex flex-col items-start gap-4 select-none focus-visible:ring-2 focus-visible:ring-primary outline-none"
                                onClick={() => handleTemplateSelect(template)}
                                tabIndex={0}
                                role="button"
                                aria-label={`Select ${template.name} template`}
                                onKeyDown={(e) => e.key === "Enter" && handleTemplateSelect(template)}
                              >
                                <div className="absolute inset-0 bg-secondary/0 group-hover:bg-muted/40 transition-colors duration-300" />
                                <div className="h-10 w-10 rounded-lg bg-secondary/50 flex items-center justify-center shrink-0 group-hover:bg-foreground group-hover:text-background transition-colors duration-300">
                                  <Icon className="h-5 w-5" />
                                </div>
                                <div className="space-y-1.5 relative z-10">
                                  <h3 className="font-bold text-base tracking-tight">{template.name}</h3>
                                  <p className="text-sm text-muted-foreground leading-relaxed">{template.description}</p>
                                </div>
                                <div className="mt-auto pt-3 flex items-center text-xs font-bold opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0">
                                  Use Template <ArrowRight className="h-3 w-3 ml-1" />
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
                      variants={containerVariants}
                      initial="hidden" animate="show" exit="exit"
                      className="space-y-5"
                    >
                      <Card className="border border-border shadow-sm bg-card overflow-hidden rounded-xl">
                        <div className="h-1 w-full bg-muted">
                          <div className="h-full bg-foreground w-1/2 transition-all duration-500 ease-in-out" />
                        </div>
                        <div className="p-5 md:p-6 space-y-6">
                          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                              <Users className="h-4 w-4" /> Parties Involved
                            </div>
                            <div className="grid gap-5">
                              <div className="grid gap-2">
                                <Label htmlFor="recipientName" className="text-sm font-medium">Recipient Name <span className="text-destructive">*</span></Label>
                                <div className="relative">
                                  <Input
                                    id="recipientName"
                                    ref={firstInputRef}
                                    placeholder="e.g. Acme Corp, John Doe"
                                    value={recipientName}
                                    onChange={(e) => setRecipientName(e.target.value)}
                                    className={cn("h-10 rounded-lg bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all shadow-sm", shake && "border-destructive animate-pulse")}
                                  />
                                  <AnimatePresence>
                                    {recipientName.length > 2 && (
                                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                                        <Check className="h-4 w-4" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                              <div className="grid gap-2">
                                <Label htmlFor="recipientEmail" className="text-sm font-medium">
                                  Recipient Email <span className="text-muted-foreground font-normal ml-1">(Optional)</span>
                                </Label>
                                <div className="relative group">
                                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-foreground transition-colors" />
                                  <Input
                                    id="recipientEmail"
                                    type="email"
                                    placeholder="email@example.com"
                                    value={recipientEmail}
                                    onChange={(e) => setRecipientEmail(e.target.value)}
                                    className="h-10 pl-11 rounded-lg bg-background border-border focus:ring-1 focus:ring-primary focus:border-primary/50 transition-all shadow-sm"
                                  />
                                  <AnimatePresence>
                                    {isValidEmail(recipientEmail) && (
                                      <motion.div initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0, opacity: 0 }} className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 pointer-events-none">
                                        <Check className="h-4 w-4" />
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              </div>
                            </div>
                          </section>
                          <Separator />
                          <section className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100">
                            <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                              <FileCheck className="h-4 w-4" /> Agreement Terms
                            </div>
                            <div className="grid gap-5">
                              {selectedTemplate.fields.map((field) => (
                                <div key={field.id} className="grid gap-2">
                                  <Label htmlFor={field.id} className="text-sm font-medium">
                                    {field.label} {field.required && <span className="text-destructive">*</span>}
                                  </Label>
                                  {renderField(field)}
                                </div>
                              ))}
                            </div>
                          </section>
                          <div className="flex justify-between items-center pt-4">
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
                        </div>
                      </Card>
                    </motion.div>
                  )}

                  {/* STEP 3: REVIEW */}
                  {currentStep === "review" && (
                    <motion.div
                      key="review"
                      variants={containerVariants}
                      initial="hidden" animate="show" exit="exit"
                      className="space-y-5"
                    >
                      <div className="relative rounded-xl overflow-hidden bg-card border border-border shadow-sm duration-500 hover:shadow-md transition-shadow group mx-auto max-w-2xl">
                        <div className="h-1.5 w-full bg-foreground" />
                        <div className="p-6 space-y-6">
                          <div className="flex items-start justify-between">
                            <div className="space-y-1">
                              <div className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Draft Agreement</div>
                              <div className="text-3xl font-bold tracking-tighter text-foreground">{selectedTemplate?.name}</div>
                              <div className="text-sm text-muted-foreground tabular-nums">Version 1.0 • {new Date().toLocaleDateString()}</div>
                            </div>
                            <div className="h-12 w-12 bg-secondary rounded-full flex items-center justify-center border border-border">
                              <ShieldCheck className="h-6 w-6 text-foreground" />
                            </div>
                          </div>
                          <Separator className="border-dashed" />
                          <div className="grid grid-cols-2 gap-8">
                            <div className="space-y-1.5">
                              <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Issuer</div>
                              <div className="font-semibold text-foreground text-lg">{user?.name || "Guest User"}</div>
                              <div className="text-sm text-muted-foreground font-mono">{user?.email || "No account"}</div>
                            </div>
                            <div className="space-y-1.5 text-right">
                              <div className="text-xs uppercase tracking-wider text-muted-foreground font-bold">Recipient</div>
                              <div className="font-semibold text-foreground text-lg">{recipientName}</div>
                              <div className="text-sm text-muted-foreground font-mono">{recipientEmail || "Direct Link"}</div>
                            </div>
                          </div>
                          <div className="bg-muted/50 rounded-lg p-5 space-y-3 border border-border/50">
                            {selectedTemplate?.fields.map(field => (
                              <div key={field.id} className="flex justify-between text-sm items-baseline">
                                <span className="text-muted-foreground font-medium">{field.label}</span>
                                <span className="font-bold text-foreground font-mono tabular-nums">
                                  {field.type === "currency" && "$"}{formData[field.id]}
                                </span>
                              </div>
                            ))}
                          </div>
                          {createError && (
                            <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-4 rounded-lg flex items-center gap-3">
                              <AlertCircle className="h-5 w-5 shrink-0" />
                              <span className="font-medium">{createError}</span>
                            </div>
                          )}
                        </div>
                        <div className="bg-muted/30 p-4 border-t border-border flex justify-between items-center backdrop-blur-sm">
                          <div className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                            <Globe className="h-3.5 w-3.5" />
                            <span>Secured by Proofo Network</span>
                          </div>
                          <div className="text-[10px] font-mono opacity-50">ID: {reviewId}</div>
                        </div>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-4 justify-center pt-2 max-w-2xl mx-auto">
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
                  {currentStep === "share" && (
                    <motion.div
                      key="share"
                      variants={containerVariants}
                      initial="hidden" animate="show"
                      className="space-y-6 max-w-xl mx-auto text-center"
                    >
                      <div className="space-y-4">
                        <motion.div
                          initial={{ scale: 0, rotate: -180 }}
                          animate={{ scale: 1, rotate: 0 }}
                          transition={springTransition}
                          className="h-20 w-20 bg-foreground rounded-full flex items-center justify-center shadow-lg relative z-10 text-background mx-auto"
                        >
                          <Check className="h-10 w-10" />
                        </motion.div>
                        <motion.h2
                          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
                          className="text-2xl font-bold tracking-tight"
                        >
                          Agreement Ready!
                        </motion.h2>
                        <motion.p
                          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                          className="text-muted-foreground max-w-xs mx-auto text-sm"
                        >
                          Your secure deal has been created and is ready to share.
                        </motion.p>
                      </div>

                      <Card className="overflow-hidden border border-border shadow-md rounded-2xl bg-card">
                        <CardContent className="p-0">
                          <div className="p-6 flex flex-col items-center bg-card border-b border-border text-foreground">
                            <div className="p-2 rounded-xl bg-transparent">
                              <QRCodeSVG
                                value={dealLink}
                                size={160}
                                marginSize={2}
                                bgColor="transparent"
                                fgColor="currentColor"
                              />
                            </div>
                            <div className="mt-4 flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-widest bg-muted px-3 py-1 rounded-full border border-border">
                              <Zap className="h-3 w-3" /> Scan to Sign
                            </div>
                          </div>
                          <div className="p-5 space-y-4 bg-background">
                            <div className="space-y-2 text-left">
                              <Label className="text-xs font-bold text-muted-foreground uppercase">Share Link</Label>
                              <div className="flex gap-2">
                                <Input
                                  value={dealLink}
                                  readOnly
                                  className="font-mono text-xs h-10 bg-muted/50 border-border focus-visible:ring-1 focus-visible:ring-foreground"
                                  onClick={(e) => e.currentTarget.select()}
                                />
                                <Button size="icon" onClick={copyToClipboard} className={cn("shrink-0 h-10 w-10 transition-all", copied && "bg-foreground text-background")}>
                                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3 pt-2">
                              <Button variant="outline" className="h-11 gap-2 hover:bg-muted" onClick={handleShare}>
                                <Share2 className="h-4 w-4" /> Share
                              </Button>
                              <Link href="/dashboard" className="w-full">
                                <Button className="h-11 w-full gap-2 shadow-sm bg-foreground hover:bg-foreground/90 text-background">
                                  Dashboard <ArrowRight className="h-4 w-4" />
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      <div className="pt-2">
                        <Button variant="link" onClick={() => {
                          setCurrentStep("template");
                          setSelectedTemplate(null);
                          setRecipientName("");
                          setFormData({});
                          setCreatedDeal(null);
                          window.scrollTo({ top: 0, behavior: 'smooth' });
                        }} className="text-muted-foreground hover:text-foreground">
                          + Create Another Agreement
                        </Button>
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
