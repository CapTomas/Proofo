"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  Shield,
  Zap,
  FileCheck,
  Smartphone,
  Users,
  Lock,
  ArrowRight,
  CheckCircle2,
  Star,
  Play,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

const features = [
  {
    icon: Users,
    title: "Asymmetric Registration",
    description: "Only you need an account. Recipients just scan and sign — zero friction for them.",
  },
  {
    icon: FileCheck,
    title: "Visual Signatures",
    description: "Draw-to-sign creates psychological trust and legal weight that text can't match.",
  },
  {
    icon: Lock,
    title: "Cryptographic Sealing",
    description: "SHA-256 hash verification ensures your agreements are tamper-proof forever.",
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    description: "Beautiful on any device. No app downloads needed — just share and sign.",
  },
  {
    icon: Zap,
    title: "30-Second Deals",
    description: "From idea to signed agreement faster than you can explain it to a lawyer.",
  },
  {
    icon: Shield,
    title: "Instant PDF Receipts",
    description: "Professional documentation delivered to both parties automatically.",
  },
];

const steps = [
  {
    number: "01",
    title: "Create Your Deal",
    description: "Choose a template or create custom terms. Add the details that matter.",
    icon: FileCheck,
  },
  {
    number: "02",
    title: "Share Instantly",
    description: "Send a QR code or link via any channel — text, email, or in person.",
    icon: Zap,
  },
  {
    number: "03",
    title: "They Sign & Seal",
    description: "Recipients review terms, draw their signature, and seal with one tap.",
    icon: Users,
  },
  {
    number: "04",
    title: "Both Get Proof",
    description: "Verified PDF receipts with cryptographic seals delivered instantly.",
    icon: Shield,
  },
];

const testimonials = [
  {
    quote: "Finally, a way to make my verbal agreements actually count. Game changer for freelancing.",
    author: "Sarah M.",
    role: "Freelance Designer",
    avatar: "S",
  },
  {
    quote: "I lend equipment all the time. Now I have proof that protects both parties.",
    author: "Marcus T.",
    role: "Photography Studio Owner",
    avatar: "M",
  },
  {
    quote: "The signature pad makes it feel official. My clients take agreements more seriously now.",
    author: "Jennifer L.",
    role: "Small Business Owner",
    avatar: "J",
  },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut" as const,
    },
  },
};

export default function Home() {
  const heroRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });
  
  const heroOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);
  const heroScale = useTransform(scrollYProgress, [0, 0.5], [1, 0.95]);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-8 w-8 rounded-lg bg-foreground flex items-center justify-center">
              <span className="text-background font-semibold text-sm">P</span>
            </div>
            <span className="font-semibold text-lg tracking-tight">Proofo</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm">
                Get Started
                <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 md:pt-40 md:pb-32">
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="container mx-auto px-4 sm:px-6 relative"
        >
          <div className="max-w-3xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="outline" className="mb-6 text-xs font-medium">
                Evidence that holds up
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl font-semibold tracking-tight mb-6 leading-[1.1]"
            >
              Agreements without the awkwardness
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg text-muted-foreground mb-10 max-w-xl mx-auto leading-relaxed"
            >
              Create enforceable proof of any deal in 30 seconds.
              No signup required for the other party.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-3 justify-center"
            >
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Your First Deal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  <Play className="mr-2 h-4 w-4" />
                  See Demo
                </Button>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-12 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Free to start</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>No credit card</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-4 w-4" />
                <span>Encrypted</span>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 border-t">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
              Everything you need
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Bridge the gap between a handshake and a lawyer.
            </p>
          </motion.div>

          <motion.div 
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {features.map((feature) => (
              <motion.div
                key={feature.title}
                variants={itemVariants}
              >
                <Card className="h-full border-border/50 hover:border-border transition-colors">
                  <CardContent className="p-6">
                    <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center mb-4">
                      <feature.icon className="h-5 w-5 text-foreground" />
                    </div>
                    <h3 className="font-medium mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32 border-t bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
              How it works
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Create agreements in four simple steps.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-5xl mx-auto">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="relative inline-flex mb-4">
                  <div className="h-16 w-16 rounded-full bg-background border-2 border-border flex items-center justify-center">
                    <step.icon className="h-6 w-6 text-foreground" />
                  </div>
                  <span className="absolute -top-1 -right-1 h-6 w-6 rounded-full bg-foreground text-background text-xs font-medium flex items-center justify-center">
                    {index + 1}
                  </span>
                </div>
                <h3 className="font-medium mb-1">{step.title}</h3>
                <p className="text-muted-foreground text-sm">{step.description}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 border-t">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
              Trusted by thousands
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              See why people choose Proofo.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full border-border/50">
                  <CardContent className="p-6">
                    <div className="flex gap-0.5 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-foreground text-foreground" />
                      ))}
                    </div>
                    <p className="text-sm mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="h-9 w-9 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                        {testimonial.avatar}
                      </div>
                      <div>
                        <p className="font-medium text-sm">{testimonial.author}</p>
                        <p className="text-muted-foreground text-xs">{testimonial.role}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 md:py-32 border-t bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
              Simple pricing
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Start free, upgrade when you need more.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Free Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full">
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold mb-1">Free</h3>
                    <p className="text-muted-foreground text-sm">For getting started</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-semibold">$0</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 text-sm">
                    {["Unlimited deals", "90-day history", "Visual signatures", "PDF receipts"].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard" className="block">
                    <Button variant="outline" className="w-full">Get Started</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>

            {/* Pro Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <Card className="h-full border-foreground/20 relative">
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary" className="text-xs">Popular</Badge>
                </div>
                <CardContent className="p-6">
                  <div className="mb-4">
                    <h3 className="font-semibold mb-1">Pro</h3>
                    <p className="text-muted-foreground text-sm">For professionals</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-3xl font-semibold">$9</span>
                    <span className="text-muted-foreground text-sm">/month</span>
                  </div>
                  <ul className="space-y-2.5 mb-6 text-sm">
                    {["Everything in Free", "Unlimited history", "Custom branding", "No watermarks", "Analytics"].map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-foreground shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard" className="block">
                    <Button className="w-full">Upgrade to Pro</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32 border-t">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-2xl mx-auto text-center"
          >
            <div className="inline-flex items-center gap-2 text-sm text-muted-foreground mb-4">
              <Clock className="h-4 w-4" />
              Set up in under 60 seconds
            </div>
            <h2 className="text-3xl sm:text-4xl font-semibold mb-4 tracking-tight">
              Ready to get started?
            </h2>
            <p className="text-muted-foreground mb-8">
              Join thousands who trust Proofo for their agreements.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link href="/dashboard">
                <Button size="lg" className="w-full sm:w-auto">
                  Create Your First Deal
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="lg" className="w-full sm:w-auto">
                  View Demo
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-foreground flex items-center justify-center">
                <span className="text-background font-semibold text-xs">P</span>
              </div>
              <span className="font-semibold">Proofo</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} Proofo. All rights reserved.
            </p>
            <div className="flex gap-6">
              <Link href="/privacy" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Privacy
              </Link>
              <Link href="/terms" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Terms
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
