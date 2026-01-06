"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
  Info,
  History,
  Activity,
  ShieldCheck,
  Smartphone,
  Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Deal, AuditLogEntry } from "@/types";
import { AuditTimeline } from "./audit-timeline";
import { timeAgo } from "@/lib/crypto";
import { cn, getUserInitials } from "@/lib/utils";
import { CopyableId } from "@/components/dashboard/shared-components";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

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
  auditLogs?: AuditLogEntry[];
}

// --- HELPER COMPONENTS ---

const AnimatedHash = ({ hash, isVerifying }: { hash?: string | null; isVerifying: boolean }) => {
  const [displayHash, setDisplayHash] = useState("");

  useEffect(() => {
    if (isVerifying) {
      const interval = setInterval(() => {
        let text = "";
        const chars = "0123456789abcdef";
        for (let i = 0; i < 64; i++) {
          text += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        setDisplayHash(text);
      }, 50);
      return () => clearInterval(interval);
    } else {
      setDisplayHash(hash || "");
    }
  }, [isVerifying, hash]);

  return <>{displayHash}</>;
};

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
  auditLogs,
}: VerificationCardProps) => {
  const config = getStatusConfig(verificationStatus);
  const StatusIcon = config.icon;

  return (
    <TooltipProvider delayDuration={300}>
      <motion.div layout className="space-y-6">
        {/* 1. Header (Matches Private Deal Page) */}
        <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
          <CardContent className="p-5 md:p-6">
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold tracking-tight text-foreground">{deal.title}</h2>

                <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground">
                  <CopyableId id={deal.publicId} />
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
          </CardContent>
        </Card>

        {/* 2. Verification Status Card */}
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
                        <span>Cryptographically Verified • Immutable • Signed by all parties</span>
                    </div>
                  )}
              </div>
          </div>
          <motion.div
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={cn("h-1 w-full origin-left", verificationStatus === "valid" ? "bg-emerald-500" : verificationStatus === "invalid" ? "bg-destructive" : "bg-primary")}
          />
        </Card>

        {/* 2.5 Verified Identity Attributes */}
        {deal.verifications && deal.verifications.length > 0 && (
          <Card className="border border-emerald-500/20 shadow-sm bg-emerald-500/5 rounded-xl overflow-hidden">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-emerald-700 dark:text-emerald-400 mb-4">
                <ShieldCheck className="h-4 w-4" />
                Verified Identity Attributes
              </div>
              <div className="space-y-3">
                {deal.verifications.map((v, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-background border border-emerald-500/10">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                        {v.verification_type === "email" ? (
                          <Mail className="h-4 w-4" />
                        ) : (
                          <Smartphone className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">{v.verification_type} Verified</p>
                        <p className="text-xs text-muted-foreground font-mono">
                          {v.verified_value ? (
                            v.verification_type === 'phone'
                              ? v.verified_value.replace(/(\+\d{3})\d+(\d{4})/, '$1***$2')
                              : v.verified_value.replace(/(.{3}).+(@.+)/, '$1***$2')
                          ) : 'Confirmed'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-bold">Verified On</p>
                      <p className="text-xs font-medium">{new Date(v.verified_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* 3. Parties Involved */}
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

        {/* 4. Cryptographic Proof */}
        <Card className={cn(
          "shadow-sm bg-card rounded-xl overflow-hidden border transition-all duration-500",
          verificationStatus === "valid" ? "border-emerald-500 shadow-lg shadow-emerald-500/5" : "border-border"
        )}>
          <CardContent className="p-5 md:p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                    <Fingerprint className="h-4 w-4" />
                    Verification Proof
                  </div>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs p-3">
                      <p className="text-xs leading-relaxed">
                        Proofo uses SHA-256 hashing to create a unique fingerprint.
                        If even a single character changes, the hash will change entirely.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="grid gap-3">
                  {/* Ledger Seal */}
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 px-1">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Ledger Seal</span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-2.5 w-2.5 text-muted-foreground/40 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent side="right">
                          <p className="text-[10px]">The cryptographic hash stored on the ledger at the time of signing.</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                    <div className="p-3 rounded-xl bg-secondary/30 border border-border/50 group/ledger hover:border-muted-foreground/20 transition-colors">
                      <code className="text-[10px] font-mono break-all text-muted-foreground/70 block">
                        {deal.dealSeal || "No seal generated yet."}
                      </code>
                    </div>
                  </div>

                  {/* Calculated Seal */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between px-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Local Calculation</span>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Info className="h-2.5 w-2.5 text-muted-foreground/40 cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            <p className="text-[10px]">The hash calculated right now from the visual agreement content.</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <div className="h-4 flex items-center">
                        <AnimatePresence mode="wait">
                          {verificationStatus === "valid" ? (
                            <motion.span
                              key="matched"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-[9px] text-emerald-600 font-bold flex items-center gap-1 tracking-widest bg-emerald-500/10 px-1.5 py-0.5 rounded"
                            >
                              <Check className="h-2.5 w-2.5" />
                              MATCHED
                            </motion.span>
                          ) : verificationStatus === "invalid" ? (
                            <motion.span
                              key="mismatch"
                              initial={{ opacity: 0, x: 10 }}
                              animate={{ opacity: 1, x: 0 }}
                              className="text-[9px] text-destructive font-bold flex items-center gap-1 tracking-widest bg-destructive/10 px-1.5 py-0.5 rounded"
                            >
                              <XCircle className="h-2.5 w-2.5" />
                              MISMATCH
                            </motion.span>
                          ) : null}
                        </AnimatePresence>
                      </div>
                    </div>
                    <div className={cn(
                      "p-3 rounded-xl border transition-all duration-500",
                      verificationStatus === "valid" ? "bg-emerald-500/5 border-emerald-500/30 shadow-inner" :
                      verificationStatus === "invalid" ? "bg-destructive/5 border-destructive/30 shadow-inner" :
                      "bg-secondary/30 border-border/50"
                    )}>
                      <code className={cn(
                        "text-[10px] font-mono break-all block",
                        verificationStatus === "valid" ? "text-emerald-600 font-medium" :
                        verificationStatus === "invalid" ? "text-destructive font-medium" :
                        "text-muted-foreground"
                      )}>
                        <AnimatedHash
                          hash={calculatedHash}
                          isVerifying={verificationStatus === "verifying"}
                        />
                      </code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-border/10">
                  <div className={cn(
                    "flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest transition-colors",
                    verificationStatus === "valid" ? "text-emerald-600" : "text-muted-foreground/60"
                  )}>
                    <Lock className={cn(
                      "h-3 w-3",
                      verificationStatus === "valid" ? "text-emerald-500 animate-[pulse_2s_infinite]" : ""
                    )} />
                    SHA-256 Handshake Protocol
                  </div>
                  {verificationStatus === "valid" && (
                    <div className="flex items-center gap-2">
                       <span className="text-[10px] text-emerald-600/60 font-medium">100% Confidence</span>
                       <Badge variant="outline" className="text-[9px] h-4 bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-1.5 font-bold">
                        VERIFIED
                      </Badge>
                    </div>
                  )}
                </div>
              </div>
          </CardContent>
        </Card>

        {/* 5. Audit Trail */}
        {auditLogs && auditLogs.length > 0 && (
          <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
            <CardContent className="p-5 md:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                  <Activity className="h-4 w-4" />
                  Audit Trail
                </div>
                <Badge variant="outline" className="text-[10px] font-medium h-5 bg-muted/30">
                  {auditLogs.length} Events
                </Badge>
              </div>
              <div className="max-h-[350px] overflow-y-auto pr-2 -mr-2 scrollbar-thin scrollbar-thumb-primary/10 hover:scrollbar-thumb-primary/20 scrollbar-track-transparent">
                <AuditTimeline logs={auditLogs} privacyMode={true} compact={true} />
              </div>
            </CardContent>
          </Card>
        )}
      </motion.div>
    </TooltipProvider>
  );
};
