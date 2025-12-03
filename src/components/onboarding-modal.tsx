"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  User,
  ArrowRight,
  Check,
  Sparkles,
  FileCheck,
  Shield,
  Zap,
} from "lucide-react";
import { useAppStore } from "@/store";
import { updateProfileAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";

interface OnboardingModalProps {
  onComplete: () => void;
}

export function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { user, setUser } = useAppStore();
  const [step, setStep] = useState(1);
  const [name, setName] = useState(user?.name || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    
    setIsSubmitting(true);
    setError(null);
    
    // If user is already logged in with Supabase, update their profile
    if (isSupabaseConfigured() && user?.id && !user.id.startsWith("demo-")) {
      const { error: updateError } = await updateProfileAction({ name: name.trim() });
      
      if (updateError) {
        setError(updateError);
        setIsSubmitting(false);
        return;
      }
      
      // Update local state
      setUser({
        ...user,
        name: name.trim(),
      });
    } else {
      // Demo mode - just create a local user
      setUser({
        id: user?.id || `user-${Date.now()}`,
        name: name.trim(),
        email: user?.email || "",
        createdAt: user?.createdAt || new Date().toISOString(),
      });
    }
    
    await new Promise((resolve) => setTimeout(resolve, 300));
    setIsSubmitting(false);
    setStep(2);
  };

  const handleComplete = () => {
    onComplete();
  };

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-2xl">
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CardHeader className="text-center pb-2">
                  <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Sparkles className="h-7 w-7 text-primary" />
                  </div>
                  <CardTitle className="text-2xl">Welcome to Proofo!</CardTitle>
                  <CardDescription className="text-base">
                    Let&apos;s set up your profile in 30 seconds
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  {error && (
                    <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
                      {error}
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-medium">
                      What should we call you?
                    </Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Your name"
                        className="pl-10"
                        autoFocus
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">
                      This will appear on your deals and receipts
                    </p>
                  </div>

                  <Button
                    onClick={handleSubmit}
                    disabled={!name.trim() || isSubmitting}
                    className="w-full"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </CardContent>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <CardHeader className="text-center pb-2">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", stiffness: 200 }}
                    className="h-14 w-14 rounded-full bg-emerald-500/10 flex items-center justify-center mx-auto mb-4"
                  >
                    <Check className="h-7 w-7 text-emerald-600" />
                  </motion.div>
                  <CardTitle className="text-2xl">You&apos;re all set, {name}!</CardTitle>
                  <CardDescription className="text-base">
                    Here&apos;s what you can do with Proofo
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6 pt-4">
                  <div className="space-y-3">
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <FileCheck className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Create Deals</p>
                        <p className="text-xs text-muted-foreground">
                          Record agreements with anyone in seconds
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Zap className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">No Signup Required</p>
                        <p className="text-xs text-muted-foreground">
                          Recipients just scan, sign, and agree
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
                      <Shield className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium text-sm">Cryptographic Proof</p>
                        <p className="text-xs text-muted-foreground">
                          Every deal is sealed with SHA-256
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button
                    onClick={handleComplete}
                    className="w-full"
                    size="lg"
                  >
                    Create My First Deal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </Card>
      </motion.div>
    </div>
  );
}
