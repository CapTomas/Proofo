"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  AnimatePresence,
  useScroll,
  useSpring,
  useInView,
  useMotionValue,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AnimatedLogo } from "@/components/animated-logo";
import {
  Shield,
  FileCheck,
  Smartphone,
  Users,
  ArrowRight,
  PenLine,
  Pen,
  QrCode,
  Zap,
  Wallet,
  Building,
  Wrench,
  Quote,
  Check,
  Copy,
  ShieldCheck,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { PublicHeader } from "@/components/public-header";
import { LoginModal } from "@/components/login-modal";

// --- CUSTOM ANIMATIONS ---

// 1. Magnetic Button Wrapper
const MagneticWrapper = ({ children }: { children: React.ReactNode }) => {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const { clientX, clientY } = e;
    const { left, top, width, height } = ref.current?.getBoundingClientRect() || {
      left: 0,
      top: 0,
      width: 0,
      height: 0,
    };
    const centerX = left + width / 2;
    const centerY = top + height / 2;

    // Calculate distance from center
    const dist = { x: clientX - centerX, y: clientY - centerY };

    // Apply magnetic pull
    x.set(dist.x * 0.15);
    y.set(dist.y * 0.15);
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

// 2. Grain Overlay
const GrainOverlay = () => (
  <div className="fixed inset-0 z-[100] pointer-events-none opacity-[0.08] mix-blend-soft-light">
    <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
      <filter id="noise">
        <feTurbulence
          type="fractalNoise"
          baseFrequency="0.65"
          numOctaves="3"
          stitchTiles="stitch"
        />
        <feColorMatrix type="saturate" values="0" />
      </filter>
      <rect width="100%" height="100%" filter="url(#noise)" />
    </svg>
  </div>
);



// 3. Scroll Progress Line
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-foreground/10 origin-left z-[101]"
      style={{ scaleX }}
    />
  );
};
const SignatureAnimation = ({ onComplete }: { onComplete?: () => void }) => (
  <svg
    viewBox="0 0 200 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="w-32 h-16 text-primary opacity-80"
  >
    <motion.path
      d="M20,50 C20,50 40,20 50,50 C60,80 40,90 30,70 C20,50 60,30 80,50 C100,70 120,50 130,40 C140,30 160,40 150,60 C140,80 170,60 180,50"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: false, margin: "-20%" }}
      transition={{ duration: 2, ease: "easeInOut", delay: 0.2 }}
      onAnimationComplete={onComplete}
    />
  </svg>
);

// Signature Box with emerald styling on completion
const SignatureBox = () => {
  const [isComplete, setIsComplete] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(boxRef, { once: false, margin: "-20%" });

  // Reset when leaving view
  useEffect(() => {
    if (!isInView) {
      setIsComplete(false);
    }
  }, [isInView]);

  return (
    <motion.div
      ref={boxRef}
      className={`rounded-xl p-4 flex items-center justify-center h-40 relative overflow-hidden transition-all duration-700 border ${
        isComplete
          ? "bg-emerald-soft border-emerald-border"
          : "bg-secondary/20 border-dashed border-border/60"
      }`}
      animate={isComplete ? { rotate: -2 } : { rotate: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] bg-size-[16px_16px] opacity-50"></div>
      <div className="-rotate-6">
        <SignatureAnimation onComplete={() => setIsComplete(true)} />
      </div>
    </motion.div>
  );
};

// 4. Animated Lock Icon
const AnimatedLock = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6 text-primary"
  >
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
    <motion.path
      d="M7 11V7a5 5 0 0 1 10 0v4"
      initial={{ d: "M7 11V7a5 5 0 0 1 10 0v0" }}
      whileInView={{ d: "M7 11V7a5 5 0 0 1 10 0v4" }}
      transition={{ duration: 0.8, ease: "backOut", delay: 0.2 }}
      viewport={{ once: false, margin: "-20%" }}
    />
  </svg>
);

// 5. Animated Document
const AnimatedDoc = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="h-6 w-6 text-primary"
  >
    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
    <polyline points="14 2 14 8 20 8" />
    <motion.line
      x1="8"
      y1="13"
      x2="16"
      y2="13"
      strokeWidth="2.5"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      viewport={{ once: false }}
    />
    <motion.line
      x1="8"
      y1="17"
      x2="16"
      y2="17"
      strokeWidth="2.5"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.6 }}
      viewport={{ once: false }}
    />
    <motion.line
      x1="8"
      y1="9"
      x2="10"
      y2="9"
      strokeWidth="2.5"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.9 }}
      viewport={{ once: false }}
    />
  </svg>
);

// 6. Animated Checkmark
const AnimatedCheck = ({ delay = 0, className }: { delay?: number; className?: string }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="3"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className || "text-emerald-muted mr-1.5"}
  >
    <motion.polyline
      points="20 6 9 17 4 12"
      initial={{ pathLength: 0, opacity: 0 }}
      whileInView={{ pathLength: 1, opacity: 1 }}
      viewport={{ once: false }}
      transition={{ duration: 0.8, delay: delay, ease: "easeOut" }}
    />
  </svg>
);

// 7. Scramble Text (Restored)
const ScrambleText = ({ text, className, onComplete }: { text: string; className?: string; onComplete?: () => void }) => {
  const [displayText, setDisplayText] = useState(text);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-10%" });
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    if (!isInView) {
      hasCompletedRef.current = false;
      return;
    }
    const chars = "0123456789abcdef";
    let iteration = 0;
    const interval = setInterval(() => {
      setDisplayText(() =>
        text
          .split("")
          .map((letter, index) => {
            if (index < iteration) return text[index];
            return chars[Math.floor(Math.random() * chars.length)];
          })
          .join("")
      );
      if (iteration >= text.length) {
        clearInterval(interval);
        if (!hasCompletedRef.current) {
          hasCompletedRef.current = true;
          onComplete?.();
        }
      }
      iteration += 1 / 4;
    }, 50);
    return () => clearInterval(interval);
  }, [isInView, text, onComplete]);
  return (
    <span ref={ref} className={className}>
      {displayText}
    </span>
  );
};

