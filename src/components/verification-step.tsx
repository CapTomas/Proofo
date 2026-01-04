"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  Mail,
  Phone,
  CheckCircle2,
  Loader2,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import {
  sendEmailVerificationOTP,
  verifyEmailOTP,
  sendPhoneVerificationOTP,
  verifyPhoneOTP,
} from "@/app/actions/verification-actions";
import { toast } from "sonner";
import { TrustLevel } from "@/types";

interface VerificationStepProps {
  dealId: string;
  publicId: string;
  trustLevel: TrustLevel;
  onVerificationComplete: () => void;
  onBack?: () => void;
  className?: string;
  // If recipient is a Proofo user, email may already be verified
  isProofoUser?: boolean;
  proofUserEmailVerified?: boolean;
  proofUserPhoneVerified?: boolean;
  // Initial verifications from deal
  verifications?: {
    verification_type: "email" | "phone";
    verified_value?: string;
    verified_at: string;
  }[];
}

export function VerificationStep({
  dealId,
  publicId,
  trustLevel,
  onVerificationComplete,
  onBack,
  className,
  isProofoUser,
  proofUserEmailVerified,
  proofUserPhoneVerified,
  verifications,
}: VerificationStepProps) {
  // Check existing verifications from deal
  const dealEmailVerified = verifications?.some(v => v.verification_type === "email");
  const dealPhoneVerified = verifications?.some(v => v.verification_type === "phone");
  const verifiedEmailValue = verifications?.find(v => v.verification_type === "email")?.verified_value;

  // Email verification state
  const [email, setEmail] = useState(verifiedEmailValue || "");
  const [emailOtp, setEmailOtp] = useState("");
  const [isEmailSending, setIsEmailSending] = useState(false);
  const [isEmailVerifying, setIsEmailVerifying] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(proofUserEmailVerified || dealEmailVerified || false);
  const [emailError, setEmailError] = useState<string | null>(null);

  // Phone verification state
  const [phone, setPhone] = useState("");
  const [phoneOtp, setPhoneOtp] = useState("");
  const [isPhoneSending, setIsPhoneSending] = useState(false);
  const [isPhoneVerifying, setIsPhoneVerifying] = useState(false);
  const [phoneSent, setPhoneSent] = useState(false);
  const [phoneVerified, setPhoneVerified] = useState(proofUserPhoneVerified || dealPhoneVerified || false);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Determine what verifications are required
  const emailRequired = trustLevel === "verified" || trustLevel === "strong" || trustLevel === "maximum";
  const phoneRequired = trustLevel === "strong" || trustLevel === "maximum";

  // Check if all required verifications are complete
  const canProceed =
    (!emailRequired || emailVerified) &&
    (!phoneRequired || phoneVerified);

  // Handle sending email OTP
  const handleSendEmailOTP = async () => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      setEmailError("Please enter a valid email address");
      return;
    }

    setIsEmailSending(true);
    setEmailError(null);

    const { success, error } = await sendEmailVerificationOTP({
      dealId,
      email,
      publicId,
    });

    setIsEmailSending(false);

    if (success) {
      setEmailSent(true);
      toast.success("Verification code sent", {
        description: `Check your inbox at ${email}`,
      });
    } else {
      setEmailError(error || "Failed to send verification code");
    }
  };

  // Handle verifying email OTP
  const handleVerifyEmailOTP = async () => {
    if (!emailOtp || emailOtp.length !== 6) {
      setEmailError("Please enter the 6-digit code");
      return;
    }

    setIsEmailVerifying(true);
    setEmailError(null);

    const { success, error } = await verifyEmailOTP({
      dealId,
      email,
      otp: emailOtp,
      publicId,
    });

    setIsEmailVerifying(false);

    if (success) {
      setEmailVerified(true);
      toast.success("Email verified!", {
        description: phoneRequired ? "Now verify your phone number" : "You can now proceed to sign the agreement",
      });
    } else {
      setEmailError(error || "Invalid verification code");
    }
  };

  // Handle sending phone OTP
  const handleSendPhoneOTP = async () => {
    // Normalize phone: remove spaces, dashes, parentheses
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");

    // Validate phone number (E.164 format after normalization)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
      setPhoneError("Please enter a valid phone number in international format (e.g., +420601525559)");
      return;
    }

    setIsPhoneSending(true);
    setPhoneError(null);

    const { success, error } = await sendPhoneVerificationOTP({
      dealId,
      phone: normalizedPhone,
      publicId,
    });

    setIsPhoneSending(false);

    if (success) {
      setPhoneSent(true);
      toast.success("Verification code sent", {
        description: `Check your phone for the SMS`,
      });
    } else {
      setPhoneError(error || "Failed to send verification code");
    }
  };

  // Handle verifying phone OTP
  const handleVerifyPhoneOTP = async () => {
    if (!phoneOtp || phoneOtp.length !== 6) {
      setPhoneError("Please enter the 6-digit code");
      return;
    }

    // Normalize phone for verification
    const normalizedPhone = phone.replace(/[\s\-\(\)]/g, "");

    setIsPhoneVerifying(true);
    setPhoneError(null);

    const { success, error } = await verifyPhoneOTP({
      dealId,
      phone: normalizedPhone,
      otp: phoneOtp,
      publicId,
    });

    setIsPhoneVerifying(false);

    if (success) {
      setPhoneVerified(true);
      toast.success("Phone verified!", {
        description: "You can now proceed to sign the agreement",
      });
    } else {
      setPhoneError(error || "Invalid verification code");
    }
  };

  // Handle proceed to sign
  const handleProceed = () => {
    if (canProceed) {
      onVerificationComplete();
    }
  };

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="text-center">
        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
          <ShieldCheck className="h-7 w-7 text-primary" />
        </div>
        <h2 className="text-xl font-bold mb-2">Verify Your Identity</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          The creator of this agreement requires identity verification before signing.
          {isProofoUser && " As a Proofo user, some verifications may be skipped."}
        </p>
      </div>

      {/* Verification Steps */}
      <div className="space-y-4 max-w-md mx-auto">
        {/* Email Verification */}
        {emailRequired && (
          <Card className={cn(
            "p-4 border-2 transition-all",
            emailVerified
              ? "border-emerald-500/50 bg-emerald-500/5"
              : "border-border"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                emailVerified ? "bg-emerald-500/20" : "bg-muted"
              )}>
                {emailVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Mail className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">Email Verification</span>
                  {emailVerified && (
                    <Badge variant="secondary" className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Verified
                    </Badge>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {emailVerified ? (
                    <motion.p
                      key="verified"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-emerald-600"
                    >
                      ✓ {email || "Email"} verified
                    </motion.p>
                  ) : !emailSent ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2 mt-2"
                    >
                      <Input
                        type="email"
                        placeholder="Enter your email"
                        value={email}
                        onChange={(e) => {
                          setEmail(e.target.value);
                          setEmailError(null);
                        }}
                        className="h-9 text-sm"
                      />
                      {emailError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {emailError}
                        </p>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSendEmailOTP}
                        disabled={isEmailSending || !email}
                        className="w-full h-8"
                      >
                        {isEmailSending ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send Verification Code"
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2 mt-2"
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        Enter the 6-digit code sent to {email}
                      </p>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        maxLength={6}
                        value={emailOtp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setEmailOtp(value);
                          setEmailError(null);
                        }}
                        className="h-9 text-sm text-center tracking-[0.5em] font-mono"
                      />
                      {emailError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {emailError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEmailSent(false);
                            setEmailOtp("");
                          }}
                          className="flex-1 h-8 text-xs"
                        >
                          Change Email
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleVerifyEmailOTP}
                          disabled={isEmailVerifying || emailOtp.length !== 6}
                          className="flex-1 h-8"
                        >
                          {isEmailVerifying ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Card>
        )}

        {/* Phone Verification */}
        {phoneRequired && (
          <Card className={cn(
            "p-4 border-2 transition-all",
            phoneVerified
              ? "border-emerald-500/50 bg-emerald-500/5"
              : !emailVerified && emailRequired
                ? "opacity-50 pointer-events-none"
                : "border-border"
          )}>
            <div className="flex items-start gap-3">
              <div className={cn(
                "h-10 w-10 rounded-xl flex items-center justify-center shrink-0",
                phoneVerified ? "bg-emerald-500/20" : "bg-muted"
              )}>
                {phoneVerified ? (
                  <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                ) : (
                  <Phone className="h-5 w-5 text-muted-foreground" />
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">Phone Verification</span>
                  {phoneVerified && (
                    <Badge variant="secondary" className="h-5 text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      Verified
                    </Badge>
                  )}
                  {!emailVerified && emailRequired && (
                    <Badge variant="secondary" className="h-5 text-[10px]">
                      Complete email first
                    </Badge>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {phoneVerified ? (
                    <motion.p
                      key="verified"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-xs text-emerald-600"
                    >
                      ✓ Phone verified
                    </motion.p>
                  ) : !phoneSent ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2 mt-2"
                    >
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        value={phone}
                        onChange={(e) => {
                          setPhone(e.target.value);
                          setPhoneError(null);
                        }}
                        className="h-9 text-sm"
                        disabled={!emailVerified && emailRequired}
                      />
                      <p className="text-[10px] text-muted-foreground">
                        Use international format with country code (e.g., +1 for US)
                      </p>
                      {phoneError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {phoneError}
                        </p>
                      )}
                      <Button
                        size="sm"
                        onClick={handleSendPhoneOTP}
                        disabled={isPhoneSending || !phone || (!emailVerified && emailRequired)}
                        className="w-full h-8"
                      >
                        {isPhoneSending ? (
                          <>
                            <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                            Sending...
                          </>
                        ) : (
                          "Send SMS Code"
                        )}
                      </Button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="otp"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="space-y-2 mt-2"
                    >
                      <p className="text-xs text-muted-foreground mb-2">
                        Enter the 6-digit code sent to {phone}
                      </p>
                      <Input
                        type="text"
                        inputMode="numeric"
                        placeholder="000000"
                        maxLength={6}
                        value={phoneOtp}
                        onChange={(e) => {
                          const value = e.target.value.replace(/\D/g, "");
                          setPhoneOtp(value);
                          setPhoneError(null);
                        }}
                        className="h-9 text-sm text-center tracking-[0.5em] font-mono"
                      />
                      {phoneError && (
                        <p className="text-xs text-destructive flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> {phoneError}
                        </p>
                      )}
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPhoneSent(false);
                            setPhoneOtp("");
                          }}
                          className="flex-1 h-8 text-xs"
                        >
                          Change Phone
                        </Button>
                        <Button
                          size="sm"
                          onClick={handleVerifyPhoneOTP}
                          disabled={isPhoneVerifying || phoneOtp.length !== 6}
                          className="flex-1 h-8"
                        >
                          {isPhoneVerifying ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                              Verifying...
                            </>
                          ) : (
                            "Verify"
                          )}
                        </Button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center max-w-md mx-auto pt-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            Back
          </Button>
        )}
        <div className={cn("ml-auto", !onBack && "w-full")}>
          <Button
            onClick={handleProceed}
            disabled={!canProceed}
            className={cn("gap-2", !onBack && "w-full")}
          >
            {canProceed ? (
              <>
                Proceed to Sign <ArrowRight className="h-4 w-4" />
              </>
            ) : (
              "Complete verifications to continue"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
