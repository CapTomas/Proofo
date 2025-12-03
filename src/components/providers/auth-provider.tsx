"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured, getCurrentUser } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { getUserDealsAction } from "@/app/actions/deal-actions";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setDeals, setIsLoading } = useAppStore();
  const isInitializedRef = useRef(false);

  // Memoize the sync function to prevent recreating on each render
  const syncUserAndDeals = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const user = await getCurrentUser();
      
      if (user) {
        setUser(user);
        // Fetch user's deals from Supabase using server action
        const { deals, error } = await getUserDealsAction();
        if (!error && deals.length > 0) {
          setDeals(deals);
        } else {
          // Clear deals if none found or error
          setDeals([]);
        }
      } else {
        setUser(null);
        setDeals([]);
      }
    } catch (error) {
      console.error("Error syncing auth state:", error);
      setUser(null);
      setDeals([]);
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setDeals, setIsLoading]);

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
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncUserAndDeals, setUser, setDeals]);

  return <>{children}</>;
}
