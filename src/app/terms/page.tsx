"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft, FileText, Shield, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AnimatedLogo } from "@/components/animated-logo";

export default function TermsPage() {
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
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Terms of Service</h1>
              <p className="text-muted-foreground">Last updated: December 2025</p>
            </div>
          </div>

          <div className="prose prose-neutral dark:prose-invert max-w-none">
            <section className="mb-8">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Scale className="h-5 w-5 text-primary" />
                Agreement to Terms
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                By accessing or using Proofo, you agree to be bound by these Terms of Service. If
                you do not agree to these terms, please do not use our services.
              </p>
            </section>

            <Separator className="my-8" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">1. Description of Service</h2>
              <p className="text-muted-foreground leading-relaxed">
                Proofo provides a digital agreement platform that enables users to create, send, and
                sign digital agreements. Our service creates cryptographically-sealed records of
                agreements between parties.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">2. User Responsibilities</h2>
              <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                <li>You must provide accurate information when creating agreements</li>
                <li>You are responsible for maintaining the security of your account</li>
                <li>You agree not to use the service for illegal purposes</li>
                <li>You must be at least 18 years old to use this service</li>
              </ul>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">3. Intellectual Property</h2>
              <p className="text-muted-foreground leading-relaxed">
                The Proofo platform, including its design, features, and technology, is owned by
                Proofo and protected by intellectual property laws. You retain ownership of the
                content you create using our service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">4. Limitation of Liability</h2>
              <p className="text-muted-foreground leading-relaxed">
                Proofo provides the service &quot;as is&quot; without warranties of any kind. We are
                not liable for any indirect, incidental, or consequential damages arising from your
                use of the service.
              </p>
            </section>

            <section className="mb-8">
              <h2 className="text-xl font-semibold mb-4">5. Modifications</h2>
              <p className="text-muted-foreground leading-relaxed">
                We reserve the right to modify these terms at any time. Continued use of the service
                after changes constitutes acceptance of the modified terms.
              </p>
            </section>

            <Separator className="my-8" />

            <section className="mb-8">
              <h2 className="text-xl font-semibold flex items-center gap-2 mb-4">
                <Shield className="h-5 w-5 text-primary" />
                Contact
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                If you have questions about these Terms of Service, please contact us at{" "}
                <a href="mailto:legal@proofo.app" className="text-primary hover:underline">
                  legal@proofo.app
                </a>
              </p>
            </section>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
