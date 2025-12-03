"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured, getCurrentUser } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { getUserDealsAction, ensureProfileExistsAction } from "@/app/actions/deal-actions";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setDeals, setIsLoading, setNeedsOnboarding } = useAppStore();
  const isInitializedRef = useRef(false);

  // Memoize the sync function to prevent recreating on each render
  const syncUserAndDeals = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      
      // First ensure profile exists and check onboarding status
      const { profile, error: profileError } = await ensureProfileExistsAction();
      
      if (profileError || !profile) {
        // Not authenticated or error
        setUser(null);
        setDeals([]);
        setNeedsOnboarding(false);
        setIsLoading(false);
        return;
      }

      // Get full user info
      const user = await getCurrentUser();
      
      if (user) {
        setUser(user);
        // Set onboarding flag based on profile status
        setNeedsOnboarding(!profile.hasCompletedOnboarding);
        
        // Fetch user's deals from Supabase using server action
        const { deals, error } = await getUserDealsAction();
        if (error) {
          console.error("Error fetching user deals:", error);
        }
        // Set deals regardless of error (empty array if error or no deals)
        setDeals(deals || []);
      } else {
        setUser(null);
        setDeals([]);
        setNeedsOnboarding(false);
      }
    } catch (error) {
      console.error("Error syncing auth state:", error);
      setUser(null);
      setDeals([]);
      setNeedsOnboarding(false);
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setDeals, setIsLoading, setNeedsOnboarding]);

  useEffect(() => {
    // Prevent double initialization in development mode
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Initial sync on mount
    syncUserAndDeals();

    // Set up auth state listener
    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await syncUserAndDeals();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setDeals([]);
          setNeedsOnboarding(false);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncUserAndDeals, setUser, setDeals, setNeedsOnboarding]);

  return <>{children}</>;
}
