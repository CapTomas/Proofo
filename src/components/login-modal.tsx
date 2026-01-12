"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Mail, ArrowRight, Shield, AlertCircle } from "lucide-react";
import { signInWithEmail, signInWithGoogle, isSupabaseConfigured } from "@/lib/supabase";
import { useAppStore } from "@/store";

import { LoginForm } from "./login-form";
import { VisuallyHidden } from "@/components/ui/visually-hidden";

interface LoginModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  title?: string;
  description?: string;
  redirectTo?: string;
}

export function LoginModal({
  open,
  onOpenChange,
  onSuccess,
  title,
  description,
  redirectTo,
}: LoginModalProps) {
  const handleClose = () => {
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent hideClose className="sm:max-w-md p-0 border-none bg-transparent shadow-none">
        <VisuallyHidden>
          <DialogTitle>{title || "Sign In"}</DialogTitle>
          <DialogDescription>{description || "Sign in to manage your deals"}</DialogDescription>
        </VisuallyHidden>
        <LoginForm
          title={title}
          description={description}
          redirectTo={redirectTo}
          onSuccess={() => {
            onOpenChange(false);
            onSuccess?.();
          }}
        />
      </DialogContent>
    </Dialog>
  );
}
