"use client";

import { useState, useRef, useEffect } from "react";
import {
  motion,
  AnimatePresence,
  useMotionValue,
  useSpring,
  PanInfo
} from "framer-motion";
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
  Zap,
  ChevronRight,
  LogIn,
  CreditCard,
  Layers,
} from "lucide-react";
import { cn } from "@/lib/utils";

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

  // Lock body scroll when menu is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [mobileMenuOpen]);

  // Helper for active state or highlight
  const getLinkClass = (page: string, isHighlight = false) => {
    const base = "transition-colors flex items-center gap-1.5 text-sm";

    if (currentPage === page) {
      return `${base} text-foreground font-semibold`;
    }

    if (isHighlight) {
      return `${base} text-primary font-medium hover:opacity-80`;
    }

    return `${base} text-muted-foreground hover:text-foreground font-medium`;
  };

  // Animation variants for menu items
  const menuListVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.06,
        delayChildren: 0.15
      }
    }
  };

  const menuItemVariants = {
    hidden: { opacity: 0, x: 20 },
    visible: { opacity: 1, x: 0, transition: { type: "spring", stiffness: 300, damping: 24 } }
  };

  // Handle swipe to close
  const handleDragEnd = (_: never, info: PanInfo) => {
    if (info.offset.x > 100 || info.velocity.x > 500) {
      setMobileMenuOpen(false);
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-border/20 bg-background/20 backdrop-blur-2xl transition-all duration-300">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between max-w-6xl">

          <div className="flex items-center gap-8">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 group" onClick={() => setMobileMenuOpen(false)}>
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
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />

            {/* Desktop Auth */}
            <div className="hidden sm:flex items-center gap-2">
              <Link href="/login">
                <Button size="sm" variant="ghost" className="text-sm font-medium h-9 hover:bg-primary/5">
                  Log In
                </Button>
              </Link>
              <Link href="/deal/new">
                <HeaderMagneticWrapper>
                  <Button size="sm" className="font-medium h-9 shadow-sm">Get Started</Button>
                </HeaderMagneticWrapper>
              </Link>
            </div>

            {/* Mobile Auth (User Icon) */}
            <Link href="/login" className="sm:hidden">
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full bg-secondary/50 text-foreground hover:bg-secondary/60 border border-transparent hover:border-border/30 transition-all backdrop-blur-sm">
                <User className="h-4 w-4" />
                <span className="sr-only">Log In</span>
              </Button>
            </Link>

            {/* Mobile Menu Toggle */}
            <Button
              variant="ghost"
              size="icon"
              className="md:hidden h-9 w-9 hover:bg-secondary/30"
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
              className="fixed inset-0 bg-background/30 backdrop-blur-[2px] z-50"
            />

            {/* Drawer (Slide from Right) */}
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={{ left: 0, right: 0.5 }}
              onDragEnd={handleDragEnd}
              className="fixed inset-y-0 right-0 w-full sm:w-[360px] bg-background/100 backdrop-blur-3xl border-l border-white/10 dark:border-white/5 z-50 flex flex-col shadow-2xl"
            >
              {/* Gradient Blob Background */}
              <div className="absolute top-[-20%] right-[-20%] w-[80%] h-[50%] bg-primary/10 rounded-full blur-3xl pointer-events-none opacity-50" />
              <div className="absolute bottom-[-10%] left-[-10%] w-[60%] h-[40%] bg-secondary/30 rounded-full blur-3xl pointer-events-none opacity-50" />

              {/* Drawer Header */}
              <div className="h-16 flex items-center justify-between px-6 border-b border-border/20 relative z-10 shrink-0">
                <span className="font-semibold text-lg tracking-tight">Menu</span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-9 w-9 rounded-full hover:bg-secondary/50"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              {/* Drawer Content */}
              <motion.div
                className="flex-1 overflow-y-auto px-6 py-8 relative z-10"
                variants={menuListVariants}
                initial="hidden"
                animate="visible"
              >
                <div className="space-y-10">
                  {/* Section 1: Product */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 opacity-70">Experience</p>
                    <MobileNavLink
                      href="/demo"
                      icon={Sparkles}
                      active={currentPage === 'demo'}
                      onClick={() => setMobileMenuOpen(false)}
                      variants={menuItemVariants}
                      description="Try the interactive demo"
                    >
                      Interactive Demo
                    </MobileNavLink>
                    <MobileNavLink
                      href="/verify"
                      icon={Shield}
                      active={currentPage === 'verify'}
                      onClick={() => setMobileMenuOpen(false)}
                      variants={menuItemVariants}
                      description="Check deal authenticity"
                    >
                      Verify Deal
                    </MobileNavLink>
                  </div>

                  {/* Section 2: Navigation */}
                  <div className="space-y-2">
                    <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest px-2 mb-2 opacity-70">Company</p>
                    <MobileNavLink href="/#features" icon={Layers} onClick={() => setMobileMenuOpen(false)} variants={menuItemVariants}>Features</MobileNavLink>
                    <MobileNavLink href="/#how-it-works" icon={Zap} onClick={() => setMobileMenuOpen(false)} variants={menuItemVariants}>How it works</MobileNavLink>
                    <MobileNavLink href="/#pricing" icon={CreditCard} onClick={() => setMobileMenuOpen(false)} variants={menuItemVariants}>Pricing</MobileNavLink>
                  </div>
                </div>
              </motion.div>

              {/* Drawer Footer */}
              <div className="p-6 border-t border-border/20 bg-secondary/5 space-y-3 relative z-10 shrink-0">
                <Link href="/deal/new" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button className="w-full justify-between h-12 text-base rounded-2xl shadow-lg shadow-primary/20 px-6 group">
                    <span className="font-semibold">Get Started</span>
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/login" onClick={() => setMobileMenuOpen(false)} className="block">
                  <Button variant="outline" className="w-full justify-center gap-2 h-12 text-base rounded-2xl border-border/40 bg-background/30 hover:bg-background/50 backdrop-blur-sm">
                    <LogIn className="h-4 w-4" />
                    Log In
                  </Button>
                </Link>
                <div className="pt-2 flex justify-center">
                  <div className="w-12 h-1 rounded-full bg-border/30" />
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

// Helper component for mobile nav items
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function MobileNavLink({ href, icon: Icon, children, onClick, active, variants, description }: any) {
  return (
    <motion.div variants={variants}>
      <Link href={href} onClick={onClick}>
        <div className={cn(
          "group flex items-center justify-between p-3.5 rounded-2xl transition-all duration-300",
          active
            ? "bg-primary/5 border border-primary/10 shadow-sm"
            : "hover:bg-secondary/40 border border-transparent hover:border-border/20"
        )}>
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-10 w-10 rounded-xl flex items-center justify-center transition-colors duration-300",
              active
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "bg-secondary/60 group-hover:bg-background text-muted-foreground group-hover:text-foreground shadow-sm"
            )}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <span className={cn(
                "block font-semibold text-base",
                active ? "text-primary" : "text-foreground"
              )}>{children}</span>
              {description && (
                <span className="block text-xs text-muted-foreground mt-0.5 font-medium opacity-80">{description}</span>
              )}
            </div>
          </div>
          <ChevronRight className={cn(
            "h-5 w-5 transition-transform duration-300 group-hover:translate-x-1",
            active ? "text-primary opacity-100" : "text-muted-foreground opacity-30 group-hover:opacity-100"
          )} />
        </div>
      </Link>
    </motion.div>
  );
}
