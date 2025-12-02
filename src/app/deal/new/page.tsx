"use client";

import { useState } from "react";
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
} from "lucide-react";
import Link from "next/link";
import { QRCodeSVG } from "qrcode.react";
import { dealTemplates } from "@/lib/templates";
import { DealTemplate, TemplateField } from "@/types";

type Step = "template" | "details" | "review" | "share";

export default function NewDealPage() {
  const [currentStep, setCurrentStep] = useState<Step>("template");
  const [selectedTemplate, setSelectedTemplate] = useState<DealTemplate | null>(null);
  const [recipientName, setRecipientName] = useState("");
  const [formData, setFormData] = useState<Record<string, string>>({});

  // Generate a mock deal link
  const dealLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/d/demo123` 
    : 'https://proofo.app/d/demo123';

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

  const handleNext = () => {
    if (currentStep === "details") {
      setCurrentStep("review");
    } else if (currentStep === "review") {
      // Simulate deal creation
      setCurrentStep("share");
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

  const copyToClipboard = () => {
    navigator.clipboard.writeText(dealLink);
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
        return <Textarea {...commonProps} className="min-h-[100px]" />;
      case "date":
        return <Input {...commonProps} type="date" />;
      case "number":
        return <Input {...commonProps} type="number" />;
      case "currency":
        return (
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" aria-hidden="true">
              $
            </span>
            <Input {...commonProps} type="number" step="0.01" className="pl-7" />
          </div>
        );
      default:
        return <Input {...commonProps} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl">Proofo</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          {["template", "details", "review", "share"].map((step, index) => (
            <div key={step} className="flex items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  currentStep === step
                    ? "bg-primary text-primary-foreground"
                    : ["template", "details", "review", "share"].indexOf(currentStep) > index
                    ? "bg-primary/20 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {["template", "details", "review", "share"].indexOf(currentStep) > index ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              {index < 3 && (
                <div
                  className={`w-12 h-0.5 mx-2 ${
                    ["template", "details", "review", "share"].indexOf(currentStep) > index
                      ? "bg-primary"
                      : "bg-muted"
                  }`}
                />
              )}
            </div>
          ))}
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
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Choose a Template</h1>
                <p className="text-muted-foreground">
                  Select a template that best fits your agreement type
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {dealTemplates.map((template) => (
                  <Card
                    key={template.id}
                    className="cursor-pointer hover:border-primary hover:shadow-md transition-all"
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
                        <div className="text-3xl" aria-hidden="true">{template.icon}</div>
                        <div>
                          <h3 className="font-semibold mb-1">{template.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {template.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
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
              <div className="text-center mb-8">
                <Badge variant="secondary" className="mb-2">
                  {selectedTemplate.icon} {selectedTemplate.name}
                </Badge>
                <h1 className="text-2xl font-bold mb-2">Fill in the Details</h1>
                <p className="text-muted-foreground">
                  Provide the information for your agreement
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="recipientName">
                      Recipient&apos;s Name <span aria-hidden="true">*</span>
                      <span className="sr-only">(required)</span>
                    </Label>
                    <Input
                      id="recipientName"
                      value={recipientName}
                      onChange={(e) => setRecipientName(e.target.value)}
                      placeholder="Who is this deal with?"
                      aria-required="true"
                    />
                  </div>

                  <Separator />

                  {selectedTemplate.fields.map((field) => (
                    <div key={field.id} className="space-y-2">
                      <Label htmlFor={field.id}>
                        {field.label}
                        {field.required && (
                          <>
                            <span aria-hidden="true"> *</span>
                            <span className="sr-only">(required)</span>
                          </>
                        )}
                      </Label>
                      {renderField(field)}
                    </div>
                  ))}

                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Back
                    </Button>
                    <Button
                      onClick={handleNext}
                      disabled={!recipientName || selectedTemplate.fields.some(
                        (f) => f.required && !formData[f.id]
                      )}
                    >
                      Review Deal
                      <ArrowRight className="h-4 w-4 ml-2" />
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
              <div className="text-center mb-8">
                <h1 className="text-2xl font-bold mb-2">Review Your Deal</h1>
                <p className="text-muted-foreground">
                  Make sure everything looks correct before creating
                </p>
              </div>

              <Card>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{selectedTemplate.icon}</span>
                    <div>
                      <CardTitle>{selectedTemplate.name}</CardTitle>
                      <CardDescription>
                        Agreement with {recipientName}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator />
                  {selectedTemplate.fields.map((field) => (
                    <div key={field.id} className="flex justify-between">
                      <span className="text-muted-foreground">{field.label}</span>
                      <span className="font-medium">
                        {field.type === "currency" && formData[field.id] && "$"}
                        {formData[field.id] || "Not specified"}
                      </span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex justify-between pt-4">
                    <Button variant="outline" onClick={handleBack}>
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Edit
                    </Button>
                    <Button onClick={handleNext}>
                      Create Deal
                      <Check className="h-4 w-4 ml-2" />
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
              <div className="text-center mb-8">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
                  className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4"
                >
                  <Check className="h-8 w-8 text-white" />
                </motion.div>
                <h1 className="text-2xl font-bold mb-2">Deal Created!</h1>
                <p className="text-muted-foreground">
                  Share this link with {recipientName} to get their signature
                </p>
              </div>

              <Card>
                <CardContent className="p-6 space-y-6">
                  {/* QR Code */}
                  <div className="flex justify-center">
                    <div className="p-4 bg-white rounded-lg">
                      <QRCodeSVG
                        value={dealLink}
                        size={200}
                        level="H"
                        includeMargin
                      />
                    </div>
                  </div>

                  {/* Link */}
                  <div className="space-y-2">
                    <Label>Deal Link</Label>
                    <div className="flex gap-2">
                      <Input value={dealLink} readOnly />
                      <Button variant="outline" onClick={copyToClipboard}>
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Share Options */}
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button className="flex-1" onClick={copyToClipboard}>
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Mail className="h-4 w-4 mr-2" />
                      Send via Email
                    </Button>
                    <Button variant="outline" className="flex-1">
                      <Share2 className="h-4 w-4 mr-2" />
                      Share
                    </Button>
                  </div>

                  <Separator />

                  <div className="flex justify-center">
                    <Link href="/dashboard">
                      <Button variant="outline">
                        Go to Dashboard
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
