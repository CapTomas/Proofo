"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Shield,
  Zap,
  FileCheck,
  Smartphone,
  Users,
  Lock,
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Star,
  Play,
  ChevronRight,
  Clock,
} from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

const features = [
  {
    icon: Users,
    title: "Asymmetric Registration",
    description: "Only you need an account. Recipients just scan and sign — zero friction for them.",
    gradient: "from-violet-500 to-purple-600",
  },
  {
    icon: FileCheck,
    title: "Visual Signatures",
    description: "Draw-to-sign creates psychological trust and legal weight that text can't match.",
    gradient: "from-blue-500 to-cyan-500",
  },
  {
    icon: Lock,
    title: "Cryptographic Sealing",
    description: "SHA-256 hash verification ensures your agreements are tamper-proof forever.",
    gradient: "from-emerald-500 to-teal-500",
  },
  {
    icon: Smartphone,
    title: "Works Everywhere",
    description: "Beautiful on any device. No app downloads needed — just share and sign.",
    gradient: "from-orange-500 to-amber-500",
  },
  {
    icon: Zap,
    title: "30-Second Deals",
    description: "From idea to signed agreement faster than you can explain it to a lawyer.",
    gradient: "from-pink-500 to-rose-500",
  },
  {
    icon: Shield,
    title: "Instant PDF Receipts",
    description: "Professional documentation delivered to both parties automatically.",
    gradient: "from-indigo-500 to-violet-500",
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
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:shadow-primary/30 transition-shadow">
              <span className="text-primary-foreground font-bold text-lg">P</span>
            </div>
            <span className="font-bold text-xl tracking-tight">Proofo</span>
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
          <div className="flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm" className="hidden sm:inline-flex">
                Log In
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button size="sm" className="shadow-lg shadow-primary/20">
                Get Started Free
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section ref={heroRef} className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 gradient-bg-hero" />
        <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-[0.02]" />
        
        <motion.div 
          style={{ opacity: heroOpacity, scale: heroScale }}
          className="container mx-auto px-4 sm:px-6 relative"
        >
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <Badge variant="secondary" className="mb-6 px-4 py-1.5 text-sm font-medium border border-border/50 shadow-sm">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                Evidence that holds up
              </Badge>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 leading-[1.1]"
            >
              Agreements without
              <br />
              <span className="text-gradient">the awkwardness</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-lg sm:text-xl text-muted-foreground mb-10 max-w-2xl mx-auto leading-relaxed"
            >
              Create enforceable proof of any deal in 30 seconds.
              No signup required for the other party. Just share, sign, and seal.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-col sm:flex-row gap-4 justify-center"
            >
              <Link href="/dashboard">
                <Button size="xl" className="w-full sm:w-auto shadow-xl shadow-primary/25 hover:shadow-primary/30 transition-shadow">
                  Create Your First Deal
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/demo">
                <Button variant="outline" size="xl" className="w-full sm:w-auto group">
                  <Play className="mr-2 h-4 w-4 group-hover:text-primary transition-colors" />
                  See It In Action
                </Button>
              </Link>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.5 }}
              className="mt-14 flex flex-wrap justify-center gap-x-8 gap-y-4 text-sm text-muted-foreground"
            >
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Free forever for basics</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                <span>Bank-level encryption</span>
              </div>
            </motion.div>
          </div>

          {/* Hero Image/Demo Preview */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mt-16 md:mt-20 max-w-5xl mx-auto"
          >
            <div className="relative rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-2xl shadow-black/10 overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent" />
              <div className="p-4 sm:p-6 md:p-8">
                <div className="aspect-[16/9] rounded-xl bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center">
                  <div className="text-center">
                    <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <FileCheck className="h-10 w-10 text-primary-foreground" />
                    </div>
                    <p className="text-muted-foreground font-medium">Interactive Demo Preview</p>
                    <Link href="/demo" className="inline-flex items-center gap-1 text-sm text-primary mt-2 hover:underline">
                      Try it now <ChevronRight className="h-3 w-3" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 md:py-32 relative">
        <div className="absolute inset-0 gradient-bg opacity-50" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Features</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Everything you need to seal the deal
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Bridge the gap between a handshake and a lawyer with our comprehensive digital agreement platform.
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
                <Card className="h-full group hover:border-primary/30 transition-all duration-300 cursor-default">
                  <CardContent className="p-6">
                    <div className={`h-12 w-12 rounded-xl bg-gradient-to-br ${feature.gradient} flex items-center justify-center mb-5 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                      <feature.icon className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">How It Works</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Four steps to proof
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Create verifiable agreements faster than you can explain the situation.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {steps.map((step, index) => (
              <motion.div
                key={step.number}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="relative"
              >
                {/* Connector Line */}
                {index < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-12 left-[60%] w-full h-px bg-gradient-to-r from-border to-transparent" />
                )}
                
                <div className="text-center">
                  <div className="relative inline-flex mb-6">
                    <div className="h-24 w-24 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 flex items-center justify-center border border-primary/10">
                      <step.icon className="h-10 w-10 text-primary" />
                    </div>
                    <span className="absolute -top-2 -right-2 h-8 w-8 rounded-lg bg-primary text-primary-foreground text-sm font-bold flex items-center justify-center shadow-lg">
                      {step.number.replace("0", "")}
                    </span>
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{step.description}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-24 md:py-32 relative">
        <div className="absolute inset-0 gradient-bg opacity-50" />
        <div className="container mx-auto px-4 sm:px-6 relative">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Testimonials</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Loved by thousands
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              See why people trust Proofo for their important agreements.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <Card className="h-full">
                  <CardContent className="p-6">
                    <div className="flex gap-1 mb-4">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-foreground mb-6 leading-relaxed">&ldquo;{testimonial.quote}&rdquo;</p>
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground font-semibold">
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

      {/* Pricing Preview */}
      <section id="pricing" className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <Badge variant="secondary" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              Start free, upgrade when you need more.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Free Tier */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5 }}
            >
              <Card className="h-full">
                <CardContent className="p-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Free</h3>
                    <p className="text-muted-foreground text-sm">Perfect for getting started</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">$0</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Unlimited deals",
                      "90-day dashboard history",
                      "Visual signatures",
                      "PDF receipts",
                      "Email delivery",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard" className="block">
                    <Button variant="outline" className="w-full">Get Started Free</Button>
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
              <Card className="h-full border-primary/50 relative overflow-hidden">
                <div className="absolute top-0 right-0 bg-primary text-primary-foreground text-xs font-medium px-3 py-1 rounded-bl-lg">
                  Popular
                </div>
                <CardContent className="p-8">
                  <div className="mb-6">
                    <h3 className="text-xl font-semibold mb-2">Pro</h3>
                    <p className="text-muted-foreground text-sm">For professionals who need more</p>
                  </div>
                  <div className="mb-6">
                    <span className="text-4xl font-bold">$9</span>
                    <span className="text-muted-foreground">/month</span>
                  </div>
                  <ul className="space-y-3 mb-8">
                    {[
                      "Everything in Free",
                      "Permanent history",
                      "Custom branding",
                      "Remove watermarks",
                      "Priority support",
                      "View analytics",
                    ].map((feature) => (
                      <li key={feature} className="flex items-center gap-3 text-sm">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Link href="/dashboard" className="block">
                    <Button className="w-full shadow-lg shadow-primary/20">Upgrade to Pro</Button>
                  </Link>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 md:py-32">
        <div className="container mx-auto px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="max-w-4xl mx-auto"
          >
            <Card className="border-0 bg-gradient-to-br from-primary to-primary/90 text-primary-foreground overflow-hidden relative">
              <div className="absolute inset-0 bg-[url('/grid.svg')] bg-center opacity-10" />
              <CardContent className="p-12 md:p-16 text-center relative">
                <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-1.5 text-sm font-medium mb-6">
                  <Clock className="h-4 w-4" />
                  Set up in under 60 seconds
                </div>
                <h2 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-4 tracking-tight">
                  Ready to secure your agreements?
                </h2>
                <p className="text-primary-foreground/80 text-lg mb-8 max-w-2xl mx-auto">
                  Join thousands who have already made their handshakes hold up. Start creating enforceable deals today.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/dashboard">
                    <Button size="xl" variant="secondary" className="w-full sm:w-auto shadow-xl">
                      Get Started Free
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link href="/demo">
                    <Button size="xl" variant="outline" className="w-full sm:w-auto bg-transparent border-white/30 text-white hover:bg-white/10 hover:text-white">
                      Watch Demo
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t">
        <div className="container mx-auto px-4 sm:px-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-lg shadow-primary/20">
                <span className="text-primary-foreground font-bold text-lg">P</span>
              </div>
              <span className="font-bold text-xl tracking-tight">Proofo</span>
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
              <Link href="/contact" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                Contact
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
