"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { supabase, isSupabaseConfigured, getCurrentUser } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { getUserDealsAction, ensureProfileExistsAction } from "@/app/actions/deal-actions";
import { usePathname, useRouter } from "next/navigation";

/**
 * AuthProvider - Manages client-side authentication state
 *
 * The key insight for reliable auth:
 * 1. Middleware handles initial protection (server-side)
 * 2. This provider syncs the client state with server state
 * 3. We use onAuthStateChange to react to auth events
 * 4. We always validate with getUser() which hits Supabase servers
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, setUser, setDeals, setIsLoading, setNeedsOnboarding } = useAppStore();

  // Track initialization to prevent duplicate calls
  const isInitializedRef = useRef(false);
  const isSyncingRef = useRef(false);

  // Track if we're on a protected route
  const isProtectedRoute = pathname?.startsWith("/dashboard") ||
                           pathname?.startsWith("/settings") ||
                           pathname?.startsWith("/templates") ||
                           pathname?.startsWith("/verify");

  /**
   * Sync user data from server
   * This fetches the user profile and deals from the server
   */
  const syncUserData = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    // Prevent concurrent syncs
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;

    try {
      // CRITICAL: Use getUser() not getSession() for security
      // getUser() validates the JWT with Supabase Auth server
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

      if (authError || !authUser) {
        // No valid session - clear client state
        if (user) {
          setUser(null);
          setDeals([]);
          setNeedsOnboarding(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem("proofo-storage");
          }
        }
        setIsLoading(false);
        return;
      }

      // Fetch profile and deals in parallel
      const [profileResult, dealsResult] = await Promise.all([
        ensureProfileExistsAction(),
        getUserDealsAction()
      ]);

      // Update user state
      if (profileResult.profile) {
        const fullUser = await getCurrentUser();
        if (fullUser) {
          setUser(fullUser);
        }
        setNeedsOnboarding(!profileResult.profile.hasCompletedOnboarding);
      }

      // Update deals state
      if (dealsResult.deals) {
        setDeals(dealsResult.deals);
      }

    } catch (error) {
      console.error("Error syncing auth state:", error);
    } finally {
      isSyncingRef.current = false;
      setIsLoading(false);
    }
  }, [user, setUser, setDeals, setIsLoading, setNeedsOnboarding]);

  /**
   * Initial sync on mount
   */
  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Start with loading false - middleware already protected the route
    // This prevents the flash of loading state
    setIsLoading(false);

    // Sync user data
    syncUserData();
  }, [syncUserData, setIsLoading]);

  /**
   * Listen for auth state changes
   */
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log("Auth state change:", event);

        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          // Re-sync user data
          await syncUserData();
        } else if (event === "SIGNED_OUT") {
          // Clear all client state
          setUser(null);
          setDeals([]);
          setNeedsOnboarding(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem("proofo-storage");
          }

          // Redirect to home if on protected route
          if (isProtectedRoute) {
            router.push("/");
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncUserData, setUser, setDeals, setNeedsOnboarding, isProtectedRoute, router]);

  /**
   * Periodic session refresh for long-running sessions
   * This ensures tokens don't expire while the user is active
   */
  useEffect(() => {
    if (!isSupabaseConfigured()) return;

    // Refresh session every 10 minutes
    const interval = setInterval(async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser && user) {
        // Session expired - clear state
        setUser(null);
        setDeals([]);
        if (isProtectedRoute) {
          router.push("/login?error=session_expired");
        }
      }
    }, 10 * 60 * 1000);

    return () => clearInterval(interval);
  }, [user, setUser, setDeals, isProtectedRoute, router]);

  return <>{children}</>;
}

