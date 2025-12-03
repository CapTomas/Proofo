"use client";

import { useState, useEffect, Suspense, useRef } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Mail,
  ArrowRight,
  Shield,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signInWithEmail, signInWithGoogle, isSupabaseConfigured, getCurrentUser } from "@/lib/supabase";
import { useAppStore } from "@/store";

function LoginContent() {
  const router = useRouter();
  const { setUser } = useAppStore();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isSupabaseReady = isSupabaseConfigured();
  const hasCheckedErrorRef = useRef(false);

  useEffect(() => {
    // Check for auth errors from callback (only once)
    if (!hasCheckedErrorRef.current) {
      hasCheckedErrorRef.current = true;
      const params = new URLSearchParams(window.location.search);
      if (params.get("error")) {
        // Use setTimeout to avoid synchronous setState in effect
        setTimeout(() => setError("Authentication failed. Please try again."), 0);
      }
    }
    
    // Check if already logged in
    const checkAuth = async () => {
      if (isSupabaseConfigured()) {
        const user = await getCurrentUser();
        if (user) {
          setUser(user);
          router.push("/dashboard");
        }
      }
    };
    checkAuth();
  }, [router, setUser]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    
    if (!isSupabaseReady) {
      // Demo mode - just create a local user
      setUser({
        id: `demo-${Date.now()}`,
        email,
        name: email.split("@")[0],
        createdAt: new Date().toISOString(),
      });
      router.push("/dashboard");
      return;
    }
    
    const { error: authError } = await signInWithEmail(email);
    
    setIsSubmitting(false);
    
    if (authError) {
      setError(authError.message);
    } else {
      setIsSent(true);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    
    if (!isSupabaseReady) {
      // Demo mode - create a demo user
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 gradient-bg-hero" />
      
      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <Link href="/" className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/25">
            <span className="text-primary-foreground font-bold text-2xl">P</span>
          </div>
          <span className="font-bold text-3xl tracking-tight">Proofo</span>
        </Link>

        <Card className="shadow-2xl shadow-black/5 border-border/50">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl">Welcome back</CardTitle>
            <CardDescription className="text-base">
              Sign in to manage your deals
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {!isSent ? (
              <>
                {/* Error message */}
                {error && (
                  <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Demo mode notice */}
                {!isSupabaseReady && (
                  <div className="p-3 rounded-lg bg-muted border border-border flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" />
                    <p className="text-sm text-muted-foreground">
                      Demo mode: No Supabase configured. Sign in to continue with local storage.
                    </p>
                  </div>
                )}

                {/* OAuth Buttons */}
                <div className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full h-12 text-base gap-3" 
                    size="lg"
                    onClick={handleGoogleSignIn}
                    type="button"
                  >
                    <svg className="h-5 w-5" viewBox="0 0 24 24">
                      <path
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        fill="#4285F4"
                      />
                      <path
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        fill="#34A853"
                      />
                      <path
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                        fill="#FBBC05"
                      />
                      <path
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                        fill="#EA4335"
                      />
                    </svg>
                    Continue with Google
                  </Button>
                </div>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <Separator />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-card px-3 text-muted-foreground">
                      Or continue with email
                    </span>
                  </div>
                </div>

                {/* Magic Link Form */}
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
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full"
                      />
                    ) : (
                      <>
                        Send Magic Link
                        <ArrowRight className="ml-2 h-5 w-5" />
                      </>
                    )}
                  </Button>
                </form>
              </>
            ) : (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center py-6"
              >
                <motion.div 
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: "spring", stiffness: 200 }}
                  className="h-20 w-20 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 flex items-center justify-center mx-auto mb-6"
                >
                  <Mail className="h-10 w-10 text-primary" />
                </motion.div>
                <h3 className="text-xl font-semibold mb-2">Check your email</h3>
                <p className="text-muted-foreground mb-6">
                  We sent a magic link to<br />
                  <strong className="text-foreground">{email}</strong>
                </p>
                <Button
                  variant="ghost"
                  onClick={() => setIsSent(false)}
                >
                  Use a different email
                </Button>
              </motion.div>
            )}

            <div className="pt-2">
              <p className="text-center text-sm text-muted-foreground">
                Don&apos;t have an account?{" "}
                <Link href="/dashboard" className="text-primary font-medium hover:underline">
                  Get started for free
                </Link>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Trust indicators */}
        <div className="flex items-center justify-center gap-2 mt-6 text-sm text-muted-foreground">
          <Shield className="h-4 w-4" />
          <span>Secure, encrypted authentication</span>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          By continuing, you agree to our{" "}
          <Link href="/terms" className="underline hover:text-foreground">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="underline hover:text-foreground">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

// Loading component for suspense
function LoginLoading() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2.5 mb-8">
          <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-xl shadow-primary/25">
            <span className="text-primary-foreground font-bold text-2xl">P</span>
          </div>
          <span className="font-bold text-3xl tracking-tight">Proofo</span>
        </div>
        <Card className="shadow-2xl shadow-black/5 border-border/50">
          <CardContent className="p-8 text-center">
            <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">Loading...</p>
          </CardContent>
        </Card>
      </div>
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
