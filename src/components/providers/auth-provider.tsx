"use client";

import { useEffect, useRef, useCallback } from "react";
import { supabase, isSupabaseConfigured, getCurrentUser } from "@/lib/supabase";
import { useAppStore } from "@/store";
import { getUserDealsAction, ensureProfileExistsAction } from "@/app/actions/deal-actions";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { user, setUser, setDeals, setIsLoading, setNeedsOnboarding } = useAppStore();
  const isInitializedRef = useRef(false);

  const syncUserAndDeals = useCallback(async () => {
    if (!isSupabaseConfigured()) {
      setIsLoading(false);
      return;
    }

    try {
      // Set loading state at the start to prevent premature renders
      setIsLoading(true);

      // 1. Check Session First
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        // If we have a user in store but no session, it's stale. Clear it.
        // This prevents the "Redirect Loop" where client thinks it's logged in but server doesn't.
        const currentUser = useAppStore.getState().user;
        if (currentUser) {
          setUser(null);
          setDeals([]);
          if (typeof window !== "undefined") {
            localStorage.removeItem("proofo-storage");
          }
        }
        setIsLoading(false);
        return;
      }

      // 2. We have a session - fetch user data immediately

      // 3. Fetch Profile & Deals in Parallel
      const [profileResult, dealsResult] = await Promise.all([
        ensureProfileExistsAction(),
        getUserDealsAction()
      ]);

      // 4. Update User State
      if (profileResult.profile) {
        const fullUser = await getCurrentUser();
        const currentUser = useAppStore.getState().user;
        // Only update if changed to avoid re-renders
        if (fullUser && JSON.stringify(fullUser) !== JSON.stringify(currentUser)) {
          setUser(fullUser);
        }
        setNeedsOnboarding(!profileResult.profile.hasCompletedOnboarding);
      }

      // 5. Update Deals State
      if (dealsResult.deals) {
        setDeals(dealsResult.deals);
      }

    } catch (error) {
      console.error("Error syncing auth state:", error);
    } finally {
      setIsLoading(false);
    }
  }, [setUser, setDeals, setIsLoading, setNeedsOnboarding]);

  useEffect(() => {
    if (isInitializedRef.current) return;
    isInitializedRef.current = true;

    // Start sync immediately (it will set loading state internally)
    syncUserAndDeals();

    if (!isSupabaseConfigured()) return;

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          await syncUserAndDeals();
        } else if (event === "SIGNED_OUT") {
          setUser(null);
          setDeals([]);
          setNeedsOnboarding(false);
          setIsLoading(false);
          if (typeof window !== "undefined") {
            localStorage.removeItem("proofo-storage");
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [syncUserAndDeals, setUser, setDeals, setNeedsOnboarding, setIsLoading]);

  return <>{children}</>;
}
