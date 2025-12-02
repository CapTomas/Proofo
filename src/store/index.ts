import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Deal, User } from "@/types";

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;

  // Deals state
  deals: Deal[];
  setDeals: (deals: Deal[]) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  removeDeal: (id: string) => void;

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      // User state
      user: null,
      setUser: (user) => set({ user }),

      // Deals state
      deals: [],
      setDeals: (deals) => set({ deals }),
      addDeal: (deal) => set((state) => ({ deals: [...state.deals, deal] })),
      updateDeal: (id, updates) =>
        set((state) => ({
          deals: state.deals.map((deal) =>
            deal.id === id ? { ...deal, ...updates } : deal
          ),
        })),
      removeDeal: (id) =>
        set((state) => ({
          deals: state.deals.filter((deal) => deal.id !== id),
        })),

      // UI state
      isLoading: false,
      setIsLoading: (isLoading) => set({ isLoading }),

      // Theme
      theme: "system",
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: "proofo-storage",
      partialize: (state) => ({
        user: state.user,
        deals: state.deals,
        theme: state.theme,
      }),
    }
  )
);
