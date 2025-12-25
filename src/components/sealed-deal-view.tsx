"use client";

import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Deal } from "@/types";
import { getUserInitials } from "@/lib/utils";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import {
  FileText,
  Copy,
  Lock,
  PenLine,
  Fingerprint,
  Send,
  Inbox,
  Users,
} from "lucide-react";

// Animation variants
const springTransition = {
  type: "spring" as const,
  stiffness: 400,
  damping: 30,
};

const slideUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: springTransition },
};

// Scramble text effect for hash
const ScrambleText = ({ text, className }: { text: string; className?: string }) => {
  const [displayText, setDisplayText] = useState(text);
  const chars = "0123456789abcdef";

  useEffect(() => {
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 2;
    }, 30);
    return () => clearInterval(interval);
  }, [text]);

  return <span className={className}>{displayText}</span>;
};

interface PartyProfile {
  name: string;
  avatarUrl?: string;
}

export interface SealedDealViewProps {
  deal: Deal;
  creatorProfile?: PartyProfile | null;
  recipientProfile?: PartyProfile | null;
  /** Show "You" badge on creator */
  isCreator?: boolean;
  /** Show "You" badge on recipient */
  isRecipient?: boolean;
  /** Recipient status label (e.g., "Signed", "Viewed 2h ago") */
  recipientStatusLabel?: string;
  /** Whether to show signature/seal card */
  showSignatureSeal?: boolean;
  /** Custom class for the container */
  className?: string;
}

/**
 * Shared component for displaying sealed deal content.
 * Used by both private deal page and public deal page.
 *
 * This is a presentation-only component - all data fetching
 * and authorization happens at the page level.
 */
export function SealedDealView({
  deal,
  creatorProfile,
  recipientProfile,
  isCreator = false,
  isRecipient = false,
  recipientStatusLabel,
  showSignatureSeal = true,
  className,
}: SealedDealViewProps) {
  const { copyToClipboard } = useCopyToClipboard();

  const creatorName = creatorProfile?.name || deal.creatorName || "Unknown";
  const recipientName = recipientProfile?.name || deal.recipientName || "Awaiting...";
  const isSealed = deal.status === "confirmed";

  return (
    <div className={className}>
      {/* Parties Card */}
      <motion.div variants={slideUp}>
        <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              <Users className="h-4 w-4" />
              Parties
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Creator */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-medium text-sm shadow-sm">
                  {creatorProfile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creatorProfile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    getUserInitials(creatorName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{creatorName}</p>
                    {isCreator && <Badge variant="secondary" className="text-[10px] h-4 shrink-0">You</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Creator
                  </p>
                </div>
              </motion.div>

              {/* Recipient */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                transition={{ type: "spring", stiffness: 400, damping: 17 }}
                className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default"
              >
                <div className={`h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm shadow-sm ${
                  isSealed
                    ? "bg-gradient-to-br from-emerald-500 to-emerald-600 text-white"
                    : "bg-muted text-muted-foreground"
                }`}>
                  {recipientProfile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={recipientProfile.avatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    getUserInitials(recipientName)
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{recipientName}</p>
                    {isRecipient && <Badge variant="secondary" className="text-[10px] h-4 shrink-0">You</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Inbox className="h-3 w-3" />
                    {recipientStatusLabel || (isSealed ? "Signed" : "Recipient")}
                  </p>
                </div>
              </motion.div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Terms Card */}
      <motion.div variants={slideUp} className="mt-4">
        <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                <FileText className="h-4 w-4" />
                Terms
              </div>
              <Badge variant="secondary" className="text-[10px]">
                {deal.terms.length} {deal.terms.length === 1 ? "term" : "terms"}
              </Badge>
            </div>
            <div className="space-y-2">
              {deal.terms.map((term, index) => (
                <motion.div
                  key={term.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer group/term"
                  onClick={() => {
                    copyToClipboard(`${term.label}: ${term.value}`);
                    toast.success(`Copied: ${term.label}`);
                  }}
                >
                  <span className="text-sm text-muted-foreground">{term.label}</span>
                  <span className="font-medium text-sm flex items-center gap-2">
                    {term.value}
                    <Copy className="h-3 w-3 text-muted-foreground opacity-0 group-hover/term:opacity-100 transition-opacity" />
                  </span>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Signature & Seal Card */}
      {showSignatureSeal && isSealed && (deal.signatureUrl || deal.dealSeal) && (
        <motion.div variants={slideUp} className="mt-4">
          <Card className="border border-emerald-500/20 shadow-sm bg-card rounded-xl overflow-hidden">
            <CardContent className="p-5 md:p-6">
              <div className="grid sm:grid-cols-2 gap-6">
                {/* Signature */}
                {deal.signatureUrl && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      <PenLine className="h-4 w-4" />
                      Signature
                    </div>
                    <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 flex justify-center items-center min-h-[80px]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={deal.signatureUrl} alt="Signature" className="max-h-16 object-contain" />
                    </div>
                  </div>
                )}

                {/* Seal */}
                {deal.dealSeal && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                      <Fingerprint className="h-4 w-4" />
                      Cryptographic Seal
                    </div>
                    <div
                      className="p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-pointer hover:bg-secondary/50 transition-colors group"
                      onClick={() => {
                        copyToClipboard(deal.dealSeal!);
                        toast.success("Hash copied!");
                      }}
                    >
                      <code className="text-[10px] font-mono break-all text-muted-foreground group-hover:text-foreground transition-colors">
                        <ScrambleText text={deal.dealSeal} />
                      </code>
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center gap-1.5 text-xs text-emerald-600">
                          <Lock className="h-3 w-3" />
                          SHA-256
                        </div>
                        <span className="text-xs text-muted-foreground group-hover:text-foreground transition-colors">
                          Click to copy
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