// 8. Interactive Hash (Combines Scramble + Copy)
const InteractiveHash = () => {
  const [copied, setCopied] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: "-10%" });
  const text = "0x7f83b1657ff1fc53b92";

  // Reset when leaving view
  useEffect(() => {
    if (!isInView) {
      setIsComplete(false);
    }
  }, [isInView]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      ref={containerRef}
      onClick={handleCopy}
      className={`group relative cursor-pointer text-[10px] font-mono p-2 rounded overflow-hidden transition-all duration-700 border ${
        isComplete
          ? "bg-emerald-soft border-emerald-border text-emerald-muted"
          : "text-muted-foreground/60 bg-secondary/30 border-border/50 hover:bg-secondary/50"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="truncate">
          <ScrambleText text={text} onComplete={() => setIsComplete(true)} />
          ...
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? <Check className="h-3 w-3 text-emerald-muted" /> : <Copy className="h-3 w-3" />}
        </div>
      </div>
    </motion.div>
  );
};

// 9. Workflow Animations (Refined per feedback)

const AnimatedCreate = () => (
  <div className="relative w-12 h-12 flex items-center justify-center">
    {/* Document - Reacts to click */}
    <motion.svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-primary"
      animate={{
        scale: [1, 1, 0.9, 1, 1], // Scale down at 0.5 (sync with cursor click)
      }}
      transition={{
        duration: 3,
        times: [0, 0.4, 0.5, 0.6, 1],
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "easeInOut",
      }}
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <line x1="10" y1="9" x2="8" y2="9" />
    </motion.svg>

    {/* Custom Sharp Cursor - Slides in, tactile click, slides away */}
    <motion.svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className="absolute z-10 w-4 h-4 text-primary drop-shadow-sm"
      initial={{ x: 24, y: 24, opacity: 0 }}
      animate={{
        x: [24, 6, 6, 24], // Move from bottom-right to center
        y: [24, 6, 6, 24],
        opacity: [0, 1, 1, 0], // Fade in/out
        scale: [1, 1, 0.8, 1], // Tactile click squeeze at 0.5
      }}
      transition={{
        duration: 3,
        times: [0, 0.3, 0.5, 1],
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "easeInOut",
      }}
    >
      <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" stroke="none" />
    </motion.svg>
  </div>
);

const AnimatedQR = () => (
  <div className="relative w-12 h-12 flex items-center justify-center overflow-hidden">
    <QrCode className="w-8 h-8 text-primary" />
    {/* Scan Line - Full Height Scan */}
    <motion.div
      className="absolute left-0 right-0 h-0.5 bg-primary shadow-[0_0_8px_rgba(0,0,0,0.5)]"
      initial={{ top: "-10%" }}
      animate={{ top: "110%" }}
      transition={{
        duration: 3,
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "linear",
      }}
    />
  </div>
);

const AnimatedSign = () => (
  <div className="relative w-12 h-12 flex items-center justify-center overflow-hidden">
    {/* Centered Document Line */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[-5px] w-8 h-0.5 bg-border rounded-full" />

    {/* Drawn Signature Line - Perfectly centered, shorter path */}
    <svg
      className="absolute top-1/2 left-1/2 -translate-x-2.5 -translate-y-2.5 w-8 h-8 overflow-visible"
      viewBox="0 0 32 32"
    >
      <motion.path
        d="M6,16 Q12,12 16,16 T26,16" // Start at 6, End at 26 (centered in 32)
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-primary"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: "easeInOut",
        }}
      />
    </svg>

    {/* Pen - Tightly controlled movement */}
    <motion.div
      className="absolute top-1/2 left-1/2" // Anchor at center
      initial={{ x: -10, y: -16 }} // Start position (relative to center)
      animate={{ x: 10 }} // End position x (relative to center)
      transition={{
        duration: 3,
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "easeInOut",
      }}
    >
      {/* Pen Tip Offset - Lower the pen so the tip touches the line */}
      <motion.div
        className="origin-bottom-left" // Rotate around tip
        initial={{ x: 0, y: 0 }} // Tip is at (0,0) of this container
        animate={{
          rotate: [0, -15, 5, -10, 0], // Writing wiggle
          y: [0, -2, 0, -1, 0], // Pressure
        }}
        transition={{
          duration: 3,
          repeat: Infinity,
          repeatDelay: 0.5,
          ease: "linear",
        }}
      >
        {/* Actual Icon - Translated so tip (bottom-left of icon) is at (0,0) */}
        <Pen className="w-5 h-5 text-primary -scale-x-100 -translate-x-[13px] translate-y-0" />
      </motion.div>
    </motion.div>
  </div>
);

const AnimatedProof = () => (
  <div className="relative w-12 h-12 flex items-center justify-center">
    {/* Clock Face */}
    <svg
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="text-primary"
    >
      <circle cx="12" cy="12" r="10" />
    </svg>

    {/* Minute Hand - 1 rotation per loop */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ rotate: 360 }}
      transition={{
        duration: 3,
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "linear",
      }}
    >
      <div className="w-0.5 h-3 bg-primary origin-bottom -translate-y-1.5 rounded-full" />
    </motion.div>

    {/* Hour Hand - Slight movement */}
    <motion.div
      className="absolute inset-0 flex items-center justify-center"
      animate={{ rotate: 30 }} // Moves 1 hour
      transition={{
        duration: 3,
        repeat: Infinity,
        repeatDelay: 0.5,
        ease: "linear",
      }}
    >
      <div className="w-0.5 h-2 bg-primary origin-bottom -translate-y-1 rounded-full" />
    </motion.div>
  </div>
);

// 10. Use Case Hover Animations
const HoverIcon = ({
  children,
  type,
}: {
  children: React.ReactNode;
  type: "shake" | "bounce" | "pulse" | "rotate";
}) => {
  const animations = {
    shake: { rotate: [0, -10, 10, -10, 10, 0] },
    bounce: { y: [0, -5, 0, -3, 0] },
    pulse: { scale: [1, 1.1, 1] },
    rotate: { rotate: [0, 15, -15, 0] },
  };

  return (
    <motion.div whileHover={animations[type]} transition={{ duration: 0.5 }}>
      {children}
    </motion.div>
  );
};

// --- SECTIONS ---

const BentoGrid = () => (
  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto px-4">
    {/* Large Card - Asymmetric Registration */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="md:col-span-2 row-span-2"
    >
      <Card className="h-full bg-card border border-border/50 shadow-sm hover:shadow-xl hover:shadow-foreground/5 hover:border-foreground/10 transition-all duration-500 group cursor-default">
        <CardContent className="p-8 flex flex-col justify-between h-full">
          <div className="space-y-6 max-w-lg">
            <div className="h-12 w-12 rounded-lg bg-secondary/80 flex items-center justify-center border border-border/50 group-hover:bg-secondary transition-colors">
              <Users className="h-6 w-6 text-foreground/70" />
            </div>
            <h3 className="text-3xl font-semibold tracking-tight">Zero Friction for Them</h3>
            <p className="text-muted-foreground text-lg leading-relaxed">
              They sign on any device. No account. No app download.{" "}
              <strong>No reason to say no.</strong>
            </p>
          </div>
          <div className="mt-10 flex flex-wrap gap-3">
            <Badge
              variant="secondary"
              className="px-3 py-1.5 text-sm font-normal bg-secondary/50 border-0"
            >
              <AnimatedCheck delay={0.2} />
              No App Download
            </Badge>
            <Badge
              variant="secondary"
              className="px-3 py-1.5 text-sm font-normal bg-secondary/50 border-0"
            >
              <AnimatedCheck delay={0.6} />
              No Account Required
            </Badge>
            <Badge
              variant="secondary"
              className="px-3 py-1.5 text-sm font-normal bg-secondary/50 border-0"
            >
              <AnimatedCheck delay={1.0} />
              Instant Access
            </Badge>
          </div>
        </CardContent>
      </Card>
    </motion.div>

    {/* Tall Card - Signatures */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
      className="md:col-span-1 row-span-2"
    >
      <Card className="h-full bg-card border border-border/50 shadow-sm hover:shadow-xl hover:shadow-foreground/5 hover:border-foreground/10 transition-all duration-500 group cursor-default">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="h-10 w-10 rounded-lg bg-secondary/80 flex items-center justify-center mb-6 border border-border/50 group-hover:bg-secondary transition-colors">
            <PenLine className="h-5 w-5 text-foreground/70" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Signatures That Stick</h3>
          <p className="text-muted-foreground text-sm mb-8">
            A drawn signature captures intent better than a text message. It&apos;s psychological
            cement for your deal.
          </p>
          <div className="mt-auto">
            <SignatureBox />
          </div>
        </CardContent>
      </Card>
    </motion.div>

    {/* Medium Card - Crypto */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2 }}
      className="md:col-span-1"
    >
      <Card className="h-full bg-card border border-border/50 shadow-sm hover:shadow-xl hover:shadow-foreground/5 hover:border-foreground/10 transition-all duration-500 group cursor-default">
        <CardContent className="p-6">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-secondary/80 transition-colors">
            <AnimatedLock />
          </div>
          <h3 className="text-lg font-semibold mb-2">The Truth, Locked Forever</h3>
          <p className="text-muted-foreground text-sm mb-4">
            SHA-256 encryption seals your agreement. If a single pixel changes, the proof breaks.
          </p>
          <InteractiveHash />
        </CardContent>
      </Card>
    </motion.div>

    {/* Medium Card - Mobile */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.3 }}
      className="md:col-span-1"
    >
      <Card className="h-full bg-card border border-border/50 shadow-sm hover:shadow-xl hover:shadow-foreground/5 hover:border-foreground/10 transition-all duration-500 group cursor-default">
        <CardContent className="p-6">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-secondary/80 transition-colors">
            <Smartphone className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Deals Happen Anywhere</h3>
          <p className="text-muted-foreground text-sm">
            Built for any device—phone, tablet, or laptop. Proofo is ready where you are.
          </p>
        </CardContent>
      </Card>
    </motion.div>

    {/* Medium Card - PDF */}
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.4 }}
      className="md:col-span-1"
    >
      <Card className="h-full bg-card border border-border/50 shadow-sm hover:shadow-xl hover:shadow-foreground/5 hover:border-foreground/10 transition-all duration-500 group cursor-default">
        <CardContent className="p-6">
          <div className="h-10 w-10 rounded-lg bg-secondary/80 flex items-center justify-center mb-4 border border-border/50 group-hover:bg-secondary transition-colors">
            <AnimatedDoc />
          </div>
          <h3 className="text-lg font-semibold mb-2">Instant Digital Receipts</h3>
          <p className="text-muted-foreground text-sm">
            Both parties get a professional, timestamped PDF receipt instantly. No chasing.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  </div>
);

// =============================================================================
// HOW IT WORKS - Interactive Step-Through Demo
// =============================================================================

const workflowSteps = [
  {
    id: "draft",
    label: "Draft",
    description: "Pick a template or write custom terms",
  },
  {
    id: "share",
    label: "Share",
    description: "Send a link — no app needed for them",
  },
  {
    id: "sign",
    label: "Sign",
    description: "They sign on any device with their finger",
  },
  {
    id: "proof",
    label: "Proof",
    description: "Both parties get a sealed PDF instantly",
  },
];

// Step Preview Components
const DraftPreview = () => {
  const [text, setText] = useState("");
  const fullText = "I agree to return the camera in same condition...";

  useEffect(() => {
    let i = 0;
    setText("");
    const interval = setInterval(() => {
      if (i < fullText.length) {
        setText(fullText.slice(0, i + 1));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 40);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {[
          { icon: FileCheck, label: "Loan" },
          { icon: Wrench, label: "Service" },
          { icon: Building, label: "Rental" },
        ].map((t, i) => (
          <motion.div
            key={t.label}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            className={`px-3 py-2 rounded-lg text-sm font-medium cursor-pointer transition-all flex items-center gap-2 ${
              i === 0
                ? "bg-emerald-soft border border-emerald-border text-emerald-text"
                : "bg-secondary/50 border border-transparent hover:border-border/50"
            }`}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </motion.div>
        ))}
      </div>
      <div className="bg-secondary/30 rounded-xl p-5 border border-border/50 min-h-[100px]">
        <p className="text-base text-foreground/90 leading-relaxed">
          {text}
          <motion.span
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
            className="inline-block w-0.5 h-5 bg-emerald-muted ml-0.5 align-middle"
          />
        </p>
      </div>
    </div>
  );
};

const SharePreview = () => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setCopied(true), 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="space-y-4">
      <div className="bg-secondary/30 rounded-xl p-5 border border-border/50">
        <div className="flex items-center gap-3">
          <div className="flex-1 font-mono text-sm text-muted-foreground truncate">
            proofo.app/deal/xK9mQ2...
          </div>
          <motion.button
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              copied
                ? "bg-emerald-soft border border-emerald-border text-emerald-text"
                : "bg-secondary border border-border/50"
            }`}
            animate={copied ? { scale: [1, 1.05, 1] } : {}}
          >
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? "Copied!" : "Copy"}
          </motion.button>
        </div>
      </div>

      <div className="flex justify-center gap-6 pt-2">
        {[
          { Icon: Smartphone, label: "Text", delay: 0.2 },
          { Icon: FileCheck, label: "Email", delay: 0.4 },
          { Icon: QrCode, label: "QR Code", delay: 0.6 },
        ].map((item) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: item.delay }}
            className="flex flex-col items-center gap-2"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary/50 border border-border/50 flex items-center justify-center hover:border-emerald-border hover:bg-emerald-soft/50 transition-all cursor-pointer">
              <item.Icon className="w-5 h-5 text-muted-foreground" />
            </div>
            <span className="text-xs text-muted-foreground">{item.label}</span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const SignPreview = () => {
  return (
    <div className="space-y-3">
      <div className="bg-secondary/30 rounded-xl p-5 border border-border/50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center text-sm font-bold">
            JD
          </div>
          <div>
            <p className="text-sm font-medium">John Doe</p>
            <p className="text-xs text-muted-foreground">Signing now...</p>
          </div>
        </div>
        <div className="h-16 rounded-lg bg-background border border-dashed border-border/60 flex items-center justify-center overflow-hidden">
          <svg viewBox="0 0 200 60" className="w-32 h-12 text-foreground/70">
            <motion.path
              d="M20,30 C20,30 35,15 45,30 C55,45 40,50 32,38 C24,26 55,18 75,30 C95,42 110,30 120,25 C130,20 150,28 142,40 C134,52 160,38 175,30"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 2, ease: "easeInOut" }}
            />
          </svg>
        </div>
      </div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2 }}
        className="text-center"
      >
        <span className="inline-flex items-center gap-2 text-sm text-emerald-muted font-medium">
          <Check className="w-4 h-4" /> Signature captured
        </span>
      </motion.div>
    </div>
  );
};

