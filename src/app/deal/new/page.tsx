"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Copy,
  Share2,
  Mail,
  Sparkles,
  FileCheck,
  Users,
  Edit3,
  CheckCircle2,
  AlertCircle,
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { dealTemplates } from "@/lib/templates";
import { DealTemplate, TemplateField, Deal } from "@/types";
import { useAppStore, createNewDeal } from "@/store";
import { createDealAction, getDealByIdAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { LoginModal } from "@/components/login-modal";

// Icon mapping for templates
const iconMap: Record<string, LucideIcon> = {
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
};

type Step = "template" | "details" | "review" | "share";

const stepInfo = {
  template: { number: 1, title: "Choose Template", description: "Select a template that fits your agreement" },
  details: { number: 2, title: "Fill Details", description: "Add the specifics of your agreement" },
  review: { number: 3, title: "Review", description: "Make sure everything looks correct" },
  share: { number: 4, title: "Share", description: "Send to the other party" },
};

function NewDealContent() {
  const { user, addDeal, addAuditLog, getDealById } = useAppStore();
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
  const dealCreationInProgressRef = useRef(false);

  // Pre-fill form from source deal (Duplicate feature)
  useEffect(() => {
    if (!sourceId) return;

    const prefillFromDeal = (deal: Deal) => {
      // Find the matching template
      const template = dealTemplates.find(t => t.id === deal.templateId);
      if (template) {
        setSelectedTemplate(template);
        // Pre-fill form data from deal terms
        const data: Record<string, string> = {};
        deal.terms.forEach(term => {
          // Find matching field by label
          const field = template.fields.find(f => f.label === term.label);
          if (field) {
            // Remove currency symbol if present
            const value = term.value.startsWith("$") ? term.value.slice(1) : term.value;
            data[field.id] = value;
          }
        });
        setFormData(data);
        setRecipientName(deal.recipientName || "");
        setRecipientEmail(deal.recipientEmail || "");
        // Skip to details step
        setCurrentStep("details");
      }
    };

    const loadSourceDeal = async () => {
      // Try to get deal from Supabase first
      if (isSupabaseConfigured()) {
        const { deal: sourceDeal } = await getDealByIdAction(sourceId);
        if (sourceDeal) {
          prefillFromDeal(sourceDeal);
          return;
        }
      }
      
      // Fallback to local store
      const localDeal = getDealById(sourceId);
      if (localDeal) {
        prefillFromDeal(localDeal);
      }
    };

    loadSourceDeal();
  }, [sourceId, getDealById]);

  // Handle post-authentication deal creation
  useEffect(() => {
    if (pendingDealCreation && user && !dealCreationInProgressRef.current) {
      // User just authenticated (either real or demo) - trigger deal creation
      setPendingDealCreation(false);
      dealCreationInProgressRef.current = true;
      handleCreateDeal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, pendingDealCreation]);

  // Generate the deal link - use stored shareUrl if available, otherwise construct from createdDeal
  const dealLink = shareUrl || (createdDeal
    ? typeof window !== "undefined"
      ? `${window.location.origin}/d/${createdDeal.publicId}`
      : `https://proofo.app/d/${createdDeal.publicId}`
    : "");

  const handleTemplateSelect = (template: DealTemplate) => {
    setSelectedTemplate(template);
    // Initialize form data with empty values
    const initialData: Record<string, string> = {};
    template.fields.forEach((field) => {
      initialData[field.id] = field.defaultValue || "";
    });
    setFormData(initialData);
    setCurrentStep("details");
  };

  const handleFieldChange = (fieldId: string, value: string) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleCreateDeal = async () => {
    if (!selectedTemplate) return;

    setIsCreating(true);
    setCreateError(null);

    // Build terms from form data
    const terms = selectedTemplate.fields
      .filter((field) => formData[field.id])
      .map((field) => ({
        label: field.label,
        value: field.type === "currency" 
          ? `$${formData[field.id]}` 
          : formData[field.id],
        type: field.type === "textarea" ? "text" : field.type,
      }));

    // User must be authenticated to create deals
    if (!user) {
      setCreateError("You must be logged in to create a deal");
      setIsCreating(false);
      return;
    }

    // Try to use server action if user is authenticated with Supabase
    const isRealUser = isSupabaseConfigured() && user?.id && !user.id.startsWith("demo-");
    
    if (isRealUser) {
      // Use server action for real database storage
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
        return;
      }

      // Add to local store for immediate display
      addDeal(deal);
      setCreatedDeal(deal);
      setShareUrl(serverShareUrl || "");
    } else {
      // Demo mode - use local storage (for authenticated demo users only)
      const newDeal = createNewDeal(user, {
        templateId: selectedTemplate.id,
        title: selectedTemplate.name,
        recipientName,
        terms,
        description: `${selectedTemplate.name} agreement with ${recipientName}`,
      });

      // Add to store
      addDeal(newDeal);

      // Add audit log entry (local)
      addAuditLog({
        dealId: newDeal.id,
        eventType: "deal_created",
        actorId: user.id,
        actorType: "creator",
        metadata: {
          templateId: selectedTemplate.id,
          recipientName,
        },
      });

      setCreatedDeal(newDeal);
      // Use window.location.origin for consistent URL generation in demo mode
      const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
      setShareUrl(`${baseUrl}/d/${newDeal.publicId}`);
    }

    setIsCreating(false);
    setCurrentStep("share");
  };

  const handleNext = () => {
    if (currentStep === "details") {
      setCurrentStep("review");
    } else if (currentStep === "review") {
      // User must authenticate before creating a deal
      if (!user) {
        // User is not authenticated - show login modal
        setPendingDealCreation(true);
        setShowLoginModal(true);
      } else {
        // User is authenticated - create deal
        handleCreateDeal();
      }
    }
  };

  const handleBack = () => {
    if (currentStep === "details") {
      setCurrentStep("template");
      setSelectedTemplate(null);
    } else if (currentStep === "review") {
      setCurrentStep("details");
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(dealLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea");
      textArea.value = dealLink;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand("copy");
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleShare = async () => {
    if (navigator.share && createdDeal && user) {
      try {
        await navigator.share({
          title: `${selectedTemplate?.name} - Proofo Agreement`,
          text: `${user.name} has sent you an agreement to sign on Proofo.`,
          url: dealLink,
        });
      } catch {
        // User cancelled or share failed, fall back to copy
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
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleFieldChange(field.id, e.target.value),
      placeholder: field.placeholder,
      "aria-required": field.required,
      "aria-describedby": field.required ? `${field.id}-required` : undefined,
    };

    switch (field.type) {
      case "textarea":
        return <Textarea {...commonProps} className="min-h-[100px] resize-none" />;
      case "date":
        return <Input {...commonProps} type="date" />;
      case "number":
        return <Input {...commonProps} type="number" />;
      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground font-medium" aria-hidden="true">
              $
            </span>
            <Input {...commonProps} type="number" step="0.01" className="pl-8" />
          </div>
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  const steps: Step[] = ["template", "details", "review", "share"];
  const currentStepIndex = steps.indexOf(currentStep);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href={user ? "/dashboard" : "/"} className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors group">
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            <span className="hidden sm:inline">{user ? "Back to Dashboard" : "Back to Home"}</span>
          </Link>
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl tracking-tight hidden sm:inline">Proofo</span>
          </Link>
          <div className="w-24" /> {/* Spacer for centering */}
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-8 max-w-3xl">
        {/* Progress Steps */}
        <div className="mb-10">
          <div className="flex items-center justify-between relative">
            {/* Progress Line */}
            <div className="absolute top-5 left-0 right-0 h-0.5 bg-muted mx-8">
              <motion.div 
                className="h-full bg-primary"
                initial={{ width: "0%" }}
                animate={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>

            {steps.map((step, index) => {
              const isCompleted = currentStepIndex > index;
              const isCurrent = currentStep === step;
              
              return (
                <div key={step} className="relative z-10 flex flex-col items-center">
                  <motion.div
                    initial={false}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      backgroundColor: isCompleted || isCurrent ? "var(--primary)" : "var(--muted)",
                    }}
                    className={`h-10 w-10 rounded-full flex items-center justify-center text-sm font-semibold transition-colors ${
                      isCompleted || isCurrent
                        ? "text-primary-foreground shadow-lg shadow-primary/25"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isCompleted ? (
                      <Check className="h-5 w-5" />
                    ) : (
                      stepInfo[step].number
                    )}
                  </motion.div>
                  <span className={`mt-2 text-xs font-medium hidden sm:block ${
                    isCurrent ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {stepInfo[step].title}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* Step 1: Select Template */}
          {currentStep === "template" && (
            <motion.div
              key="template"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <Badge variant="secondary" className="mb-4">
                  <Sparkles className="h-3 w-3 mr-1.5" />
                  Step 1 of 4
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Choose a Template</h1>
                <p className="text-muted-foreground">
                  Select a template that best fits your agreement type
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {dealTemplates.map((template, index) => {
                  const IconComponent = iconMap[template.icon] || FileCheck;
                  return (
                    <motion.div
                      key={template.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <Card
                        className="cursor-pointer hover:border-primary hover:shadow-lg transition-all group"
                        onClick={() => handleTemplateSelect(template)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            handleTemplateSelect(template);
                          }
                        }}
                        aria-label={`${template.name}: ${template.description}`}
                      >
                        <CardContent className="p-6">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center group-hover:scale-110 transition-transform" aria-hidden="true">
                              <IconComponent className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold mb-1 group-hover:text-primary transition-colors">
                                {template.name}
                              </h3>
                              <p className="text-sm text-muted-foreground">
                                {template.description}
                              </p>
                            </div>
                            <ArrowRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Step 2: Fill Details */}
          {currentStep === "details" && selectedTemplate && (
            <motion.div
              key="details"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                {(() => {
                  const IconComp = iconMap[selectedTemplate.icon] || FileCheck;
                  return (
                    <Badge variant="secondary" className="mb-4 gap-1.5">
                      <IconComp className="h-4 w-4" aria-hidden="true" />
                      {selectedTemplate.name}
                    </Badge>
                  );
                })()}
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Fill in the Details</h1>
                <p className="text-muted-foreground">
                  Provide the information for your agreement
                </p>
              </div>

              <Card>
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName" className="text-sm font-medium">
                      Recipient&apos;s Name <span className="text-destructive">*</span>
                    </Label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="recipientName"
                        value={recipientName}
                        onChange={(e) => setRecipientName(e.target.value)}
                        placeholder="Who is this deal with?"
                        aria-required="true"
                        className="pl-11"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="recipientEmail" className="text-sm font-medium">
                      Recipient&apos;s Email <span className="text-muted-foreground">(Optional)</span>
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="recipientEmail"
                        type="email"
                        value={recipientEmail}
                        onChange={(e) => setRecipientEmail(e.target.value)}
                        placeholder="recipient@email.com"
                        className="pl-11"
                        pattern="[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$"
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      If provided, you can send email reminders via the Nudge button
                    </p>
                  </div>

                  <Separator />

                  {selectedTemplate.fields.map((field, index) => (
                    <motion.div 
                      key={field.id} 
                      className="space-y-2"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <Label htmlFor={field.id} className="text-sm font-medium">
                        {field.label}
                        {field.required && <span className="text-destructive ml-1">*</span>}
                      </Label>
                      {renderField(field)}
                    </motion.div>
                  ))}

                  <div className="flex justify-between pt-6 gap-4">
                    <Button variant="outline" onClick={handleBack} className="gap-2">
                      <ArrowLeft className="h-4 w-4" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!recipientName || selectedTemplate.fields.some(
                        (f) => f.required && !formData[f.id]
                      )}
                      className="gap-2 shadow-lg shadow-primary/20"
                    >
                      Review Deal
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 3: Review */}
          {currentStep === "review" && selectedTemplate && (
            <motion.div
              key="review"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-10">
                <Badge variant="secondary" className="mb-4">
                  <Edit3 className="h-3 w-3 mr-1.5" />
                  Step 3 of 4
                </Badge>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Review Your Deal</h1>
                <p className="text-muted-foreground">
                  Make sure everything looks correct before creating
                </p>
              </div>

              <Card className="overflow-hidden">
                <CardHeader className="bg-muted/30 border-b">
                  <div className="flex items-center gap-4">
                    {(() => {
                      const ReviewIcon = iconMap[selectedTemplate.icon] || FileCheck;
                      return (
                        <div className="h-14 w-14 rounded-xl bg-primary/10 flex items-center justify-center">
                          <ReviewIcon className="h-7 w-7 text-primary" />
                        </div>
                      );
                    })()}
                    <div>
                      <CardTitle className="text-xl">{selectedTemplate.name}</CardTitle>
                      <CardDescription className="flex items-center gap-1.5 mt-1">
                        <Users className="h-3.5 w-3.5" />
                        Agreement with {recipientName}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 space-y-4">
                  {createError && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2 text-sm text-destructive">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {createError}
                    </div>
                  )}
                  {selectedTemplate.fields.map((field, index) => (
                    <motion.div 
                      key={field.id} 
                      className="flex flex-col sm:flex-row sm:justify-between gap-1 py-3 border-b last:border-0"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: index * 0.05 }}
                    >
                      <span className="text-muted-foreground text-sm">{field.label}</span>
                      <span className="font-medium">
                        {field.type === "currency" && formData[field.id] && "$"}
                        {formData[field.id] || <span className="text-muted-foreground italic">Not specified</span>}
                      </span>
                    </motion.div>
                  ))}
                  
                  <div className="flex items-start gap-3 mt-6 p-4 rounded-xl bg-primary/5 border border-primary/10">
                    <AlertCircle className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <p className="font-medium text-foreground">Ready to create?</p>
                      <p className="text-muted-foreground mt-0.5">
                        Once created, you&apos;ll get a unique link to share with {recipientName}. They can sign without creating an account.
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between pt-6 gap-4">
                    <Button variant="outline" onClick={handleBack} className="gap-2" disabled={isCreating}>
                      <ArrowLeft className="h-4 w-4" />
                      Edit
                    </Button>
                    <Button onClick={handleNext} className="gap-2 shadow-lg shadow-primary/20" disabled={isCreating}>
                      {isCreating ? (
                        <>
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Sparkles className="h-4 w-4" />
                          </motion.div>
                          Creating...
                        </>
                      ) : (
                        <>
                          Create Deal
                          <Check className="h-4 w-4" />
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {/* Step 4: Share */}
          {currentStep === "share" && (
            <motion.div
              key="share"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <div className="text-center mb-10">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-500/30"
                >
                  <CheckCircle2 className="h-10 w-10 text-white" />
                </motion.div>
                <h1 className="text-2xl sm:text-3xl font-bold mb-2 tracking-tight">Deal Created!</h1>
                <p className="text-muted-foreground">
                  Share this link with {recipientName} to get their signature
                </p>
              </div>

              <Card>
                <CardContent className="p-6 sm:p-8 space-y-8">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.3 }}
                      className="p-6 bg-white rounded-2xl shadow-lg border"
                    >
                      <QRCodeSVG
                        value={dealLink}
                        size={180}
                        level="H"
                        includeMargin
                      />
                    </motion.div>
                  </div>

                  {/* Link */}
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Deal Link</Label>
                    <div className="flex gap-2">
                      <Input value={dealLink} readOnly className="font-mono text-sm" />
                      <Button 
                        variant={copied ? "default" : "outline"} 
                        onClick={copyToClipboard}
                        className="shrink-0 gap-2 min-w-[100px]"
                      >
                        {copied ? (
                          <>
                            <Check className="h-4 w-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  {/* Deal ID for verification */}
                  {createdDeal && (
                    <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <span>Deal ID:</span>
                      <Badge variant="outline" className="font-mono">
                        {createdDeal.publicId}
                      </Badge>
                    </div>
                  )}

                  {/* Share Options */}
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Button onClick={copyToClipboard} className="gap-2 shadow-lg shadow-primary/20">
                      <Copy className="h-4 w-4" />
                      Copy Link
                    </Button>
                    <Button 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        if (user) {
                          window.open(
                            `mailto:?subject=${encodeURIComponent(`${selectedTemplate?.name || "Agreement"} - Please Sign`)}&body=${encodeURIComponent(`Hi ${recipientName},\n\n${user.name} has sent you an agreement to sign on Proofo.\n\nPlease review and sign here:\n${dealLink}\n\nNo account needed - just click the link, review the terms, and sign.\n\nThanks!`)}`,
                            "_blank"
                          );
                        }
                      }}
                    >
                      <Mail className="h-4 w-4" />
                      Send Email
                    </Button>
                    <Button variant="outline" className="gap-2" onClick={handleShare}>
                      <Share2 className="h-4 w-4" />
                      Share
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex flex-col sm:flex-row gap-4 justify-center">
                    <Link href="/dashboard">
                      <Button variant="outline" className="w-full sm:w-auto gap-2">
                        <FileCheck className="h-4 w-4" />
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Button 
                      variant="ghost" 
                      className="w-full sm:w-auto gap-2"
                      onClick={() => {
                        setCurrentStep("template");
                        setSelectedTemplate(null);
                        setRecipientName("");
                        setFormData({});
                        setCreatedDeal(null);
                      }}
                    >
                      Create Another Deal
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Login Modal for Deferred Authentication */}
      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        title="Sign in to create your deal"
        description="To generate a secure, enforceable link, we need to verify your identity."
        onSuccess={() => {
          // Modal will close automatically, and useEffect will handle deal creation
          setShowLoginModal(false);
        }}
      />
    </div>
  );
}

export default function NewDealPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30 flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <NewDealContent />
    </Suspense>
  );
}
