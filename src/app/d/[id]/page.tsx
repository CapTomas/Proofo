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
} from "lucide-react";

interface DealPageProps {
  params: Promise<{ id: string }>;
}

// Demo deal data
const demoDeal = {
  id: "demo123",
  creatorName: "Alex Johnson",
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
    await new Promise((resolve) => setTimeout(resolve, 2000));
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
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 h-16 flex items-center justify-center">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl">Proofo</span>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-2xl">
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
                <Badge variant="secondary" className="mb-4">
                  <Shield className="h-3 w-3 mr-1" />
                  Secure Agreement
                </Badge>
                <h1 className="text-2xl font-bold mb-2">
                  {demoDeal.creatorName} wants to make a deal
                </h1>
                <p className="text-muted-foreground">
                  Review the terms below before signing
                </p>
              </div>

              <Card className="mb-6">
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{demoDeal.template.icon}</span>
                    <div>
                      <CardTitle>{demoDeal.title}</CardTitle>
                      <CardDescription>
                        {demoDeal.template.name} • Created{" "}
                        {new Date(demoDeal.createdAt).toLocaleDateString()}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Separator />
                  {demoDeal.terms.map((term) => (
                    <div key={term.id} className="flex flex-col sm:flex-row sm:justify-between gap-1">
                      <span className="text-muted-foreground text-sm">{term.label}</span>
                      <span className="font-medium">{term.value}</span>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Trust Indicators */}
              <div className="flex flex-wrap justify-center gap-4 mb-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-green-500" />
                  <span>Encrypted & Secure</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck className="h-4 w-4 text-green-500" />
                  <span>Legally Binding</span>
                </div>
              </div>

              <Button className="w-full" size="lg" onClick={handleProceedToSign}>
                Review Complete — Sign to Accept
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
                <h1 className="text-2xl font-bold mb-2">Sign to Accept</h1>
                <p className="text-muted-foreground">
                  Draw your signature below to seal this agreement
                </p>
              </div>

              <Card className="mb-6">
                <CardContent className="p-6">
                  <SignaturePad
                    onSignatureChange={setSignature}
                    className="flex flex-col items-center"
                  />
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setCurrentStep("review")}
                >
                  Back
                </Button>
                <Button
                  className="flex-1"
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
                        <Sparkles className="h-4 w-4 mr-2" />
                      </motion.div>
                      Sealing...
                    </>
                  ) : (
                    "Agree & Seal"
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
              className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="text-center"
              >
                <motion.div
                  animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 10, -10, 0],
                  }}
                  transition={{ duration: 1, repeat: Infinity }}
                  className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4"
                >
                  <FileCheck className="h-12 w-12 text-primary" />
                </motion.div>
                <h2 className="text-xl font-bold mb-2">Sealing Your Deal</h2>
                <p className="text-muted-foreground">
                  Creating cryptographic proof...
                </p>
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
                  className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4"
                >
                  <CheckCircle2 className="h-8 w-8 text-white" />
                </motion.div>
                <h1 className="text-2xl font-bold mb-2">Deal Sealed!</h1>
                <p className="text-muted-foreground">
                  Where should we send your receipt?
                </p>
              </div>

              <Card className="mb-6">
                <CardContent className="p-6 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address (Optional)</Label>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="your@email.com"
                          className="pl-10"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 p-3 bg-muted rounded-lg">
                    <AlertCircle className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <p className="text-sm text-muted-foreground">
                      We&apos;ll send you a PDF copy of this agreement with the cryptographic seal for your records.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={handleSkipEmail}>
                  Skip
                </Button>
                <Button className="flex-1" onClick={handleComplete} disabled={!email}>
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
                className="h-20 w-20 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-6"
              >
                <CheckCircle2 className="h-10 w-10 text-white" />
              </motion.div>

              <h1 className="text-3xl font-bold mb-4">You&apos;re All Set!</h1>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                This agreement has been cryptographically sealed and is now legally binding.
                {email && " A copy has been sent to your email."}
              </p>

              <Card className="mb-8">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">Deal ID</span>
                    <Badge variant="outline" className="font-mono">
                      {resolvedParams.id}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-muted-foreground">Status</span>
                    <Badge variant="success">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Confirmed
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Sealed At</span>
                    <span className="font-medium">
                      {new Date().toLocaleString()}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <div className="text-sm text-muted-foreground">
                <p className="mb-2">Want to create your own deals?</p>
                <Button variant="outline">
                  Get Started with Proofo
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="py-8 border-t mt-auto">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>Powered by Proofo • Evidence that holds up</p>
        </div>
      </footer>
    </div>
  );
}
