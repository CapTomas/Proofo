"use client";

import { useState, use } from "react";
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
} from "lucide-react";
import Link from "next/link";

interface DealPageProps {
  params: Promise<{ id: string }>;
}

// Demo deal data
const demoDeal = {
  id: "demo123",
  creatorName: "Alex Johnson",
  creatorAvatar: "AJ",
  recipientName: "You",
  title: "Lend Camera Equipment",
  description: "Agreement to lend camera equipment",
  template: {
    name: "Lend Item",
    icon: "📦",
  },
  terms: [
    { id: "1", label: "Item Being Lent", value: "Canon EOS R5 + 24-70mm f/2.8 lens", type: "text" },
    { id: "2", label: "Estimated Value", value: "$5,000", type: "currency" },
    { id: "3", label: "Expected Return Date", value: "February 15, 2024", type: "date" },
    { id: "4", label: "Condition Notes", value: "Excellent condition, includes original box and accessories", type: "text" },
  ],
  createdAt: "2024-01-20T14:00:00Z",
  status: "pending",
};

type Step = "review" | "sign" | "email" | "complete";

export default function DealConfirmPage({ params }: DealPageProps) {
  const resolvedParams = use(params);
  const [currentStep, setCurrentStep] = useState<Step>("review");
  const [signature, setSignature] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [isSealing, setIsSealing] = useState(false);

  const handleProceedToSign = () => {
    setCurrentStep("sign");
  };

  const handleSign = async () => {
    if (!signature) return;

    setIsSealing(true);
    // Simulate sealing animation
    await new Promise((resolve) => setTimeout(resolve, 2500));
    setIsSealing(false);
    setCurrentStep("email");
  };

  const handleComplete = () => {
    setCurrentStep("complete");
  };

  const handleSkipEmail = () => {
    setCurrentStep("complete");
  };

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
          {/* Step 1: Review Deal */}
          {currentStep === "review" && (
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
                  {demoDeal.creatorName} wants to make a deal
                </h1>
                <p className="text-muted-foreground">
                  Review the terms below before signing
                </p>
              </div>

              {/* Creator Info */}
              <Card className="mb-6">
                <CardContent className="p-5">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold">
                      {demoDeal.creatorAvatar}
                    </div>
                    <div className="flex-1">
                      <p className="font-semibold">{demoDeal.creatorName}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        Created {new Date(demoDeal.createdAt).toLocaleDateString('en-US', { 
                          month: 'long', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
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
                    <span className="text-4xl">{demoDeal.template.icon}</span>
                    <div>
                      <CardTitle className="text-xl">{demoDeal.title}</CardTitle>
                      <CardDescription className="mt-1">
                        {demoDeal.template.name}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="p-6 space-y-4">
                  {demoDeal.terms.map((term, index) => (
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
          {currentStep === "sign" && (
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
              </div>

              <Card className="mb-6">
                <CardContent className="p-6 sm:p-8 space-y-6">
                  <div className="space-y-3">
                    <Label htmlFor="email" className="text-sm font-medium">
                      Email Address <span className="text-muted-foreground">(Optional)</span>
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
                      />
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-xl bg-muted/50 border">
                    <AlertCircle className="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll send you a PDF copy of this agreement with the cryptographic seal for your records. Your email is never shared.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-4">
                <Button variant="outline" className="flex-1" onClick={handleSkipEmail}>
                  Skip for Now
                </Button>
                <Button 
                  className="flex-1 shadow-xl shadow-primary/25" 
                  onClick={handleComplete} 
                  disabled={!email}
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Receipt
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
                        {new Date().toLocaleString('en-US', {
                          dateStyle: 'medium',
                          timeStyle: 'short',
                        })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between py-2">
                      <span className="text-muted-foreground text-sm">With</span>
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground text-xs font-medium">
                          {demoDeal.creatorAvatar}
                        </div>
                        <span className="font-medium text-sm">{demoDeal.creatorName}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
                <Button variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  Download PDF
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
