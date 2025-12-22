"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Mail, ArrowRight, Shield, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signInWithEmail, signInWithGoogle, verifyOtp, isSupabaseConfigured, supabase } from "@/lib/supabase";
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

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setUser, user } = useAppStore();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const isSupabaseReady = isSupabaseConfigured();
  const hasCheckedSessionRef = useRef(false);

  // Check if user is already authenticated
  useEffect(() => {
    if (hasCheckedSessionRef.current) return;
    hasCheckedSessionRef.current = true;

    const checkSession = async () => {
      // Demo mode bypass
      if (!isSupabaseReady) {
        if (user) {
          router.replace("/dashboard");
          return;
        }
        setIsCheckingSession(false);
        return;
      }

      try {
        // CRITICAL: Use getUser() not getSession() for security
        // getUser() validates the JWT with Supabase Auth server
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

        if (authUser && !authError) {
          // Valid session exists - redirect to intended destination
          const redirect = searchParams.get("redirect") || "/dashboard";
          router.replace(redirect);
          return;
        }

        // No valid session - clear any stale client state
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

  // Handle error from URL params
  useEffect(() => {
    const errorParam = searchParams.get("error");
    const messageParam = searchParams.get("message");

    if (errorParam) {
      const errorMessage = messageParam
        ? decodeURIComponent(messageParam)
        : ERROR_MESSAGES[errorParam] || "Authentication failed. Please try again.";
      setError(errorMessage);

      // Clear error params from URL without triggering a navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      url.searchParams.delete("message");
      window.history.replaceState({}, "", url.toString());
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    // Demo mode
    if (!isSupabaseReady) {
      setUser({
        id: `demo-${Date.now()}`,
        email,
        name: email.split("@")[0],
        createdAt: new Date().toISOString(),
      });
      router.push("/dashboard");
      return;
    }

    try {
      const { error: authError } = await signInWithEmail(email);

      if (authError) {
        setError(authError.message);
      } else {
        setIsSent(true);
      }
    } catch (err) {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOtp = async (code: string) => {
    setError(null);
    setIsVerifyingOtp(true);

    try {
      const { error: verifyError, session } = await verifyOtp(email, code);

      if (session) {
        // Success - redirect to dashboard
        // Don't show any errors, just redirect immediately
        const redirect = searchParams.get("redirect") || "/dashboard";
        router.push(redirect);
      } else if (verifyError) {
        // Only show error if there's no session
        setError(verifyError.message);
        setOtpCode(""); // Clear on error
        setIsVerifyingOtp(false);
      }
    } catch (err) {
      setError("Failed to verify code. Please try again.");
      setOtpCode(""); // Clear on error
      setIsVerifyingOtp(false);
    }
    // Note: Don't set isVerifyingOtp to false on success - keep it true until redirect
  };

  const handleGoogleSignIn = async () => {
    setError(null);

    // Demo mode
    if (!isSupabaseReady) {
      setUser({
        id: `demo-${Date.now()}`,
        email: "demo@proofo.app",
        name: "Demo User",
        createdAt: new Date().toISOString(),
      });
      router.push("/dashboard");
      return;
    }

    const { error: authError } = await signInWithGoogle();
    if (authError) {
      setError(authError.message);
    }
  };

  // Show loading while checking session
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
      <div className="absolute inset-0 z-0 cursor-pointer" onClick={() => router.push("/")} aria-label="Go back" />

      <div className="w-full max-w-md relative z-10">
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <AnimatedLogo size={48} className="text-foreground" />
          <span className="font-bold text-3xl tracking-tight">Proofo</span>
        </Link>

        <Card className="shadow-2xl shadow-black/5 border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="text-base">Sign in to manage your deals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {!isSent ? (
              <>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                {!isSupabaseReady && (
                  <div className="p-3 rounded-lg bg-muted border border-border flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">Demo mode: Local storage only.</p>
                  </div>
                )}

                <div className="space-y-3">
                  <Button
                    variant="outline"
                    className="w-full h-12 text-base gap-3"
                    size="lg"
                    onClick={handleGoogleSignIn}
                    type="button"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                    </svg>
                    Continue with Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center"><Separator /></div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">Or continue with email</span>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-medium">Email address</Label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-11 h-12"
                        required
                        autoFocus
                        autoComplete="email"
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-12 text-base shadow-lg shadow-primary/20"
                    size="lg"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <>Send Magic Link <ArrowRight className="ml-2 h-5 w-5" /></>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-5"
              >
                <div className="text-center">
                  <div className="h-16 w-16 rounded-full bg-linear-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Mail className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold mb-1">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    We sent a code to <strong className="text-foreground">{email}</strong>
                  </p>
                </div>

                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2"
                  >
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </motion.div>
                )}

                <div className="space-y-4">
                  <div>
                    <Label className="text-sm font-medium mb-3 block text-center">Enter verification code</Label>
                    <OtpInput
                      length={6}
                      value={otpCode}
                      onChange={setOtpCode}
                      onComplete={handleVerifyOtp}
                      disabled={isVerifyingOtp}
                      autoFocus
                    />
                    {isVerifyingOtp && (
                      <div className="flex items-center justify-center gap-2 mt-3 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Verifying...</span>
                      </div>
                    )}
                  </div>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center"><Separator /></div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-card px-3 text-muted-foreground">Or</span>
                    </div>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Click the magic link in your email
                    </p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    onClick={() => { setIsSent(false); setOtpCode(""); setError(null); }}
                    className="text-sm"
                  >
                    Use different email
                  </Button>
                </div>
              </motion.div>
            )}
            <div className="pt-2">
              <p className="text-center text-sm text-muted-foreground">
                New to Proofo?{" "}
                <Link href="/deal/new" className="text-primary font-medium hover:underline">
                  Create Your First Proof
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>
        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Secure, encrypted authentication</span>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">Terms of Service</Link>
          {" "}and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">Privacy Policy</Link>
        </p>
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
