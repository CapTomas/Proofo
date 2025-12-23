"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, Lock, Shield, Eye, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnimatedLogo } from "@/components/animated-logo";

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/40 bg-background/95 backdrop-blur-sm sticky top-0 z-50">
        <div className="container max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <AnimatedLogo size={32} className="text-foreground" />
            <span className="font-bold text-xl">Proofo</span>
          </Link>
          <Link href="/login">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="container max-w-4xl mx-auto px-4 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center gap-4 mb-8">
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Lock className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Privacy Policy</h1>
              <p className="text-muted-foreground">Last updated: December 2025</p>
            </div>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                Our Commitment to Privacy
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                At Proofo, we take your privacy seriously. This policy describes how we collect,
                use, and protect your personal information when you use our service.
              </p>
            </section>

            <Separator className="my-8" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Database className="h-5 w-5 text-muted-foreground" />
                Information We Collect
              </h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Account Information:</strong> Email address, name, and profile details</li>
                <li><strong>Agreement Data:</strong> The content of agreements you create and signatures</li>
                <li><strong>Usage Data:</strong> How you interact with our service</li>
                <li><strong>Device Information:</strong> Browser type, IP address, and device identifiers</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Eye className="h-5 w-5 text-muted-foreground" />
                How We Use Your Information
              </h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>To provide and maintain our service</li>
                <li>To send you agreement notifications and updates</li>
                <li>To verify the authenticity of agreements</li>
                <li>To improve our service and develop new features</li>
                <li>To comply with legal obligations</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Data Security</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use industry-standard security measures to protect your data, including
                encryption in transit and at rest. Agreement seals are cryptographically
                secured to ensure integrity and authenticity.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Data Sharing</h2>
              <p className="text-muted-foreground leading-relaxed">
                We do not sell your personal information. We may share data with:
              </p>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2 mt-2">
                <li>Service providers who help us operate our platform (e.g., hosting, email)</li>
                <li>Other parties to an agreement you create or sign</li>
                <li>Law enforcement when required by law</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Trash2 className="h-5 w-5 text-muted-foreground" />
                Your Rights
              </h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Correction:</strong> Update inaccurate information</li>
                <li><strong>Deletion:</strong> Request deletion of your account and data</li>
                <li><strong>Portability:</strong> Export your data in a standard format</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Cookies</h2>
              <p className="text-muted-foreground leading-relaxed">
                We use essential cookies to maintain your session and preferences.
                We do not use tracking cookies for advertising purposes.
              </p>
            </section>

            <Separator className="my-8" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                Contact
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                For privacy-related inquiries, please contact us at{" "}
                <a href="mailto:privacy@proofo.app" className="text-primary hover:underline">
                  privacy@proofo.app
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
