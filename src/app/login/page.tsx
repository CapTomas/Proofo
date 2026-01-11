"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, ArrowRight, Shield, AlertCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  signInWithEmail,
  signInWithGoogle,
  verifyOtp,
  isSupabaseConfigured,
  supabase,
} from "@/lib/supabase";
import { useAppStore } from "@/store";
import { AnimatedLogo } from "@/components/animated-logo";
import { OtpInput } from "@/components/otp-input";

/**
 * Error messages for different auth error codes
 */
const ERROR_MESSAGES: Record<string, string> = {
  no_code: "Authentication link was invalid. Please try again.",
  no_session: "Could not establish a session. Please try again.",
  exchange_failed: "Authentication failed. Please try again.",
  verification_failed: "Could not verify your identity. Please try again.",
  callback_exception: "An unexpected error occurred. Please try again.",
  session_expired: "Your session has expired. Please sign in again.",
  auth_callback_error: "Authentication failed. Please try again.",
};

import { LoginForm } from "@/components/login-form";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, user } = useAppStore();
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const isSupabaseReady = isSupabaseConfigured();
  const hasCheckedSessionRef = useRef(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (hasCheckedSessionRef.current) return;
    hasCheckedSessionRef.current = true;

    const checkSession = async () => {
      if (!isSupabaseReady) {
        if (user) {
          router.replace("/dashboard");
          return;
        }
        setIsCheckingSession(false);
        return;
      }

      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authUser && !authError) {
          const redirect = searchParams.get("redirect") || "/dashboard";
          router.replace(redirect);
          return;
        }

        if (user) {
          setUser(null);
          if (typeof window !== "undefined") {
            localStorage.removeItem("proofo-storage");
          }
        }
      } catch (err) {
        console.error("Session check error:", err);
      }

      setIsCheckingSession(false);
    };

    checkSession();
  }, [user, router, setUser, isSupabaseReady, searchParams]);

  if (isCheckingSession) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <AnimatedLogo size={48} className="text-foreground" />
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-linear-to-b from-background via-background to-muted/20" />
      <div
        className="absolute inset-0 z-0 cursor-pointer"
        onClick={() => router.push("/")}
        aria-label="Go back"
      />

      <div className="w-full max-w-md relative z-10">
        <LoginForm />
      </div>
    </div>
  );
}

function LoginLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <AnimatedLogo size={48} className="text-foreground" />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginLoading />}>
      <LoginContent />
    </Suspense>
  );
}
