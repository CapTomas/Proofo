"use client";

import { useState } from "react";
import { motion } from "framer-motion";
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
} from "lucide-react";
import Link from "next/link";

export default function DemoPage() {
  const [signature, setSignature] = useState<string | null>(null);
  const [isSealed, setIsSealed] = useState(false);

  const handleSeal = () => {
    if (signature) {
      setIsSealed(true);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl">Proofo</span>
          </Link>
          <Link href="/dashboard">
            <Button>
              Get Started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="text-center mb-12">
          <Badge variant="secondary" className="mb-4">
            <Sparkles className="h-3 w-3 mr-1" />
            Interactive Demo
          </Badge>
          <h1 className="text-3xl md:text-4xl font-bold mb-4">
            See How It Works
          </h1>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Try the signature experience yourself. This is exactly what your recipients will see when you send them a deal.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
          {/* Demo Deal Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="text-3xl">🤝</span>
                <div>
                  <CardTitle>Sample Agreement</CardTitle>
                  <CardDescription>From Demo User</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-3">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Agreement Type</span>
                  <span className="font-medium">Simple Agreement</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Terms</span>
                  <span className="font-medium">Demo collaboration</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Shield className="h-4 w-4 text-green-500" />
                <span>This deal will be cryptographically sealed</span>
              </div>
            </CardContent>
          </Card>

          {/* Signature Demo */}
          <Card>
            <CardHeader>
              <CardTitle>Try the Signature Pad</CardTitle>
              <CardDescription>
                Draw your signature below to see the sealing experience
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {!isSealed ? (
                <>
                  <SignaturePad
                    onSignatureChange={setSignature}
                    className="flex flex-col items-center"
                  />
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleSeal}
                    disabled={!signature}
                  >
                    <FileCheck className="h-4 w-4 mr-2" />
                    Seal This Deal
                  </Button>
                </>
              ) : (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center py-8"
                >
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="h-16 w-16 rounded-full bg-green-500 flex items-center justify-center mx-auto mb-4"
                  >
                    <CheckCircle2 className="h-8 w-8 text-white" />
                  </motion.div>
                  <h3 className="text-xl font-bold mb-2">Deal Sealed!</h3>
                  <p className="text-muted-foreground mb-4">
                    This is what your recipients will experience.
                  </p>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsSealed(false);
                      setSignature(null);
                    }}
                  >
                    Try Again
                  </Button>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CTA */}
        <div className="text-center mt-12">
          <h2 className="text-2xl font-bold mb-4">Ready to create real deals?</h2>
          <p className="text-muted-foreground mb-6">
            Start creating enforceable agreements in seconds.
          </p>
          <Link href="/dashboard">
            <Button size="lg">
              Create Your First Deal
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </main>
    </div>
  );
}
