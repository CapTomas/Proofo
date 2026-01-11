"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PublicHeader } from "@/components/public-header";
import { SignaturePad } from "@/components/signature-pad";
import { SealedDealView } from "@/components/sealed-deal-view";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import {
  FileText,
  Shield,
  Lock,
  ArrowRight,
  CheckCircle2,
  Users,
  Send,
  Inbox,
  Handshake,
  AlertCircle,
  PlayCircle,
  ArrowLeft,
  PenLine,
  ShieldCheck,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Calendar
} from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";
import { Deal, DealTerm } from "@/types";

// Mock Data
const MOCK_DEAL_ID = "DEMO-123";
const MOCK_CREATOR = {
  name: "John Doe",
  initials: "JD"
};

const TERMS: DealTerm[] = [
  { id: "1", label: "Project", value: "Consultancy Agreement", type: "text" },
  { id: "2", label: "Fee", value: "$8,500.00 / Month", type: "currency" },
  { id: "3", label: "Term", value: "6 Months Fixed", type: "text" },
];

export default function DemoPage() {
  const [currentStep, setCurrentStep] = useState<"review" | "sign" | "complete">("review");
  const [signature, setSignature] = useState<string | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [currentStep]);

  const handleSign = async () => {
    setCurrentStep("complete");
    toast.success("Demo Agreement Sealed!", {
      description: "Cryptographic proof generated."
    });
  };

  const mockDeal: Deal = {
    id: "demo-id",
    publicId: MOCK_DEAL_ID,
    title: "Consultancy Agreement",
    description: "Professional services agreement.",
    status: currentStep === "complete" ? "confirmed" : "pending",
    creatorId: "creator-id",
    creatorName: MOCK_CREATOR.name,
    recipientName: "You",
    recipientEmail: "you@example.com",
    terms: TERMS,
    createdAt: new Date().toISOString(),
    confirmedAt: currentStep === "complete" ? new Date().toISOString() : undefined,
    signatureUrl: signature || undefined,
    dealSeal: "0x7f83b1657ff1...9a3b",
    templateId: "service-exchange",
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary relative overflow-x-hidden">
      <div className="absolute top-0 right-0 w-[400px] h-[400px] md:w-[800px] md:h-[800px] bg-primary/5 rounded-full blur-[100px] md:blur-[120px] pointer-events-none z-0 translate-x-1/3 -translate-y-1/3" />

      <PublicHeader currentPage="demo" />

      {/* Increased bottom padding to prevent buttons from being hidden on smaller screens */}
      <main className="relative pt-28 pb-32 w-full z-10 transition-all duration-300 px-4 sm:px-6 lg:px-[112px]">
        <div className="max-w-7xl mx-auto w-full">
            {/* Back Navigation */}
            <div className="mb-8">
            <Link
                href="/"
                className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors group"
            >
                <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
                Back to Home
            </Link>
            </div>

            <div className="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">

            {/* LEFT COLUMN: UNTOUCHED - Same as Verify Page */}
            <div className="lg:sticky lg:top-32 space-y-12">
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                >
                <Badge
                    variant="secondary"
                    className="mb-6 px-4 py-1.5 bg-secondary/50 border-0 text-foreground"
                >
                    <PlayCircle className="h-3.5 w-3.5 mr-1.5 text-primary" />
                    Interactive Demo
                </Badge>

                <h1 className="text-5xl sm:text-6xl font-bold tracking-tight mb-8 text-foreground leading-[1.1]">
                    Experience the <br />
                    <span className="text-muted-foreground">Proofo Flow.</span>
                </h1>

                <p className="text-xl text-muted-foreground leading-relaxed max-w-lg">
                    See exactly what your clients will see. Review terms, sign with a secure pad, and watch the cryptographic seal happen in real-time.
                </p>
                </motion.div>

                {/* CTA Box */}
                <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
                className="hidden lg:block pt-4"
                >
                <div className="bg-secondary/30 rounded-3xl p-8 border border-border relative overflow-hidden backdrop-blur-sm">
                    <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-3">Ready to proof it?</h3>
                    <p className="text-muted-foreground mb-8 text-base">
                        Stop hoping they&apos;ll keep their word. Start proving they agreed.
                    </p>
                    <Link href="/deal/new">
                        <Button
                        size="xl"
                        className="w-full text-base rounded-2xl shadow-lg shadow-primary/10 h-14"
                        >
                        Create Your First Deal
                        <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </Link>
                    </div>
                </div>
                </motion.div>
            </div>

            {/* RIGHT COLUMN */}
            <div className="relative w-full">
                 <AnimatePresence mode="wait">

                    {/* STEP 1: REVIEW */}
                    {currentStep === "review" && (
                        <motion.div
                        key="review"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                        className="w-full space-y-4"
                        >
                         {/* Header */}
                         <div className="pl-1 mb-2">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight">Review Agreement</h1>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/10">
                                            Step 1 of 2
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            Signing as <span className="font-semibold text-foreground">You</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {/* Parties Card */}
                            <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground mb-4">
                                        <Users className="h-4 w-4" />
                                        Parties
                                    </div>
                                    <div className="grid sm:grid-cols-2 gap-4">
                                        {/* Creator - John Doe */}
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className="flex items-center gap-3 p-4 rounded-xl bg-secondary/30 border border-border/50 cursor-default"
                                        >
                                            <Avatar className="h-10 w-10 border border-border/50 shadow-sm">
                                                <AvatarFallback className="bg-gradient-to-br from-primary to-primary/70 text-primary-foreground font-medium text-sm">
                                                    {MOCK_CREATOR.initials}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm truncate">{MOCK_CREATOR.name}</p>
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Send className="h-3 w-3" />
                                                    Creator
                                                </p>
                                            </div>
                                        </motion.div>

                                        {/* Recipient - You */}
                                        <motion.div
                                            whileHover={{ scale: 1.02 }}
                                            className="flex items-center gap-3 p-4 rounded-xl border cursor-default transition-colors bg-secondary/30 border-border/50"
                                        >
                                            <Avatar className="h-10 w-10 shadow-sm bg-muted text-muted-foreground">
                                                 <AvatarFallback className="font-medium text-sm bg-muted text-muted-foreground">
                                                    YO
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="min-w-0 flex-1">
                                                <div className="flex items-center gap-2">
                                                    <p className="font-medium text-sm truncate">You</p>
                                                    <Badge variant="secondary" className="text-[10px] h-4 shrink-0">You</Badge>
                                                </div>
                                                <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                    <Inbox className="h-3 w-3" />
                                                    Recipient
                                                </p>
                                            </div>
                                        </motion.div>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* Deal Info */}
                            <Card className="border border-border shadow-sm rounded-xl overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-start gap-4">
                                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 border border-primary/20 shadow-sm">
                                            <Handshake className="h-6 w-6 text-primary" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h2 className="text-xl font-bold tracking-tight">{mockDeal.title}</h2>
                                            <p className="text-sm text-muted-foreground mt-0.5">Professional services agreement</p>
                                            <div className="flex flex-wrap items-center gap-3 mt-3">
                                                 <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <Calendar className="h-3.5 w-3.5" />
                                                    Today
                                                </div>

                                                {/* FIX: Replaced `code` with interactive CopyableId */}
                                                <CopyableId id={MOCK_DEAL_ID} />

                                                <Badge variant="outline" className="gap-1.5 bg-amber-500/10 text-amber-600 border-amber-500/20 text-[10px] h-5 px-1.5">
                                                    <AlertCircle className="h-3 w-3" />
                                                    Pending
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                             {/* Terms */}
                             <Card className="border border-border shadow-sm bg-card rounded-xl overflow-hidden">
                                <CardContent className="p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-muted-foreground">
                                            <FileText className="h-4 w-4" />
                                            Terms
                                        </div>
                                        <Badge variant="secondary" className="text-[10px]">
                                            {TERMS.length} terms
                                        </Badge>
                                    </div>
                                    <div className="space-y-2">
                                        {TERMS.map((term, _index) => (
                                            <motion.div
                                                key={term.id}
                                                whileHover={{ scale: 1.01 }}
                                                className="flex items-center justify-between py-3 px-4 rounded-lg bg-secondary/20 hover:bg-secondary/40 transition-colors cursor-pointer group/term"
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
                        </div>

                        {/* Trust Indicators */}
                        <div className="flex flex-wrap justify-center gap-6 my-6 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <Shield className="h-4 w-4 text-emerald-600" />
                                </div>
                                <span>Encrypted</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                    <Lock className="h-4 w-4 text-emerald-600" />
                                </div>
                                <span>Sealed</span>
                            </div>
                        </div>

                        <Button
                            className="w-full h-14 text-base font-semibold shadow-lg shadow-primary/20 rounded-xl"
                            size="lg"
                            onClick={() => setCurrentStep("sign")}
                        >
                            Review Complete — Sign to Accept
                            <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        </motion.div>
                    )}

                    {/* STEP 2: SIGN */}
                    {currentStep === "sign" && (
                        <motion.div
                        key="sign"
                        initial={{ opacity: 0, y: 15 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -15 }}
                        transition={{ duration: 0.25 }}
                        className="w-full space-y-6"
                        >
                         {/* Header */}
                         <div className="pl-1 mb-2">
                            <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary border border-primary/20">
                                    <PenLine className="h-5 w-5" />
                                </div>
                                <div>
                                    <h1 className="text-2xl font-bold tracking-tight">Sign Agreement</h1>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <Badge variant="secondary" className="h-5 px-1.5 text-[10px] font-bold uppercase tracking-wider bg-primary/5 text-primary border-primary/10">
                                            Step 2 of 2
                                        </Badge>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                             <span className="w-1 h-1 rounded-full bg-border" />
                                            Signing as <span className="font-semibold text-foreground">You</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Summary Section */}
                            <div className="grid sm:grid-cols-2 gap-4">
                                <Card className="border border-border/50 shadow-card rounded-2xl overflow-hidden bg-card">
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-secondary flex items-center justify-center font-bold text-sm border shadow-xs">
                                                JD
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Creator</p>
                                                <p className="font-semibold truncate text-sm">John Doe</p>
                                            </div>
                                        </div>
                                        {/* FIX: Justify end for proper alignment */}
                                        <div className="flex flex-col justify-center items-end h-10">
                                            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground leading-none mb-1">Agreement ID</p>
                                            <CopyableId id={MOCK_DEAL_ID} className="bg-background h-5 min-h-0 py-0" />
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="rounded-2xl bg-primary/5 border border-primary/10 p-4 flex items-center gap-4">
                                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                                        <Lock className="h-5 w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase tracking-wider text-primary mb-0.5">Immutable Seal</p>
                                        <p className="text-[11px] text-muted-foreground leading-tight">
                                            Signed deals are cryptographically sealed. Neither party can alter terms.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Signature Card */}
                            <Card className="border border-border/50 shadow-card rounded-2xl overflow-hidden bg-card">
                            <div className="px-6 py-4 border-b border-border/40 flex items-center justify-between bg-muted/20">
                                <div className="flex items-center gap-2">
                                <div className="h-1.5 w-1.5 rounded-full bg-primary animate-pulse" />
                                <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Signature input</span>
                                </div>
                                <Badge variant="outline" className="text-[10px] uppercase tracking-tighter border-border font-mono px-1.5">
                                Secure Pad
                                </Badge>
                            </div>
                            <CardContent className="p-4 sm:p-6">
                                <SignaturePad
                                  onSignatureChange={setSignature}
                                  savedSignatureUrl={undefined}
                                />
                            </CardContent>
                            </Card>

                            {/* Actions */}
                            <div className="grid sm:grid-cols-2 gap-4 mt-4">
                            <Button
                                variant="ghost"
                                className="w-full h-12 rounded-xl text-muted-foreground hover:text-foreground text-sm order-2 sm:order-1"
                                onClick={() => setCurrentStep("review")}
                            >
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Back to Terms
                            </Button>
                            <Button
                                className="w-full rounded-xl shadow-lg shadow-primary/20 gap-2 text-base font-bold h-12 order-1 sm:order-2"
                                onClick={handleSign}
                                disabled={!signature}
                            >
                                <ShieldCheck className="h-5 w-5" />
                                Accept & Seal
                            </Button>
                            </div>
                        </div>
                        </motion.div>
                    )}

                    {/* STEP 3: COMPLETE */}
                    {currentStep === "complete" && (
                        <motion.div
                        key="complete"
                        initial={{ opacity: 0, scale: 0.99 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="w-full space-y-4"
                        >
                         {/* Header - Resized to match Step 1 */}
                         <div className="pl-1 mb-2">
                             <div className="flex items-center gap-3 mb-2">
                                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600 border border-emerald-500/20">
                                    <Handshake className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h1 className="text-xl font-bold tracking-tight">Deal Sealed</h1>
                                        <Badge variant="outline" className="gap-1.5 bg-emerald-500/10 border-emerald-500/30 text-emerald-600 h-6 px-2.5">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                                        </Badge>
                                    </div>
                                    <div className="flex flex-wrap items-center gap-2 mt-1">
                                        <CopyableId id={MOCK_DEAL_ID} />
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                                            <span className="w-1 h-1 rounded-full bg-border" />
                                            Signed by <span className="font-semibold text-foreground">You</span> &amp; <span className="font-semibold text-foreground">John</span>
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>

                         {/* Success Card */}
                         <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-3 flex items-center gap-3">
                             <div className="h-6 w-6 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-600 shrink-0">
                                 <Sparkles className="h-3.5 w-3.5" />
                             </div>
                             <div>
                                 <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-400">All parties have signed successfully.</p>
                             </div>
                         </div>

                        {/* Sealed Deal View */}
                        <div className="[&_.p-6]:p-3 [&_.gap-6]:gap-2 [&_.text-xl]:text-lg [&_.text-lg]:text-base [&_.h-12]:h-10 [&_.w-12]:w-10 [&_.p-5]:p-3">
                            <SealedDealView
                                deal={mockDeal}
                                creatorProfile={{ name: MOCK_CREATOR.name }}
                                recipientProfile={{ name: "You" }}
                                isRecipient={false}
                                showSignatureSeal={true}
                            />
                        </div>

                        {/* CTA Footer */}
                        <div className="mt-4 text-center p-4 rounded-xl bg-secondary/30 border border-border/50">
                            <h3 className="text-sm font-bold mb-2">Ready to create your own?</h3>
                            <div className="flex flex-col sm:flex-row gap-2 justify-center">
                                <Link href="/deal/new">
                                    <Button size="sm" className="w-full sm:w-auto rounded-lg shadow-sm h-9 text-xs px-4">
                                    Create Your First Deal
                                    </Button>
                                </Link>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-muted-foreground w-full sm:w-auto h-9 text-xs"
                                    onClick={() => window.location.reload()}
                                >
                                    <RefreshCw className="h-3 w-3 mr-1.5" />
                                    Restart
                                </Button>
                            </div>
                        </div>

                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
            </div>
        </div>
      </main>
    </div>
  );
}

function CopyableId({ id, className }: { id: string, className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(id);
    setCopied(true);
    toast.success("ID Copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 bg-muted/50 hover:bg-muted px-2 py-1 rounded-md text-[10px] sm:text-xs font-mono transition-colors group/copy",
        className
      )}
    >
      <span>{id}</span>
      {copied ? (
        <Check className="h-3 w-3 text-emerald-500" />
      ) : (
        <Copy className="h-3 w-3 text-muted-foreground opacity-50 group-hover/copy:opacity-100" />
      )}
    </button>
  );
}
