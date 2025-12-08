"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedLogo } from "@/components/animated-logo";
import {
  Shield,
  Menu,
  X,
  Sparkles,
  ArrowRight,
  User,
  FileCheck,
  Zap,
  ShoppingBag,
} from "lucide-react";

// Internal Magnetic Wrapper for the header button
const HeaderMagneticWrapper = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current?.getBoundingClientRect() || { left: 0, top: 0, width: 0, height: 0 };
    const centerX = left + width / 2;
    const centerY = top + height / 2;
    x.set((clientX - centerX) * 0.15);
    y.set((clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const springConfig = { damping: 15, stiffness: 150, mass: 0.1 };
  const springX = useSpring(x, springConfig);
  const springY = useSpring(y, springConfig);

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
};

interface PublicHeaderProps {
  currentPage?: "home" | "demo" | "verify";
}

export function PublicHeader({ currentPage = "home" }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Helper for active state or highlight
  const getLinkClass = (page: string, isHighlight = false) => {
    const base = "transition-colors flex items-center gap-1.5 text-sm";

    if (currentPage === page) {
      // Active page style (e.g. currently on /demo)
      return `${base} text-foreground font-semibold`;
    }

    if (isHighlight) {
      // Highlighted link style (Demo/Verify) - Primary Color
      return `${base} text-primary font-medium hover:opacity-80`;
    }

    // Standard link style (Features, Pricing)
    return `${base} text-muted-foreground hover:text-foreground font-medium`;
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/40 bg-background/80 backdrop-blur-xl transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">

          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group">
              <AnimatedLogo size={28} className="text-foreground" />
              <span className="font-bold tracking-tight text-lg">Proofo</span>
            </Link>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-6">
              <Link href="/#features" className={getLinkClass("features")}>Features</Link>
              <Link href="/#how-it-works" className={getLinkClass("how-it-works")}>How it works</Link>
              <Link href="/#pricing" className={getLinkClass("pricing")}>Pricing</Link>

              {/* Highlighted Links */}
              <div className="h-4 w-px bg-border/50 mx-1" />

              <Link
                href="/demo"
                className={getLinkClass("demo", true)}
              >
                <Sparkles className="h-3.5 w-3.5" />
                Demo
              </Link>
              <Link
                href="/verify"
                className={getLinkClass("verify", true)}
              >
                <Shield className="h-3.5 w-3.5" />
                Verify
              </Link>
            </nav>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="ghost" className="text-sm font-medium h-9">
                  Log In
                </Button>
              </Link>
              <Link href="/deal/new">
                <HeaderMagneticWrapper>
                  <Button size="sm" className="font-medium h-9 shadow-sm">Get Started</Button>
                </HeaderMagneticWrapper>
              </Link>
            </div>
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9"
              onClick={() => setMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Drawer */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileMenuOpen(false)}
              className="fixed inset-0 bg-black/50 z-60 backdrop-blur-sm"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 w-[280px] bg-card border-r z-70 flex flex-col"
            >
              {/* Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b">
                <Link href="/" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-2">
                  <AnimatedLogo size={28} className="text-foreground" />
                  <span className="font-bold text-lg tracking-tight">Proofo</span>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Navigation */}
              <nav className="flex-1 px-3 py-6 flex flex-col gap-1 overflow-y-auto">
                <Link href="/#features" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl">
                    <FileCheck className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                    Features
                  </Button>
                </Link>
                <Link href="/#how-it-works" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl">
                    <Zap className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                    How it works
                  </Button>
                </Link>
                <Link href="/#pricing" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl">
                    <ShoppingBag className="h-4.5 w-4.5 shrink-0 text-muted-foreground" />
                    Pricing
                  </Button>
                </Link>

                <div className="my-2 border-t border-border/50" />

                <Link href="/demo" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className={`w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl ${currentPage === 'demo' ? 'bg-secondary' : ''}`}>
                    <Sparkles className="h-4.5 w-4.5 text-primary" />
                    Demo
                  </Button>
                </Link>
                <Link href="/verify" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className={`w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl ${currentPage === 'verify' ? 'bg-secondary' : ''}`}>
                    <Shield className="h-4.5 w-4.5 text-primary" />
                    Verify
                  </Button>
                </Link>
              </nav>

              {/* Footer Actions */}
              <div className="p-3 border-t space-y-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl">
                    <User className="h-4 w-4" />
                    Log In
                  </Button>
                </Link>
                <Link href="/deal/new" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full h-9 shadow-sm">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
