"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/signature-pad";
import { PublicHeader } from "@/components/public-header";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  Clock,
  Undo2,
  Lock,
  ArrowLeft,
  Sparkles,
  User,
  Hash,
  PenLine,
  Calendar,
} from "lucide-react";
import Link from "next/link";

// --- MICRO-COMPONENTS ---

const ScrambleText = ({
  text,
  className,
  trigger = true,
}: {
  text: string;
  className?: string;
  trigger?: boolean;
}) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = "0123456789abcdef";

  useEffect(() => {
    if (!trigger) return;

    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 2;
    }, 30);
    return () => clearInterval(interval);
  }, [text, trigger]);

  return <span className={className}>{displayText}</span>;
};

const PulsingLock = () => (
  <div className="relative flex items-center justify-center w-16 h-16">
    <motion.div
      className="absolute inset-0 rounded-full border-2 border-primary/20"
      animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    />
    <motion.div
      className="absolute inset-2 rounded-full border border-primary/40"
      animate={{ scale: [1, 1.1, 1], opacity: [0.8, 0.2, 0.8] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut", delay: 0.2 }}
    />
    <Lock className="w-6 h-6 text-primary" />
  </div>
);

export default function DemoPage() {
  const [signature, setSignature] = useState<string | null>(null);
  const [step, setStep] = useState<"review" | "signing" | "sealing" | "sealed">("review");

  // Demo Data
  const demoHash = "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  const currentDate = new Date().toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const handleStartSign = () => setStep("signing");

  const handleSeal = async () => {
    if (signature) {
      setStep("sealing");
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setStep("sealed");
    }
  };

  const handleReset = () => {
    setStep("review");
    setSignature(null);
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary relative overflow-x-hidden">
      {/* Top Right Gradient Decoration */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[80px] md:blur-[100px] pointer-events-none z-0 translate-x-1/3 -translate-y-1/3" />

      {/* Header */}
      <PublicHeader currentPage="demo" />

      <main className="relative pt-28 pb-20 container mx-auto px-4 max-w-6xl">
        {/* Back Navigation */}
        <div className="mb-8">
          <Link
            href="/"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
          >
            <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
            Back to Home
          </Link>
        </div>

        <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">
          {/* LEFT COLUMN: Context & CTA - Spacious */}
          <div className="lg:sticky lg:top-32 space-y-12">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge
                variant="secondary"
                className="mb-6 px-4 py-1.5 bg-secondary/50 border-0 text-foreground"
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Interactive Demo
              </Badge>

              <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-8 text-foreground leading-[1.1]">
                Experience the <br />
                <span className="text-muted-foreground">Digital Handshake.</span>
              </h1>

              <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                See exactly what they will see. <br />
                Fast, professional, and friction-free.
              </p>
            </motion.div>

            {/* CTA Box */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="hidden lg:block pt-4"
            >
              <div className="bg-secondary/30 rounded-3xl p-8 border border-border relative overflow-hidden">
                <div className="relative z-10">
                  <h3 className="text-2xl font-bold mb-3">Ready to proof it?</h3>
                  <p className="text-muted-foreground mb-8 text-base">
                    Stop hoping they&apos;ll keep their word. Start proving they agreed.
                  </p>
                  <Link href="/dashboard">
                    <Button
                      size="xl"
                      className="w-full text-base rounded-2xl shadow-lg shadow-primary/10 h-14"
                    >
                      Create a Deal
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                </div>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN: Interactive Document - Compact */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="relative"
          >
            {/* The Document Card */}
            <Card className="overflow-hidden border shadow-card bg-card w-full">
              {/* Creator Info Header - Compact */}
              <div className="p-4 border-b flex items-center justify-between bg-background">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-linear-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold shadow-lg shadow-primary/20 text-sm">
                    AJ
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Alex Johnson</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Created {currentDate}
                    </p>
                  </div>
                </div>
                {step === "sealed" ? (
                  <Badge variant="success" className="gap-1 px-2 h-6 text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    Confirmed
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1 px-2 h-6 text-xs">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                )}
              </div>

              {/* Document Body - Compact */}
              <div className="bg-muted dark:bg-muted/30 border-b py-4 px-5">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <PenLine className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-lg leading-tight">
                      Freelance Design Contract
                    </CardTitle>
                    <CardDescription className="mt-0.5 text-xs">
                      Agreement for Brand Identity Project
                    </CardDescription>
                  </div>
                </div>
              </div>

              <CardContent className="p-5 space-y-3 bg-card">
                {/* Deal Metadata Grid - Compact */}
                <div className="grid grid-cols-2 gap-3 pb-3 border-b">
                  <div className="flex items-center gap-2 text-xs">
                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Recipient:</span>
                    <span className="font-medium">You</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Hash className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="text-muted-foreground">Deal ID:</span>
                    <Badge variant="outline" className="font-mono text-[10px] h-5 px-1.5">
                      DEMO-123
                    </Badge>
                  </div>
                </div>

                {/* Terms List - Compact */}
                <div className="space-y-0.5">
                  <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">
                    Terms
                  </h4>

                  <div className="flex justify-between items-center py-2 border-b border-border/50 text-sm">
                    <span className="text-muted-foreground">Service</span>
                    <span className="font-medium">Logo & Brand Identity</span>
                  </div>

                  <div className="flex justify-between items-center py-2 border-b border-border/50 text-sm">
                    <span className="text-muted-foreground">Amount</span>
                    <span className="font-medium">$1,500.00</span>
                  </div>

                  <div className="flex justify-between items-center py-2 last:border-0 text-sm">
                    <span className="text-muted-foreground">Timeline</span>
                    <span className="font-medium">2 Weeks</span>
                  </div>
                </div>
              </CardContent>

              {/* Interactive Area - Compact */}
              <div className="bg-muted/10 border-t p-5 min-h-[280px] flex flex-col justify-center">
                <AnimatePresence mode="wait">
                  {/* 1. Review */}
                  {step === "review" && (
                    <motion.div
                      key="review"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="text-center w-full"
                    >
                      <div className="flex flex-col items-center gap-5">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Shield className="h-3.5 w-3.5" />
                          <span>End-to-end encrypted</span>
                        </div>
                        <Button
                          size="lg"
                          className="w-full sm:w-auto shadow-lg shadow-primary/20 text-base px-10 h-12 rounded-xl"
                          onClick={handleStartSign}
                        >
                          Sign to Accept
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  )}

                  {/* 2. Signing */}
                  {step === "signing" && (
                    <motion.div
                      key="signing"
                      layout
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="w-full space-y-4"
                    >
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-sm">Draw your signature</h3>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleReset}
                          className="h-7 text-xs px-2"
                        >
                          Cancel
                        </Button>
                      </div>

                      {/* Signature Pad Container */}
                      <div className="w-full">
                        <SignaturePad
                          onSignatureChange={setSignature}
                          className="w-full space-y-2"
                        />
                      </div>

                      <Button
                        className="w-full h-11 text-sm shadow-lg shadow-primary/20 rounded-xl"
                        onClick={handleSeal}
                        disabled={!signature}
                      >
                        <Lock className="h-4 w-4 mr-2" />
                        Seal Agreement
                      </Button>
                    </motion.div>
                  )}

                  {/* 3. Sealing */}
                  {step === "sealing" && (
                    <motion.div
                      key="sealing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="py-6 text-center w-full"
                    >
                      <div className="flex flex-col items-center justify-center gap-5">
                        <PulsingLock />
                        <div className="space-y-2 w-full max-w-xs mx-auto">
                          <h3 className="text-base font-semibold">Cryptographic Sealing</h3>
                          <div className="font-mono text-[10px] text-muted-foreground bg-secondary/50 px-3 py-2 rounded-lg border border-border/50 break-all">
                            <ScrambleText text={demoHash} />
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Creating immutable proof...
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* 4. Sealed */}
                  {step === "sealed" && (
                    <motion.div
                      key="sealed"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="w-full space-y-4"
                    >
                      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 flex items-start gap-3">
                        <div className="h-6 w-6 rounded-full bg-emerald-500 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                          <CheckCircle2 className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <h3 className="font-semibold text-sm text-emerald-900 dark:text-emerald-100">
                            Deal Sealed
                          </h3>
                          <p className="text-xs text-emerald-800/80 dark:text-emerald-200/80 mt-0.5">
                            Signed, sealed, and legally binding.
                          </p>
                        </div>
                      </div>

                      <div className="grid sm:grid-cols-2 gap-3">
                        <div className="border rounded-xl p-3 bg-background/50">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                            Signature
                          </div>
                          {signature && (
                            // eslint-disable-next-line @next/next/no-img-element -- base64 data URL for signature
                            <img
                              src={signature}
                              alt="Signature"
                              className="h-10 object-contain opacity-90 dark:invert"
                            />
                          )}
                        </div>
                        <div className="border rounded-xl p-3 bg-background/50 flex flex-col justify-center">
                          <div className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                            Digital Seal
                          </div>
                          <div className="font-mono text-[10px] text-muted-foreground break-all leading-tight">
                            {demoHash.slice(0, 32)}...
                          </div>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-3 pt-1">
                        <Button
                          className="flex-1 gap-2 h-10 text-xs rounded-xl"
                          variant="outline"
                          onClick={handleReset}
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          Try Again
                        </Button>
                        <Link href="/dashboard" className="flex-1">
                          <Button className="w-full gap-2 shadow-md h-10 text-xs rounded-xl">
                            <Sparkles className="h-3.5 w-3.5" />
                            Create a Deal
                          </Button>
                        </Link>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </Card>
          </motion.div>

          {/* Mobile Only CTA */}
          <div className="lg:hidden pb-12">
            <div className="bg-secondary/30 rounded-3xl p-6 border border-border relative overflow-hidden">
              <div className="relative z-10 text-center">
                <h3 className="text-xl font-bold mb-2">Ready to proof it?</h3>
                <p className="text-muted-foreground mb-4 text-sm">
                  Stop hoping they&apos;ll keep their word. Start proving they agreed.
                </p>
                <Link href="/dashboard">
                  <Button
                    size="lg"
                    className="w-full text-base rounded-xl shadow-lg shadow-primary/10 h-12"
                  >
                    Create a Deal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
