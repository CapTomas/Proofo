"use client";

import React, { useState } from "react";
import {
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  Check,
  Download,
  ExternalLink,
  Hash,
  AlertTriangle,
  Users,
  Send,
  Inbox,
  Fingerprint,
  Lock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Deal } from "@/types";
import { timeAgo } from "@/lib/crypto";
import { cn, getUserInitials } from "@/lib/utils";
import { CopyableId } from "@/components/dashboard/shared-components";

// --- TYPES ---

export type VerificationStatus = "idle" | "verifying" | "valid" | "invalid" | "error";

export interface VerificationCardProps {
  deal: Deal;
  creatorProfile?: { name: string; avatarUrl?: string } | null;
  recipientProfile?: { name: string; avatarUrl?: string } | null;
  verificationStatus: VerificationStatus;
  calculatedHash?: string | null;
  onDownloadPDF?: () => void;
  isDownloading?: boolean;
  onViewDeal?: () => void;
}

// --- CONFIG ---

const getStatusConfig = (status: VerificationStatus) => {
  switch (status) {
    case "valid":
      return {
        label: "Authentic & Verified",
        color: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-950/20",
        border: "border-emerald-200 dark:border-emerald-800",
        icon: CheckCircle2,
        description: "Cryptographic proof matches our ledger.",
        spin: false,
      };
    case "invalid":
      return {
        label: "Verification Failed",
        color: "text-destructive",
        bg: "bg-destructive/10",
        border: "border-destructive/20",
        icon: XCircle,
        description: "The digital seal does not match the content.",
        spin: false,
      };
    case "verifying":
      return {
        label: "Verifying...",
        color: "text-primary",
        bg: "bg-primary/5",
        border: "border-primary/10",
        icon: RefreshCw,
        description: "Calculating cryptographic hashes...",
        spin: true,
      };
    case "error":
      return {
        label: "System Error",
        color: "text-amber-600",
        bg: "bg-amber-500/10",
        border: "border-amber-500/20",
        icon: AlertTriangle,
        description: "Could not complete verification.",
        spin: false,
      };
    default:
      return {
        label: "Ready to Verify",
        color: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
        icon: Shield,
        description: "Waiting for verification check...",
        spin: false,
      };
  }
};

export const VerificationCard = ({
  deal,
  creatorProfile,
  recipientProfile,
  verificationStatus,
  calculatedHash,
  onDownloadPDF,
  isDownloading,
  onViewDeal,
}: VerificationCardProps) => {
  const config = getStatusConfig(verificationStatus);
  const StatusIcon = config.icon;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 1. Header (Matches Private Deal Page) */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight text-foreground">{deal.title}</h2>

          <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
             <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                <Hash className="h-3.5 w-3.5" />
                <span className="font-mono text-xs">{deal.publicId}</span>
             </div>
             <span>•</span>
             <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {deal.confirmedAt ? `Signed ${timeAgo(deal.confirmedAt)}` : `Created ${timeAgo(deal.createdAt)}`}
             </span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
           {onViewDeal && (
            <Button variant="outline" size="sm" onClick={onViewDeal} className="gap-2 h-9">
              <ExternalLink className="h-4 w-4" />
              <span className="hidden sm:inline">View Terms</span>
            </Button>
          )}
           {deal.status === "confirmed" && (
            <Button
              variant="default"
              size="sm"
              onClick={onDownloadPDF}
              disabled={isDownloading}
              className="gap-2 h-9 shadow-sm"
            >
              {isDownloading ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="hidden sm:inline">Download Certificate</span>
            </Button>
          )}
        </div>
      </div>

      {/* 2. Verification Status Card (Simplified to match 'Status Alert' style but with Certificate vibes) */}
      <Card
        className={cn(
          "overflow-hidden border transition-all duration-300 relative",
          config.bg,
          config.border
        )}
      >
         <div className="p-5 flex flex-col sm:flex-row items-start gap-4">
            <div className={cn(
               "h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border shadow-sm",
               verificationStatus === "valid" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" : "bg-background"
            )}>
               <StatusIcon className={cn("h-5 w-5", config.color, config.spin && "animate-spin")} />
            </div>

            <div className="flex-1 space-y-1">
               <h3 className={cn("text-base font-semibold", config.color)}>
                  {config.label}
               </h3>

                <p className="text-sm text-muted-foreground leading-relaxed">
                    {config.description}
                </p>

                {verificationStatus === "valid" && (
                   <div className="flex items-center gap-2 pt-2 mt-2 border-t border-emerald-200/50 dark:border-emerald-800/30 text-xs text-emerald-700/80 dark:text-emerald-400/80">
                      <Check className="h-3.5 w-3.5" />
                      <span>Legally Binding • Immutable • Signed by all parties</span>
                   </div>
                )}
            </div>
         </div>
         {/* Status Bar */}
         <div className={cn("h-1 w-full", verificationStatus === "valid" ? "bg-emerald-500" : verificationStatus === "invalid" ? "bg-destructive" : "bg-primary")} />
      </Card>

      {/* 3. Parties Involved (Match Private Deal Page Design EXACTLY) */}
      <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
              <Users className="h-4 w-4" />
              Parties
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Creator */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default transition-transform hover:scale-[1.02]"
              >
                <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center text-primary-foreground font-medium text-sm shadow-sm overflow-hidden">
                  {creatorProfile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={creatorProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getUserInitials(deal.creatorName || "Unknown")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{deal.creatorName}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Send className="h-3 w-3" />
                    Original Creator
                  </p>
                </div>
              </div>

              {/* Recipient */}
              <div
                className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default transition-transform hover:scale-[1.02]"
              >
                <div className={cn(
                  "h-10 w-10 rounded-full flex items-center justify-center font-medium text-sm shadow-sm overflow-hidden",
                  deal.status === "confirmed"
                    ? "bg-gradient-to-br from-sky-500 to-sky-600 text-white"
                    : "bg-muted text-muted-foreground"
                )}>
                  {recipientProfile?.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={recipientProfile.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    getUserInitials(deal.recipientName || "Recipient")
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-sm truncate">{deal.recipientName || "Pending..."}</p>
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Inbox className="h-3 w-3" />
                    {deal.recipientName ? "Counter-Signed By" : "Awaiting Signature"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
      </Card>

      {/* 4. Cryptographic Seal (Match Private Deal Page Design EXACTLY) */}
      <Card className={cn(
        "shadow-sm bg-card rounded-xl overflow-hidden border",
        verificationStatus === "valid" ? "border-emerald-500/20" : "border-border"
      )}>
        <CardContent className="p-5 md:p-6">
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                <Fingerprint className="h-4 w-4" />
                Cryptographic Seal
              </div>

              <div className="p-4 rounded-xl bg-secondary/30 border border-border/50 group relative">
                <code className="text-[10px] font-mono break-all text-muted-foreground block">
                  {deal.dealSeal || "No seal generated yet."}
                </code>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/10">
                  <div className={cn(
                    "flex items-center gap-1.5 text-xs",
                    verificationStatus === "valid" ? "text-emerald-600" : "text-muted-foreground"
                  )}>
                    <Lock className="h-3 w-3" />
                    SHA-256
                  </div>
                   {verificationStatus === "valid" && (
                    <span className="text-xs text-emerald-600 font-medium">
                      Matched
                    </span>
                   )}
                </div>
              </div>
            </div>
        </CardContent>
      </Card>

    </div>
  );
};
