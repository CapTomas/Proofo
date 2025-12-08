"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Crown,
  Check,
  X,
  Sparkles,
  FileCheck,
  Clock,
  Palette,
  Download,
  Shield,
} from "lucide-react";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade?: () => void;
}

const features = [
  {
    icon: Clock,
    title: "Unlimited History",
    description: "Keep all your deals forever, not just 90 days",
    free: false,
    pro: true,
  },
  {
    icon: Palette,
    title: "Custom Branding",
    description: "Add your logo and colors to receipts",
    free: false,
    pro: true,
  },
  {
    icon: FileCheck,
    title: "No Watermarks",
    description: "Clean PDFs without Proofo branding",
    free: false,
    pro: true,
  },
  {
    icon: Download,
    title: "Bulk Export",
    description: "Export all your deals at once",
    free: false,
    pro: true,
  },
  {
    icon: Shield,
    title: "Priority Support",
    description: "Get help when you need it",
    free: false,
    pro: true,
  },
  {
    icon: Sparkles,
    title: "Unlimited Deals",
    description: "Create as many deals as you need",
    free: true,
    pro: true,
  },
];

export function UpgradeModal({ isOpen, onClose, onUpgrade }: UpgradeModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpgrade = async () => {
    setIsProcessing(true);
    // Simulate payment processing
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setIsProcessing(false);
    onUpgrade?.();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-lg"
      >
        <Card className="shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="bg-linear-to-br from-primary to-primary/80 text-primary-foreground p-6 relative">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-white/10 flex items-center justify-center">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">Upgrade to Pro</h2>
                <p className="text-primary-foreground/80">Unlock all features</p>
              </div>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold">$9</span>
              <span className="text-primary-foreground/80">/month</span>
            </div>
          </div>

          <CardContent className="p-6 space-y-6">
            {/* Features */}
            <div className="space-y-3">
              {features.map((feature, index) => (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-start gap-3"
                >
                  <div className={`h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    feature.pro ? "bg-emerald-500/10" : "bg-muted"
                  }`}>
                    {feature.pro ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600" />
                    ) : (
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{feature.title}</p>
                    <p className="text-xs text-muted-foreground">{feature.description}</p>
                  </div>
                  {!feature.free && (
                    <Badge variant="secondary" className="ml-auto text-xs">
                      Pro
                    </Badge>
                  )}
                </motion.div>
              ))}
            </div>

            {/* CTA */}
            <div className="space-y-3">
              <Button
                onClick={handleUpgrade}
                disabled={isProcessing}
                className="w-full shadow-lg shadow-primary/25"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="h-5 w-5 border-2 border-primary-foreground border-t-transparent rounded-full mr-2"
                    />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="h-5 w-5 mr-2" />
                    Upgrade Now
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Cancel anytime. 7-day money-back guarantee.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
