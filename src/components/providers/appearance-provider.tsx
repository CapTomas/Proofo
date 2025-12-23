"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import {
  getAppearancePreferencesAction,
  updateAppearancePreferencesAction,
  AppearancePreferences
} from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { toast } from "sonner";

// Local storage key for demo mode
const APPEARANCE_STORAGE_KEY = "proofo-appearance-preferences";

// Context type
interface AppearanceContextType {
  compactMode: boolean;
  fontScale: number;
  reducedMotion: boolean;
  isLoading: boolean;
  setCompactMode: (value: boolean) => Promise<void>;
  setFontScale: (value: number) => Promise<void>;
  setReducedMotion: (value: boolean) => Promise<void>;
}

// Default values
const defaultPreferences: AppearancePreferences = {
  compactMode: false,
  fontScale: 1.0,
  reducedMotion: false,
};

// Create context
const AppearanceContext = createContext<AppearanceContextType | undefined>(undefined);

// Hook to use appearance context
export function useAppearance() {
  const context = useContext(AppearanceContext);
  if (context === undefined) {
    throw new Error("useAppearance must be used within an AppearanceProvider");
  }
  return context;
}

// Apply appearance settings to document
function applyAppearanceToDOM(prefs: AppearancePreferences) {
  const root = document.documentElement;

  // Compact mode - add/remove class
  if (prefs.compactMode) {
    root.classList.add("compact-mode");
  } else {
    root.classList.remove("compact-mode");
  }

  // Font scale - set CSS variable (clamped between 0.8 and 1.2)
  const clampedScale = Math.max(0.8, Math.min(1.2, prefs.fontScale));
  root.style.setProperty("--font-scale", clampedScale.toString());
  root.style.fontSize = `${clampedScale * 100}%`;

  // Reduced motion - add/remove class
  if (prefs.reducedMotion) {
    root.classList.add("reduced-motion");
  } else {
    root.classList.remove("reduced-motion");
  }
}

// Provider component
export function AppearanceProvider({ children }: { children: ReactNode }) {
  const [compactMode, setCompactModeState] = useState(defaultPreferences.compactMode);
  const [fontScale, setFontScaleState] = useState(defaultPreferences.fontScale);
  const [reducedMotion, setReducedMotionState] = useState(defaultPreferences.reducedMotion);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences on mount
  useEffect(() => {
    const loadPreferences = async () => {
      try {
        // Check for user's system preference for reduced motion first
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (isSupabaseConfigured()) {
          const { preferences, error } = await getAppearancePreferencesAction();
          if (!error && preferences) {
            // Use system preference for reduced motion if user hasn't explicitly set it
            const prefs = {
              ...preferences,
              reducedMotion: preferences.reducedMotion || prefersReducedMotion,
            };
            setCompactModeState(prefs.compactMode);
            setFontScaleState(prefs.fontScale);
            setReducedMotionState(prefs.reducedMotion);
            applyAppearanceToDOM(prefs);

            // Sync to local storage
            localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(prefs));
          } else {
            // DB load failed or empty, try local storage
            const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
            if (stored) {
              const prefs = JSON.parse(stored) as AppearancePreferences;
              setCompactModeState(prefs.compactMode);
              setFontScaleState(prefs.fontScale);
              setReducedMotionState(prefs.reducedMotion);
              applyAppearanceToDOM(prefs);
            } else {
              // Apply defaults
              const prefs = { ...defaultPreferences, reducedMotion: prefersReducedMotion };
              applyAppearanceToDOM(prefs);
              setReducedMotionState(prefersReducedMotion);
            }
          }
        } else {
          // Demo mode - load from localStorage
          const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
          if (stored) {
            try {
              const prefs = JSON.parse(stored) as AppearancePreferences;
              setCompactModeState(prefs.compactMode);
              setFontScaleState(prefs.fontScale);
              setReducedMotionState(prefs.reducedMotion || prefersReducedMotion);
              applyAppearanceToDOM(prefs);
            } catch {
              // Invalid stored data, use defaults
              const prefs = { ...defaultPreferences, reducedMotion: prefersReducedMotion };
              applyAppearanceToDOM(prefs);
            }
          } else {
            // Use defaults with system motion preference
            const prefs = { ...defaultPreferences, reducedMotion: prefersReducedMotion };
            applyAppearanceToDOM(prefs);
            setReducedMotionState(prefersReducedMotion);
          }
        }
      } catch (error) {
        console.error("Failed to load appearance preferences:", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadPreferences();
  }, []);

  // Listen for system reduced motion preference changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const handleChange = (e: MediaQueryListEvent) => {
      // Only auto-update if user hasn't explicitly set a preference
      if (!isSupabaseConfigured()) {
        const stored = localStorage.getItem(APPEARANCE_STORAGE_KEY);
        if (!stored) {
          setReducedMotionState(e.matches);
          applyAppearanceToDOM({ compactMode, fontScale, reducedMotion: e.matches });
        }
      }
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, [compactMode, fontScale]);

  // Save to storage/database
  const savePreferences = useCallback(async (prefs: Partial<AppearancePreferences>) => {
    // Always save to localStorage as backup/cache
    const current = { compactMode, fontScale, reducedMotion };
    const newPrefs = { ...current, ...prefs };
    localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(newPrefs));

    if (isSupabaseConfigured()) {
      const { error } = await updateAppearancePreferencesAction(prefs);
      if (error) {
        // If DB fails (e.g. missing columns), strictly warn but don't break the UI
        // We already saved to localStorage above
        console.warn("Failed to persist appearance to database:", error);

        // Use a less alarming toast if it's likely a migration issue
        if (error.includes("column") || error.includes("relation")) {
           // Silent fail for migration issues, user still sees changes locally
        } else {
           toast.error("Cloud save failed, settings saved locally");
        }
        return false;
      }
    }
    return true;
  }, [compactMode, fontScale, reducedMotion]);

  // Setters
  const setCompactMode = useCallback(async (value: boolean) => {
    setCompactModeState(value);
    applyAppearanceToDOM({ compactMode: value, fontScale, reducedMotion });
    await savePreferences({ compactMode: value });
  }, [fontScale, reducedMotion, savePreferences]);

  const setFontScale = useCallback(async (value: number) => {
    const clampedValue = Math.max(0.8, Math.min(1.2, value));
    setFontScaleState(clampedValue);
    applyAppearanceToDOM({ compactMode, fontScale: clampedValue, reducedMotion });
    await savePreferences({ fontScale: clampedValue });
  }, [compactMode, reducedMotion, savePreferences]);

  const setReducedMotion = useCallback(async (value: boolean) => {
    setReducedMotionState(value);
    applyAppearanceToDOM({ compactMode, fontScale, reducedMotion: value });
    await savePreferences({ reducedMotion: value });
  }, [compactMode, fontScale, savePreferences]);

  return (
    <AppearanceContext.Provider
      value={{
        compactMode,
        fontScale,
        reducedMotion,
        isLoading,
        setCompactMode,
        setFontScale,
        setReducedMotion,
      }}
    >
      {children}
    </AppearanceContext.Provider>
  );
}