const ProofPreview = () => {
  const [stage, setStage] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setStage(1), 500),
      setTimeout(() => setStage(2), 1200),
      setTimeout(() => setStage(3), 1800),
    ];
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <div className="space-y-4">
      <motion.div
        className="bg-card rounded-xl p-5 border border-border shadow-sm"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-secondary border border-border flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-foreground" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold">Deal Sealed</p>
            <p className="text-xs text-muted-foreground font-mono truncate mt-0.5">
              SHA-256: 9f86d081884c7d65...
            </p>
          </div>
        </div>
      </motion.div>

      <div className="flex gap-3">
        {[
          { label: "Your inbox", delay: 0.5 },
          { label: "Their inbox", delay: 0.8 },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, x: i === 0 ? -10 : 10 }}
            animate={{ opacity: stage >= i + 2 ? 1 : 0.3, x: 0 }}
            transition={{ delay: item.delay }}
            className="flex-1 bg-secondary/30 rounded-lg p-3 border border-border/50"
          >
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded bg-secondary flex items-center justify-center">
                <FileCheck className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{item.label}</p>
                <p className="text-[10px] text-muted-foreground">PDF attached</p>
              </div>
              {stage >= i + 2 && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="w-5 h-5 rounded-full bg-foreground flex items-center justify-center"
                >
                  <Check className="w-3 h-3 text-background" />
                </motion.div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const stepPreviews = {
  draft: DraftPreview,
  share: SharePreview,
  sign: SignPreview,
  proof: ProofPreview,
};

const WorkflowSection = () => {
  const [activeStep, setActiveStep] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, margin: "-20%" });
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-advance steps
  useEffect(() => {
    if (!isInView || !isAutoPlaying) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % workflowSteps.length);
    }, 4000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isInView, isAutoPlaying]);

  const handleStepClick = (index: number) => {
    setActiveStep(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const ActivePreview = stepPreviews[workflowSteps[activeStep].id as keyof typeof stepPreviews];

  return (
    <div ref={containerRef} className="max-w-4xl mx-auto">
      <div className="grid md:grid-cols-2 gap-8 md:gap-12 items-center">
        {/* Right: Step Selector */}
        <div className="order-2 space-y-2">
          {workflowSteps.map((step, i) => (
            <motion.button
              key={step.id}
              onClick={() => handleStepClick(i)}
              className={`w-full group text-left p-3 rounded-xl border transition-all duration-300 relative overflow-hidden ${
                activeStep === i
                  ? "bg-emerald-soft border-emerald-border shadow-sm"
                  : "bg-transparent border-transparent hover:bg-secondary/50 hover:border-border/50"
              }`}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Progress bar for active step */}
              {activeStep === i && isAutoPlaying && (
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 bg-emerald-muted/50"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 4, ease: "linear" }}
                  key={`progress-${activeStep}`}
                />
              )}

              <div className="flex items-center gap-4">
                {/* Step number */}
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center font-bold text-sm transition-all duration-300 ${
                    activeStep === i
                      ? "bg-emerald-soft border border-emerald-border text-emerald-text"
                      : "bg-secondary/80 border border-border/50 text-muted-foreground group-hover:border-border"
                  }`}
                >
                  {i + 1}
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <h3
                    className={`font-semibold transition-colors duration-300 ${
                      activeStep === i ? "text-emerald-text" : "text-foreground"
                    }`}
                  >
                    {step.label}
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {step.description}
                  </p>
                </div>

                {/* Arrow indicator */}
                <motion.div
                  animate={{ x: activeStep === i ? 0 : -4, opacity: activeStep === i ? 1 : 0 }}
                  className="text-emerald-muted"
                >
                  <ArrowRight className="w-4 h-4" />
                </motion.div>
              </div>
          </motion.button>
          ))}

          {/* Progress Dots Indicator - Matched with Operating System section style */}
          <div className="flex gap-2 pt-2 px-1">
            {workflowSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => handleStepClick(i)}
                className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                  activeStep === i
                    ? "w-8 bg-emerald-muted"
                    : "w-1.5 bg-border hover:bg-muted-foreground/30"
                }`}
              />
            ))}
          </div>
        </div>

        {/* Left: Interactive Preview */}
        <div className="order-1">
          <motion.div
            className="bg-card rounded-3xl border border-border/60 shadow-xl p-6 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-soft/30 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

            {/* Step label badge */}
            <div className="flex items-center gap-2 mb-4">
              <div className="px-2.5 py-1 rounded-full bg-emerald-soft border border-emerald-border text-[10px] font-bold uppercase tracking-wider text-emerald-text">
                Step {activeStep + 1}
              </div>
              <span className="text-sm font-medium">{workflowSteps[activeStep].label}</span>
            </div>

            {/* Animated preview content */}
            <AnimatePresence mode="wait">
              <motion.div
                key={workflowSteps[activeStep].id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="relative z-10"
              >
                <ActivePreview />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
};


// Real World Section - Interactive with Auto-Rotation
const useCaseExamples = [
  {
    icon: Smartphone,
    title: "Marketplace Sales",
    desc: "Selling tech, furniture, or anything online? Lock in the terms before cash changes hands.",
    anim: "pulse" as const,
    deal: {
      name: "iPhone 15 Pro Sale",
      id: "PR-8092",
      terms: [
        { label: "Price", value: "$850" },
        { label: "Storage", value: "256GB" },
        { label: "Condition", value: "Mint" },
      ],
      creator: { initials: "AT", name: "Alex T." },
      signer: { initials: "JM", name: "Jordan M." },
      quote: "Sold on Marketplace. Buyer claimed 'scratched screen'. My Proofo shut that down.",
    },
  },
  {
    icon: Wallet,
    title: "Money Lending",
    desc: "Lending to friends or family? Get the terms in writing without the awkwardness.",
    anim: "bounce" as const,
    deal: {
      name: "Personal Loan",
      id: "PR-3847",
      terms: [
        { label: "Amount", value: "$500" },
        { label: "Repay By", value: "March 1" },
        { label: "Interest", value: "None" },
      ],
      creator: { initials: "CB", name: "Chris B." },
      signer: { initials: "TL", name: "Taylor L." },
      quote: "Lent money to a friend. Never again without written proof of the terms.",
    },
  },
  {
    icon: Building,
    title: "Rentals & Deposits",
    desc: "Prove you returned the keys, left no damage, and deserve your deposit back.",
    anim: "rotate" as const,
    deal: {
      name: "Security Deposit Return",
      id: "PR-5621",
      terms: [
        { label: "Amount", value: "$1,200" },
        { label: "Condition", value: "No Damage" },
        { label: "Keys", value: "Returned" },
      ],
      creator: { initials: "MP", name: "Morgan P." },
      signer: { initials: "RD", name: "Riley D." },
      quote: "Proof I returned the keys and left no damage. Landlord couldn't argue.",
    },
  },
  {
    icon: Wrench,
    title: "Freelance & Services",
    desc: "Scope creep killer. Agree on deliverables and price before you start.",
    anim: "shake" as const,
    deal: {
      name: "Website Redesign",
      id: "PR-7234",
      terms: [
        { label: "Deliverables", value: "5 Pages" },
        { label: "Revisions", value: "2 Rounds" },
        { label: "Deadline", value: "Feb 1" },
      ],
      creator: { initials: "SK", name: "Sam K." },
      signer: { initials: "MR", name: "Maya R." },
      quote: "Scope creep killed my last gig. Now deliverables are locked in before I start.",
    },
  },
];

const InteractiveRealWorldSection = () => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, margin: "-100px" });

  // Auto-rotation effect
  useEffect(() => {
    if (!isInView || !isAutoPlaying) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % useCaseExamples.length);
    }, 8000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isInView, isAutoPlaying]);

  const handleUseCaseClick = (index: number) => {
    setActiveIndex(index);
    setIsAutoPlaying(false);
    // Resume auto-play after 10 seconds of inactivity
    setTimeout(() => setIsAutoPlaying(true), 10000);
  };

  const activeExample = useCaseExamples[activeIndex];

  return (
    <div ref={containerRef} className="grid md:grid-cols-2 gap-16 items-center">
      {/* Left Column: Context & List */}
      <div className="space-y-10">
        <div className="space-y-4">
          <h2 className="text-3xl font-bold tracking-tight">
            The Operating System for the <br /> Digital Handshake.
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed">
            Deals happen everywhere. Now proof does too. Proofo is designed for the millions of
            agreements that happen every day outside of boardrooms.
          </p>
        </div>

        <div className="space-y-3">
          {useCaseExamples.map((item, i) => (
            <motion.div
              key={i}
              onClick={() => handleUseCaseClick(i)}
              className={`relative flex gap-4 items-start group cursor-pointer p-3 rounded-xl transition-all duration-300 border overflow-hidden ${
                activeIndex === i
                  ? "bg-emerald-soft border-emerald-border shadow-sm"
                  : "bg-transparent border-transparent hover:bg-secondary/50 hover:border-border/50"
              }`}
              initial={{ opacity: 0, x: -10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              {/* Progress bar for active card */}
              {activeIndex === i && isAutoPlaying && (
                <motion.div
                  className="absolute bottom-0 left-0 h-0.5 bg-emerald-muted/50"
                  initial={{ width: "0%" }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 8, ease: "linear" }}
                  key={`progress-${activeIndex}`}
                />
              )}
              <div
                className={`h-10 w-10 rounded-lg flex items-center justify-center shrink-0 border transition-all duration-300 ${
                  activeIndex === i
                    ? "bg-emerald-soft border-emerald-border"
                    : "bg-secondary/80 border-border/50 group-hover:bg-secondary"
                }`}
              >
                <HoverIcon type={item.anim}>
                  <item.icon
                    className={`h-5 w-5 transition-colors duration-300 ${
                      activeIndex === i ? "text-emerald-muted" : "text-foreground/60"
                    }`}
                  />
                </HoverIcon>
              </div>
              <div>
                <h3
                  className={`font-medium transition-colors duration-300 ${
                    activeIndex === i ? "text-emerald-text" : "text-foreground"
                  }`}
                >
                  {item.title}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Progress Indicator */}
        <div className="flex gap-2 pt-2">
          {useCaseExamples.map((_, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`h-1.5 rounded-full transition-all duration-500 cursor-pointer ${
                activeIndex === i
                  ? "w-8 bg-emerald-muted"
                  : "w-1.5 bg-border hover:bg-muted-foreground/30"
              }`}
            />
          ))}
        </div>
      </div>

      {/* Right Column: Visual Anchor */}
      <div className="relative">
        {/* Background Container */}
        <div className="bg-secondary/30 rounded-3xl p-8 border border-border/50 relative overflow-hidden">
          {/* Decorative elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

          <div className="relative z-10 space-y-6">
            {/* Mock Deal Card (Premium Multi-Card Look) */}
            <div className="space-y-4 max-w-md mx-auto">
              {/* 1. Header Card */}
              <motion.div
                key={`header-${activeIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
                className="bg-card rounded-xl border shadow-sm p-5 space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <AnimatePresence mode="wait">
                      <motion.h3
                        key={activeExample.deal.name}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        transition={{ duration: 0.3 }}
                        className="text-lg font-bold tracking-tight"
                      >
                        {activeExample.deal.name}
                      </motion.h3>
                    </AnimatePresence>
                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase font-bold tracking-wider">
                      <AnimatePresence mode="wait">
                        <motion.span
                          key={activeExample.deal.id}
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          exit={{ opacity: 0, scale: 0.9 }}
                          transition={{ duration: 0.25 }}
                          className="bg-secondary px-1.5 py-0.5 rounded border"
                        >
                          {activeExample.deal.id}
                        </motion.span>
                      </AnimatePresence>
                      <span>•</span>
                      <span className="text-emerald-muted">Verified</span>
                    </div>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-emerald-soft flex items-center justify-center text-emerald-muted border border-emerald-border">
                    <Check className="h-5 w-5" />
                  </div>
                </div>
              </motion.div>

              {/* 2. Parties Card */}
              <motion.div
                key={`parties-${activeIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1, duration: 0.4 }}
                className="bg-card rounded-xl border shadow-sm p-4"
              >
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeExample.deal.creator.initials}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.25 }}
                        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs"
                      >
                        {activeExample.deal.creator.initials}
                      </motion.div>
                    </AnimatePresence>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-bold text-muted-foreground">Creator</p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={activeExample.deal.creator.name}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs font-bold truncate"
                        >
                          {activeExample.deal.creator.name}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeExample.deal.signer.initials}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        transition={{ duration: 0.25 }}
                        className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-muted-foreground font-bold text-xs text-foreground"
                      >
                        {activeExample.deal.signer.initials}
                      </motion.div>
                    </AnimatePresence>
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-bold text-emerald-muted">
                        Signed
                      </p>
                      <AnimatePresence mode="wait">
                        <motion.p
                          key={activeExample.deal.signer.name}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="text-xs font-bold truncate text-foreground text-opacity-80"
                        >
                          {activeExample.deal.signer.name}
                        </motion.p>
                      </AnimatePresence>
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* 3. Terms Card */}
              <motion.div
                key={`terms-${activeIndex}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.4 }}
                className="bg-card rounded-xl border shadow-sm p-4 space-y-2"
              >
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeIndex}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="space-y-2"
                  >
                    {activeExample.deal.terms.map((term, i) => (
                      <motion.div
                        key={`${activeIndex}-${i}`}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.1, duration: 0.3 }}
                        className="flex items-center justify-between p-2.5 rounded-lg bg-secondary/20 border border-transparent hover:border-border/50 hover:bg-secondary/40 transition-all cursor-default"
                      >
                        <span className="text-xs text-muted-foreground">{term.label}</span>
                        <span className="text-xs font-bold">{term.value}</span>
                      </motion.div>
                    ))}
                  </motion.div>
                </AnimatePresence>
              </motion.div>

              {/* 4. Signature & Seal Card */}
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: 0.3 }}
                className="bg-card rounded-xl border shadow-sm border-emerald-border bg-emerald-soft p-4 flex gap-4 items-center"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-emerald-muted">
                    <ShieldCheck className="h-3 w-3" />
                    Cryptographic Seal
                  </div>
                  <div className="font-mono text-[9px] text-emerald-muted/60 break-all leading-tight h-6">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={`seal-${activeIndex}`}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <ScrambleText text="9f86d081884c7d659a2feaa0c55..." />
                      </motion.div>
                    </AnimatePresence>
                  </div>
                </div>
                <div className="w-20 h-10 flex items-center justify-center bg-white/50 dark:bg-black/20 rounded border border-emerald-border/20 rotate-[-2deg]">
                  <SignatureAnimation />
                </div>
              </motion.div>
            </div>

            {/* Testimonial Bubble */}
            <motion.div
              className="bg-background rounded-xl p-5 border shadow-sm relative"
              initial={{ opacity: 0, x: 10 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              <div className="absolute -left-2 top-6 w-4 h-4 bg-background border-l border-b transform rotate-45"></div>
              <div className="flex gap-3">
                <Quote className="h-5 w-5 text-primary/20 shrink-0" />
                <AnimatePresence mode="wait">
                  <motion.p
                    key={activeExample.deal.quote}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.4 }}
                    className="text-sm text-muted-foreground italic leading-relaxed"
                  >
                    &quot;{activeExample.deal.quote}&quot;
                  </motion.p>
                </AnimatePresence>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

const Pricing = ({ onStartClick }: { onStartClick: () => void }) => {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'yearly'>('monthly');

  const tiers = [
    {
      name: "The Hobbyist",
      price: 0,
      description: "Try Proofo free — no credit card needed.",
      metrics: [
        { label: "Deals per month", value: "5" },
        { label: "History", value: "90 days" },
        { label: "Custom templates", value: "—", inactive: true },
      ],
      plus: "Start with essential features:",
      features: [
        { text: "Visual Signatures", included: true },
        { text: "Email OTP Verification", included: true },
        { text: "PDF Receipts", included: true },
        { text: "SMS Verification", included: false },
        { text: "Remove Watermarks", included: false },
      ],
      buttonText: "Start for Free",
      variant: "outline" as const,
    },
    {
      name: "The Specialist",
      price: billingCycle === 'monthly' ? 5 : 50,
      description: "Everything you need for active deal tracking.",
      metrics: [
        { label: "Deals per month", value: "25", highlight: "5× more" },
        { label: "History", value: "1 year" },
        { label: "Custom templates", value: "5" },
      ],
      plus: "Everything in Hobbyist, plus:",
      features: [
        "SMS OTP Verification",
        "No Proofo Watermarks",
        "Custom Deal Templates",
        "Priority Email Support",
        "Basic Deal Analytics"
      ].map(f => ({ text: f, included: true })),
      buttonText: "Upgrade to Specialist",
      variant: "default" as const,
      popular: true,
    },
    {
      name: "The Dealmaker",
      price: billingCycle === 'monthly' ? 9 : 90,
      description: "No limits. Maximum power for advanced teams.",
      metrics: [
        { label: "Deals per month", value: "∞ Unlimited" },
        { label: "History", value: "Lifetime" },
        { label: "Custom templates", value: "∞ Unlimited" },
      ],
      plus: "Everything in Specialist, plus:",
      features: [
        "Unlimited Everything",
        "Custom PDF Branding",
        "Advanced Analytics",
        "Multi-User Teams",
        "Public API Access"
      ].map(f => ({ text: f, included: true })),
      buttonText: "Go Unlimited",
      variant: "outline" as const,
    }
  ];

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4">
      {/* Billing Toggle */}
      <div className="flex flex-col items-center gap-4">
        <div className="flex items-center p-1 bg-secondary/50 rounded-full border border-border/50">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 cursor-pointer ${billingCycle === 'monthly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingCycle('yearly')}
            className={`px-6 py-2 rounded-full text-xs font-bold transition-all duration-300 flex items-center gap-2 cursor-pointer ${billingCycle === 'yearly' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
          >
            Yearly
            <span className="bg-emerald-soft text-emerald-text text-[10px] px-2 py-0.5 rounded-full border border-emerald-border">2 Months Free</span>
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {tiers.map((tier, idx) => (
          <motion.div
            key={tier.name}
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: idx * 0.1 }}
            className="relative"
          >
            {/* Premium effects removed */}


            <Card className={`h-full flex flex-col bg-card border border-border/50 shadow-sm hover:shadow-xl hover:shadow-foreground/5 hover:border-foreground/10 transition-all duration-500 overflow-hidden relative group rounded-2xl`}>
              {tier.popular && (
                <div className="absolute top-0 right-0 px-3 py-1 bg-foreground text-background text-[10px] font-bold uppercase tracking-widest rounded-bl-lg">
                  Most Popular
                </div>
              )}

              <CardHeader className="p-6 py-4 min-h-[120px]">
                <CardTitle className="text-lg font-bold tracking-tight">{tier.name}</CardTitle>
                <div className="mt-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold tracking-tight text-foreground">$</span>
                    <AnimatePresence mode="wait">
                      <motion.span
                        key={tier.price}
                        initial={{ y: 10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="text-4xl font-bold tracking-tight"
                      >
                        {tier.price}
                      </motion.span>
                    </AnimatePresence>
                    <span className="text-muted-foreground text-[10px] uppercase font-bold tracking-widest ml-1 self-end mb-1">
                      {tier.price === 0 ? "/ forever" : billingCycle === 'monthly' ? "/ month" : "/ year"}
                    </span>
                  </div>
                  {/* Fixed space for annual discount text */}
                  <div className="h-4 mt-0.5">
                    {tier.price !== 0 && billingCycle === 'monthly' && (
                      <span className="text-[10px] text-emerald-muted font-bold uppercase tracking-wider">
                         Get 2 Months Free Yearly
                      </span>
                    )}
                  </div>
                </div>
                <CardDescription className="mt-4 text-xs font-medium line-clamp-2">
                  {tier.description}
                </CardDescription>
              </CardHeader>

              <CardContent className="px-6 py-4 pt-0 flex-1 flex flex-col space-y-5">
                {/* Metrics Box - Unified Bento Style */}
                <div className={`rounded-xl p-4 space-y-3 bg-secondary/30 border border-border/50`}>
                  {tier.metrics.map((m: any, i) => (
                    <div key={i} className="flex justify-between items-center text-[12px]">
                      <span className="text-muted-foreground uppercase font-bold tracking-wider text-[10px]">{m.label}</span>
                      <span className={`font-bold tracking-tight ${m.inactive ? 'text-muted-foreground/40' : 'text-foreground'}`}>
                        {m.value} {m.highlight && <span className="text-[12px] text-emerald-muted ml-1 font-bold">({m.highlight})</span>}
                      </span>
                    </div>
                  ))}
                </div>

                <Separator className="bg-border/20" />

                {/* Feature List */}
                <div className="flex-1 space-y-4">
                  {tier.plus && (
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{tier.plus}</p>
                  )}
                  <ul className="space-y-3">
                    {tier.features.map((feature, i) => (
                      <motion.li
                        key={i}
                        initial={{ x: -5, opacity: 0 }}
                        whileInView={{ x: 0, opacity: 1 }}
                        transition={{ delay: 0.2 + (i * 0.05) }}
                        className={`flex items-start gap-2.5 text-xs ${feature.included ? "text-foreground font-medium" : "text-muted-foreground/30"}`}
                      >
                        {feature.included ? (
                          <Check className="h-3.5 w-3.5 text-emerald-muted shrink-0 mt-0.5" />
                        ) : (
                          <span className="h-3.5 w-3.5 flex items-center justify-center text-[10px] shrink-0 text-muted-foreground/20 mt-0.5">✕</span>
                        )}
                        <span className="leading-tight">{feature.text}</span>
                      </motion.li>
                    ))}
                  </ul>
                </div>

                <div className="pt-4 mt-auto">
                  <Button
                    variant={tier.variant}
                    className={`w-full h-11 rounded-full transition-all duration-300 flex items-center justify-center font-bold tracking-tight hover:-translate-y-1 hover:shadow-xl ${tier.popular ? 'bg-foreground text-background hover:bg-foreground/90' : 'border-border/50 hover:bg-secondary'}`}
                    onClick={onStartClick}
                  >
                    <span>{tier.buttonText}</span>
                    <ArrowRight className="ml-2 h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAppStore();
  const [isReady, setIsReady] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
      return;
    }
    // Only show the page once we've confirmed no user is logged in
    if (!isLoading && !user) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsReady(true);
    }
  }, [user, router, isLoading]);

  // Don't render anything while checking auth or if user exists
  // The middleware should handle the redirect, but this prevents a flash
  if (!isReady || user) {
    return (
      <div className="min-h-screen w-full bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <AnimatedLogo size={48} className="text-foreground/50" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary relative overflow-x-hidden">
      <GrainOverlay />
      <ScrollProgress />

      {/* Top Right Gradient Decoration */}
      <div className="absolute top-0 right-0 w-[300px] h-[300px] md:w-[600px] md:h-[600px] bg-primary/5 rounded-full blur-[80px] md:blur-[100px] pointer-events-none z-0 translate-x-1/3 -translate-y-1/3" />

      <PublicHeader currentPage="home" />

      <main className="relative pt-32 pb-20">
        {/* Hero */}
        <div className="container mx-auto px-4 max-w-4xl text-center mb-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/30 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted-foreground/80 mb-8">
              <span className="flex h-1.5 w-1.5 rounded-full bg-emerald-muted animate-pulse"></span>
              The Operating System for the Digital Handshake
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 text-foreground leading-[1.1]">
              Proof Any Deal. <br className="hidden sm:block" />
              <span className="text-muted-foreground">Instantly.</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
              Stop relying on <em className="">&quot;I thought we agreed&quot;</em>. Get a{" "}
              <strong>signed, sealed, and cryptographically verified proof</strong> of any agreement in seconds. No
              signup required for them.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/deal/new">
                <MagneticWrapper>
                  <Button
                    size="xl"
                    className="h-14 px-8 text-base rounded-full shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all"
                  >
                    Create a Deal
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </MagneticWrapper>
              </Link>
              <Link href="/demo">
                <div className="relative group">
                  <Button
                    size="xl"
                    variant="outline"
                    className="h-14 px-8 text-base rounded-full bg-emerald-soft border-emerald-border text-emerald-text hover:bg-emerald-soft hover:border-emerald-border/60 hover:shadow-lg hover:shadow-emerald-soft/20 hover:scale-[1.02] transition-all relative overflow-hidden"
                  >
                    <span className="relative z-10">Try Interactive Demo</span>
                  </Button>
                </div>
              </Link>
            </div>

            <div className="mt-16 pt-8 border-t border-border/50 flex items-center justify-center gap-8 text-sm text-muted-foreground">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4" /> Free to start
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4" /> Encrypted
              </span>
              <span className="flex items-center gap-2">
                <FileCheck className="h-4 w-4" /> Secure Proof
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bento Grid Features */}
        <section id="features" className="pt-10 pb-40 scroll-mt-24">
          <div className="container mx-auto px-4 mb-16 text-center max-w-2xl">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Why Proofo works</h2>
            <p className="text-muted-foreground text-lg">
              Bridge the gap between a handshake and a lawyer. Fast enough for casual deals,
              secure enough for serious business.
            </p>
          </div>
          <BentoGrid />
        </section>

        {/* Workflow Steps */}
        <section id="how-it-works" className="py-40 border-y bg-secondary/10 scroll-mt-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                From Handshake to Proof
              </h2>
              <p className="text-muted-foreground text-lg">
                Four steps. Zero friction. Complete protection.
              </p>
            </div>
            <WorkflowSection />
          </div>
        </section>

        {/* Real World Use Cases */}
        <section className="py-40">
          <div className="container mx-auto px-4 max-w-6xl">
            <InteractiveRealWorldSection />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 border-t bg-secondary/10 scroll-mt-24">
          <div className="container mx-auto px-4 text-center mb-8
          ">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Pay for Proof. Not Overheads.</h2>
            <p className="text-muted-foreground">Start for free. Upgrade to seal unlimited deals.</p>
          </div>
          <div className="container mx-auto px-4">
            <Pricing onStartClick={() => setShowLoginModal(true)} />
          </div>
        </section>

        {/* CTA */}
        <section className="py-40">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <div className="bg-secondary/20 rounded-[40px] p-20 border border-border/50 relative overflow-hidden group">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_120%,rgba(0,0,0,0.03),transparent)] pointer-events-none" />
              <div className="relative z-10 space-y-8">
                <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
                  Ready to{" "}
                  <motion.span
                    className="relative inline-block"
                    initial={{ opacity: 1 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: false, margin: "-20%" }}
                  >
                    <motion.span
                      className="absolute inset-0 bg-emerald-muted/30 rounded-lg"
                      style={{
                        marginInline: 'calc(var(--spacing) * -1)',
                        paddingInline: 'var(--spacing)'
                      }}
                      initial={{ scaleX: 0, originX: 0 }}
                      whileInView={{ scaleX: 1 }}
                      viewport={{ once: false, margin: "-20%" }}
                      transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                    />
                    <span className="relative text-emerald-muted font-bold">proof it?</span>
                  </motion.span>
                </h2>
                <p className="text-muted-foreground max-w-md mx-auto text-lg leading-relaxed">
                  Stop hoping they&apos;ll keep their word. Start proving they agreed.
                </p>
                <div className="pt-4">
                  <Link href="/deal/new">
                    <MagneticWrapper>
                      <Button
                        size="xl"
                        className="h-16 px-12 text-lg rounded-full shadow-2xl shadow-foreground/5 bg-foreground text-background hover:bg-foreground/90 transition-all"
                      >
                        Create a Deal
                      </Button>
                    </MagneticWrapper>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="py-12 border-t bg-background">
        <div className="container mx-auto px-4 max-w-6xl flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <AnimatedLogo size={24} className="text-foreground" />
            <span className="font-semibold text-sm">Proofo</span>
          </div>

          <div className="flex gap-8 text-sm text-muted-foreground">
            <Link href="/privacy" className="hover:text-foreground transition-colors">
              Privacy Policy
            </Link>
            <Link href="/terms" className="hover:text-foreground transition-colors">
              Terms of Service
            </Link>
            <Link
              href="mailto:support@proofo.app"
              className="hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>

          <p className="text-sm text-muted-foreground">© {new Date().getFullYear()} Proofo Inc.</p>
        </div>
      </footer>

      <LoginModal
        open={showLoginModal}
        onOpenChange={setShowLoginModal}
        title="Create your account"
        description="Join Proofo to start creating secure, enforceable agreements in minutes. No password needed."
        redirectTo="/deal/new"
        onSuccess={() => {
          setShowLoginModal(false);
        }}
      />
    </div>
  );
}
