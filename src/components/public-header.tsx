"use client";

import { useState } from "react";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { AnimatedLogo } from "@/components/animated-logo";
import {
  Shield,
  FileCheck,
  Zap,
  ShoppingBag,
  Menu,
  X,
  User,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface PublicHeaderProps {
  currentPage?: "home" | "demo" | "verify";
  showNav?: boolean;
}

// Magnetic Button Wrapper for hover effect
const MagneticWrapper = ({ children }: { children: React.ReactNode }) => {
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { currentTarget, clientX, clientY } = e;
    const { left, top, width, height } = currentTarget.getBoundingClientRect();
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
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
    >
      {children}
    </motion.div>
  );
};

export function PublicHeader({ currentPage = "home", showNav = true }: PublicHeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { href: "/#features", label: "Features", icon: FileCheck, onlyHome: true },
    { href: "/#how-it-works", label: "How it works", icon: Zap, onlyHome: true },
    { href: "/#pricing", label: "Pricing", icon: ShoppingBag, onlyHome: true },
    { href: "/demo", label: "Demo", icon: Sparkles, highlight: currentPage === "demo" },
    { href: "/verify", label: "Verify", icon: Shield, highlight: currentPage === "verify", primary: true },
  ];

  const filteredNavItems = showNav
    ? (currentPage === "home" ? navItems : navItems.filter(item => !item.onlyHome))
    : [];

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <AnimatedLogo size={28} className="text-foreground" />
            <span className="font-bold tracking-tight text-lg">Proofo</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden sm:flex items-center gap-1">
            <nav className="flex items-center gap-1 text-sm text-muted-foreground mr-4">
              {filteredNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-colors ${
                    item.primary
                      ? "text-primary hover:bg-primary/10"
                      : item.highlight
                      ? "text-foreground bg-secondary/50"
                      : "hover:text-foreground hover:bg-secondary/50"
                  }`}
                >
                  <item.icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              ))}
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
              <Link href="/dashboard">
                <MagneticWrapper>
                  <Button size="sm" className="font-medium h-9 shadow-sm">
                    Get Started
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </MagneticWrapper>
              </Link>
            </div>
            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="sm:hidden h-9 w-9"
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
                {filteredNavItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Button
                      variant="ghost"
                      className={`w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl ${
                        item.highlight ? "bg-secondary/50" : ""
                      }`}
                    >
                      <item.icon className={`h-4.5 w-4.5 shrink-0 ${item.primary ? "text-primary" : ""}`} />
                      {item.label}
                    </Button>
                  </Link>
                ))}
              </nav>

              {/* Footer Actions */}
              <div className="p-3 border-t space-y-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="ghost" className="w-full justify-start gap-3 h-10 px-3 text-sm font-medium rounded-xl">
                    <User className="h-4 w-4" />
                    Log In
                  </Button>
                </Link>
                <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                  <Button className="w-full h-9 shadow-sm">
                    Get Started
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
