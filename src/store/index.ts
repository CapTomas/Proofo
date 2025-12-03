import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Deal, User, DealStatus, AuditLogEntry } from "@/types";
import { generatePublicId, generateAccessToken, calculateDealSeal } from "@/lib/crypto";

interface AppState {
  // User state
  user: User | null;
  setUser: (user: User | null) => void;

  // Onboarding state
  needsOnboarding: boolean;
  setNeedsOnboarding: (needs: boolean) => void;

  // Deals state
  deals: Deal[];
  setDeals: (deals: Deal[]) => void;
  addDeal: (deal: Deal) => void;
  updateDeal: (id: string, updates: Partial<Deal>) => void;
  removeDeal: (id: string) => void;
  getDealById: (id: string) => Deal | undefined;
  getDealByPublicId: (publicId: string) => Deal | undefined;
  voidDeal: (id: string) => void;
  confirmDeal: (id: string, signatureData: string, recipientEmail?: string) => Promise<Deal | null>;

  // Audit log state
  auditLogs: AuditLogEntry[];
  addAuditLog: (entry: Omit<AuditLogEntry, "id" | "createdAt">) => void;
  getAuditLogsForDeal: (dealId: string) => AuditLogEntry[];

  // UI state
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  // Theme
  theme: "light" | "dark" | "system";
  setTheme: (theme: "light" | "dark" | "system") => void;
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User state
      user: null,
      setUser: (user) => set({ user }),

      // Onboarding state
      needsOnboarding: false,
      setNeedsOnboarding: (needs) => set({ needsOnboarding: needs }),

      // Deals state
      deals: [],
      setDeals: (deals) => set({ deals }),
      addDeal: (deal) => set((state) => ({ deals: [deal, ...state.deals] })),
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
      getDealById: (id) => get().deals.find((deal) => deal.id === id),
      getDealByPublicId: (publicId) => 
        get().deals.find((deal) => deal.publicId === publicId),
      voidDeal: (id) => {
        const state = get();
        const deal = state.deals.find((d) => d.id === id);
        if (deal && deal.status !== "voided") {
          set({
            deals: state.deals.map((d) =>
              d.id === id
                ? { ...d, status: "voided" as DealStatus, voidedAt: new Date().toISOString() }
                : d
            ),
          });
          // Add audit log entry
          state.addAuditLog({
            dealId: id,
            eventType: "deal_voided",
            actorId: state.user?.id || null,
            actorType: "creator",
            metadata: { previousStatus: deal.status },
          });
        }
      },
      confirmDeal: async (id, signatureData, recipientEmail) => {
        const state = get();
        const deal = state.deals.find((d) => d.id === id);
        if (!deal || deal.status !== "pending") return null;

        // Set status to sealing
        set({
          deals: state.deals.map((d) =>
            d.id === id ? { ...d, status: "sealing" as DealStatus } : d
          ),
        });

        // Calculate deal seal (SHA-256 hash)
        const timestamp = new Date().toISOString();
        const dealSeal = await calculateDealSeal({
          dealId: deal.id,
          terms: JSON.stringify(deal.terms),
          signatureUrl: signatureData,
          timestamp,
        });

        // Update deal with confirmed status
        const confirmedDeal = {
          ...deal,
          status: "confirmed" as DealStatus,
          confirmedAt: timestamp,
          signatureUrl: signatureData,
          dealSeal,
          recipientEmail: recipientEmail || deal.recipientEmail,
        };

        set({
          deals: state.deals.map((d) => (d.id === id ? confirmedDeal : d)),
        });

        // Add audit log entry
        state.addAuditLog({
          dealId: id,
          eventType: "deal_confirmed",
          actorId: null,
          actorType: "recipient",
          metadata: { 
            dealSeal,
            hasEmail: !!recipientEmail,
          },
        });

        return confirmedDeal;
      },

      // Audit log state
      auditLogs: [],
      addAuditLog: (entry) =>
        set((state) => ({
          auditLogs: [
            {
              ...entry,
              id: generatePublicId(),
              createdAt: new Date().toISOString(),
            },
            ...state.auditLogs,
          ],
        })),
      getAuditLogsForDeal: (dealId) =>
        get().auditLogs.filter((log) => log.dealId === dealId),

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
        auditLogs: state.auditLogs,
        theme: state.theme,
      }),
    }
  )
);

// Helper function to create a new deal
export function createNewDeal(
  creator: User,
  data: {
    templateId: string;
    title: string;
    recipientName: string;
    terms: { label: string; value: string; type: string }[];
    description?: string;
  }
): Deal {
  const id = generatePublicId();
  const publicId = generatePublicId();
  const accessToken = generateAccessToken();

  return {
    id,
    publicId,
    creatorId: creator.id,
    creatorName: creator.name,
    recipientName: data.recipientName,
    title: data.title,
    description: data.description || "",
    terms: data.terms.map((t, i) => ({
      id: `term-${i}`,
      label: t.label,
      value: t.value,
      type: t.type as "text" | "number" | "date" | "currency",
    })),
    status: "pending",
    createdAt: new Date().toISOString(),
    accessToken,
  };
}
