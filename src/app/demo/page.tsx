"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SignaturePad } from "@/components/signature-pad";
import {
  ArrowRight,
  CheckCircle2,
  Shield,
  FileCheck,
  Sparkles,
  Lock,
  Clock,
  Calendar,
  Undo2,
} from "lucide-react";
import Link from "next/link";

export default function DemoPage() {
  const [signature, setSignature] = useState<string | null>(null);
  const [isSealing, setIsSealing] = useState(false);
  const [isSealed, setIsSealed] = useState(false);

  const handleSeal = async () => {
    if (signature) {
      setIsSealing(true);
      await new Promise((resolve) => setTimeout(resolve, 2000));
      setIsSealing(false);
      setIsSealed(true);
    }
  };

  const handleReset = () => {
    setIsSealed(false);
    setSignature(null);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Proofo</span>
          </Link>
          <Link href="/dashboard">
            <Button className="shadow-lg shadow-primary/20">
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 py-12 max-w-5xl">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4 px-4 py-1.5">
            <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
            Interactive Demo
          </Badge>
          <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold mb-4 tracking-tight">
            Experience the Magic
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Try the signature experience yourself. This is exactly what your recipients will see when you send them a deal.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Demo Deal Card */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="overflow-hidden">
              <CardHeader className="bg-muted/30 border-b pb-4">
                <div className="flex items-center gap-4">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold">
                    AJ
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-lg">Alex Johnson</CardTitle>
                    <CardDescription className="flex items-center gap-1.5 mt-0.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Created today
                    </CardDescription>
                  </div>
                  <Badge variant="outline" className="gap-1.5">
                    <Clock className="h-3 w-3" />
                    Pending
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🤝</span>
                  <div>
                    <h3 className="font-semibold text-lg">Sample Agreement</h3>
                    <p className="text-sm text-muted-foreground">Simple Agreement</p>
                  </div>
                </div>

                <div className="p-4 bg-muted/50 rounded-xl space-y-3">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Agreement Type</span>
                    <span className="font-medium text-sm">Demo Collaboration</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground text-sm">Terms</span>
                    <span className="font-medium text-sm">Try the signature pad</span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground text-sm">Status</span>
                    <span className="font-medium text-sm">
                      {isSealed ? (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Sealed
                        </span>
                      ) : (
                        <span className="text-amber-600">Awaiting Signature</span>
                      )}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 text-sm text-muted-foreground pt-2">
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Shield className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span>Encrypted</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-emerald-500/10 flex items-center justify-center">
                      <Lock className="h-3.5 w-3.5 text-emerald-600" />
                    </div>
                    <span>Cryptographic Seal</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Signature Demo */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Try the Signature Pad</CardTitle>
                <CardDescription>
                  Draw your signature below to see the sealing experience
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <AnimatePresence mode="wait">
                  {!isSealed ? (
                    <motion.div
                      key="signing"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      <SignaturePad
                        onSignatureChange={setSignature}
                        className="flex flex-col items-center"
                      />
                      <Button
                        className="w-full mt-6 shadow-xl shadow-primary/25"
                        size="lg"
                        onClick={handleSeal}
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
                            <FileCheck className="h-5 w-5 mr-2" />
                            Seal This Deal
                          </>
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="sealed"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-8"
                    >
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ type: "spring", stiffness: 200 }}
                        className="h-20 w-20 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30"
                      >
                        <CheckCircle2 className="h-10 w-10 text-white" />
                      </motion.div>
                      <h3 className="text-2xl font-bold mb-2">Deal Sealed! 🎉</h3>
                      <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                        This is what your recipients will experience. Pretty nice, right?
                      </p>
                      <Button
                        variant="outline"
                        onClick={handleReset}
                        className="gap-2"
                      >
                        <Undo2 className="h-4 w-4" />
                        Try Again
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Sealing Animation Overlay */}
        <AnimatePresence>
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
                className="text-center"
              >
                <div className="relative h-32 w-32 mx-auto mb-8">
                  <motion.div
                    animate={{ scale: [1, 1.2, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity }}
                    className="absolute inset-0 rounded-full bg-primary/20"
                  />
                  <motion.div
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                    className="absolute inset-2 rounded-full bg-primary/30"
                  />
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                    className="absolute inset-4 rounded-full border-4 border-dashed border-primary/40"
                  />
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.3, type: "spring" }}
                    className="absolute inset-6 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/30"
                  >
                    <FileCheck className="h-10 w-10 text-primary-foreground" />
                  </motion.div>
                </div>
                <h2 className="text-2xl font-bold mb-2">Sealing Your Deal</h2>
                <p className="text-muted-foreground">Creating cryptographic proof...</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* CTA */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-center mt-16"
        >
          <Card className="border-0 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground overflow-hidden relative max-w-2xl mx-auto">
            <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
            <CardContent className="p-10 relative">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">Ready to create real deals?</h2>
              <p className="text-primary-foreground/80 mb-6 max-w-md mx-auto">
                Start creating enforceable agreements in seconds. No credit card required.
              </p>
              <Link href="/dashboard">
                <Button size="xl" variant="secondary" className="shadow-xl">
                  Create Your First Deal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      </main>
    </div>
  );
}
