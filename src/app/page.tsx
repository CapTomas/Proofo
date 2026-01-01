"use client";

import { useState, useEffect, useRef } from "react";
import {
  motion,
  useInView,
  useScroll,
  useTransform,
  useSpring,
  useMotionValue,
} from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
  History,
  Zap,
  ShoppingBag,
  Wrench,
  Gamepad2,
  Quote,
  Check,
  Copy,
  Send,
  Inbox,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/store";
import { PublicHeader } from "@/components/public-header";

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

// 2. Scroll Progress Line
const ScrollProgress = () => {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  return (
    <motion.div
      className="fixed top-0 left-0 right-0 h-[3px] bg-primary origin-left z-100"
      style={{ scaleX }}
    />
  );
};

// 3. Signature Animation
const SignatureAnimation = () => (
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
    />
  </svg>
);

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
    className={className || "text-emerald-600 mr-1.5"}
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
const ScrambleText = ({ text, className }: { text: string; className?: string }) => {
  const [displayText, setDisplayText] = useState(text);
  const ref = useRef(null);
  const isInView = useInView(ref, { once: false, margin: "-10%" });

  useEffect(() => {
    if (!isInView) return;
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
      if (iteration >= text.length) clearInterval(interval);
      iteration += 1 / 4;
    }, 50);
    return () => clearInterval(interval);
  }, [isInView, text]);
  return (
    <span ref={ref} className={className}>
      {displayText}
    </span>
  );
};

// 8. Interactive Hash (Combines Scramble + Copy)
const InteractiveHash = () => {
  const [copied, setCopied] = useState(false);
  const text = "0x7f83b1657ff1fc53b92";

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      onClick={handleCopy}
      className="group relative cursor-pointer text-[10px] font-mono text-muted-foreground/60 bg-secondary/30 p-2 rounded border border-border/50 hover:bg-secondary/50 transition-colors overflow-hidden"
    >
      <div className="flex items-center justify-between">
        <span className="truncate">
          <ScrambleText text={text} />
          ...
        </span>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          {copied ? <Check className="h-3 w-3 text-emerald-500" /> : <Copy className="h-3 w-3" />}
        </div>
      </div>
    </div>
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

// 11. Parallax Pricing Badge
const ParallaxBadge = () => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const x = useTransform(scrollYProgress, [0, 1], [-50, 10]);

  return (
    <div ref={ref} className="absolute -top-3 right-6 overflow-visible z-10">
      <motion.div style={{ x }}>
        <Badge className="bg-primary text-primary-foreground hover:bg-primary/90 border-0 px-3 py-1 shadow-md">
          Most Popular
        </Badge>
      </motion.div>
    </div>
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
      <Card className="h-full bg-card border shadow-sm hover:border-primary/20 transition-colors group">
        <CardContent className="p-8 flex flex-col justify-between h-full">
          <div className="space-y-6 max-w-lg">
            <div className="h-12 w-12 rounded-lg bg-secondary flex items-center justify-center group-hover:bg-secondary/80 transition-colors">
              <Users className="h-6 w-6 text-primary" />
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
      <Card className="h-full bg-card border shadow-sm hover:border-primary/20 transition-colors group">
        <CardContent className="p-6 flex flex-col h-full">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-6 group-hover:bg-secondary/80 transition-colors">
            <PenLine className="h-5 w-5 text-primary" />
          </div>
          <h3 className="text-xl font-semibold mb-3">Signatures That Stick</h3>
          <p className="text-muted-foreground text-sm mb-8">
            A drawn signature captures intent better than a text message. It&apos;s psychological
            cement for your deal.
          </p>
          <div className="mt-auto bg-secondary/20 rounded-xl p-4 border border-dashed border-border flex items-center justify-center h-40 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(#00000010_1px,transparent_1px)] bg-size-[16px_16px] opacity-50"></div>
            {/* Animated Signature */}
            <div className="-rotate-6">
              <SignatureAnimation />
            </div>
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
      <Card className="h-full bg-card border shadow-sm hover:border-primary/20 transition-colors group">
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
      <Card className="h-full bg-card border shadow-sm hover:border-primary/20 transition-colors group">
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
      <Card className="h-full bg-card border shadow-sm hover:border-primary/20 transition-colors group">
        <CardContent className="p-6">
          <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center mb-4 group-hover:bg-secondary/80 transition-colors">
            <AnimatedDoc />
          </div>
          <h3 className="text-lg font-semibold mb-2">Instant Legal Receipts</h3>
          <p className="text-muted-foreground text-sm">
            Both parties get a professional, timestamped PDF receipt instantly. No chasing.
          </p>
        </CardContent>
      </Card>
    </motion.div>
  </div>
);

const WorkflowSection = () => (
  <div className="relative">
    {/* Connecting Line - Desktop */}
    <div className="hidden md:block absolute top-10 left-[10%] right-[10%] h-px bg-border z-0" />

    <div className="grid md:grid-cols-4 gap-8 relative z-10">
      {[
        {
          icon: AnimatedCreate,
          title: "1. Draft Instantly",
          desc: "Templates for everything. Or write your own terms in seconds.",
        },
        {
          icon: AnimatedQR,
          title: "2. Send the Link",
          desc: "QR code or URL. No app install needed for them.",
        },
        { icon: AnimatedSign, title: "3. They Sign", desc: "On any device. With their finger. Done." },
        {
          icon: AnimatedProof,
          title: "4. You're Protected",
          desc: "Instant PDF contracts sent to both inboxes.",
        },
      ].map((step, i) => (
        <motion.div
          key={i}
          className="group"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.1 }}
        >
          <div className="bg-background h-20 w-20 rounded-2xl border shadow-sm flex items-center justify-center mb-6 mx-auto group-hover:border-primary group-hover:scale-105 transition-all duration-300">
            <step.icon />
          </div>
          <div className="text-center px-2">
            <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
            <p className="text-sm text-muted-foreground">{step.desc}</p>
          </div>
        </motion.div>
      ))}
    </div>
  </div>
);

// Real World Section
const RealWorldSection = () => (
  <div className="grid md:grid-cols-2 gap-16 items-center">
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

      <div className="space-y-6">
        {[
          {
            icon: Smartphone,
            title: "Tech Flipping",
            desc: "Don't get scammed on the condition. Agree before cash hands.",
            anim: "pulse" as const,
          },
          {
            icon: ShoppingBag,
            title: "Vintage & Fashion",
            desc: "Selling rare collectibles. Document authenticity before shipping.",
            anim: "bounce" as const,
          },
          {
            icon: Wrench,
            title: "Freelancing",
            desc: "Scope creep killer. Agree on deliverables and price instantly.",
            anim: "rotate" as const,
          },
          {
            icon: Gamepad2,
            title: "Lending Stuff",
            desc: "Get it back in one piece. Document it before it leaves.",
            anim: "shake" as const,
          },
        ].map((item, i) => (
          <motion.div
            key={i}
            className="flex gap-4 items-start group cursor-default"
            initial={{ opacity: 0, x: -10 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.1 }}
          >
            <div className="h-10 w-10 rounded-lg bg-secondary flex items-center justify-center shrink-0 group-hover:bg-secondary/80 transition-colors">
              <HoverIcon type={item.anim}>
                <item.icon className="h-5 w-5 text-primary" />
              </HoverIcon>
            </div>
            <div>
              <h3 className="font-medium text-foreground">{item.title}</h3>
              <p className="text-sm text-muted-foreground leading-relaxed mt-1">{item.desc}</p>
            </div>
          </motion.div>
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
          {/* Mock Deal Card (New Design) */}
          <motion.div
            className="bg-card rounded-xl border shadow-sm overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
          >
            {/* Top Status Bar */}
            <div className="h-1.5 w-full bg-emerald-500" />

            <div className="p-6">
      <div className="bg-background rounded-2xl border shadow-2xl p-6 relative max-w-lg w-full mx-auto transform hover:scale-[1.01] transition-transform duration-500 space-y-6">

              {/* 1. Page-like Header */}
              <div className="flex flex-col gap-4">
                 <div className="flex items-center justify-between">
                     <div className="space-y-1">
                        <div className="flex items-center gap-2">
                           <h3 className="text-xl font-bold tracking-tight">Sale of MacBook Pro</h3>
                           <div className="bg-emerald-100 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider">
                              Verified
                           </div>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                           <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md border border-border/50">
                              <span className="font-mono">PR-8X92</span>
                           </div>
                           <span>•</span>
                           <span>Signed just now</span>
                        </div>
                     </div>
                 </div>
              </div>

               {/* 2. Certificate Card */}
              <div className="rounded-xl p-5 border bg-gradient-to-br from-emerald-50 via-white to-emerald-50/50 dark:from-emerald-950/20 dark:via-background dark:to-emerald-900/10 border-emerald-200 dark:border-emerald-800 shadow-sm relative overflow-hidden">
                 <div className="absolute -right-12 -top-12 h-40 w-40 bg-emerald-500/10 rounded-full blur-3xl" />
                 <div className="flex items-start gap-4 relative z-10">
                    <div className="h-12 w-12 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center shrink-0 border border-emerald-200 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 font-bold">
                        <Check className="h-6 w-6" />
                    </div>
                    <div className="flex-1 space-y-1">
                       <div className="flex items-center justify-between font-bold text-emerald-800 dark:text-emerald-400">
                           <p>Legally Binding Agreement</p>
                           <Shield className="h-4 w-4 opacity-50" />
                       </div>
                       <p className="text-xs opacity-90 text-emerald-700/80 dark:text-emerald-400/80 leading-relaxed">
                           Digital certificate confirms that this agreement was irrevocably signed by all parties.
                       </p>
                       <div className="pt-3 mt-3 border-t border-emerald-200/50 dark:border-emerald-800/30 text-[10px] font-mono text-emerald-600 dark:text-emerald-500">
                           SEAL: 9f86d081884c7d659a2feaa0c55...
                       </div>
                    </div>
                 </div>
              </div>

              {/* 3. Parties Grid */}
              <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl border bg-secondary/30 flex items-center gap-3">
                     <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        AJ
                     </div>
                     <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <Send className="h-3 w-3" /> Creator
                        </p>
                        <p className="text-sm font-bold truncate">Alex Johnson</p>
                     </div>
                  </div>
                  <div className="p-3 rounded-xl border bg-secondary/30 flex items-center gap-3">
                     <div className="h-10 w-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                        SS
                     </div>
                     <div className="min-w-0">
                        <p className="text-[10px] uppercase font-bold text-muted-foreground flex items-center gap-1">
                          <Inbox className="h-3 w-3" /> Recipient
                        </p>
                        <p className="text-sm font-bold truncate">Sarah Smith</p>
                     </div>
                  </div>
              </div>

      </div>

              {/* Terms */}
              <div className="space-y-3">
                 <div className="flex justify-between text-sm border-b pb-2">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-medium">$1,200.00</span>
                 </div>
                 <div className="flex justify-between text-sm border-b pb-2">
                     <span className="text-muted-foreground">Condition</span>
                     <span className="font-medium">Like New</span>
                 </div>
                 <div className="flex justify-between text-sm">
                     <span className="text-muted-foreground">Seller</span>
                     <span className="font-medium">Alex Johnson</span>
                 </div>
              </div>
            </div>
          </motion.div>

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
              <p className="text-sm text-muted-foreground italic leading-relaxed">
                &quot;I used to chase clients for deposit confirmations in WhatsApp. Now I just send
                a Proofo link. It looks professional and stops the &apos;I didn&apos;t agree to
                that&apos; conversations.&quot;
              </p>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  </div>
);

const Pricing = () => (
  <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
    {/* Free Tier */}
    <Card className="relative bg-card border shadow-sm hover:border-primary/20 transition-colors">
      <CardHeader>
        <CardTitle className="text-xl font-semibold">The Hobbyist</CardTitle>
        <div className="mt-4 flex items-baseline">
          <span className="text-4xl font-bold tracking-tight">$0</span>
          <span className="text-muted-foreground ml-2 text-sm">/ month</span>
        </div>
        <CardDescription className="mt-2">
          Perfect for the occasional trade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <AnimatedCheck delay={0.2} className="text-primary w-3 h-3" />
            </div>
            Unlimited Deals
          </li>
          <li className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <AnimatedCheck delay={0.4} className="text-primary w-3 h-3" />
            </div>
            Visual Signatures
          </li>
          <li className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-secondary flex items-center justify-center shrink-0">
              <AnimatedCheck delay={0.6} className="text-primary w-3 h-3" />
            </div>
            Secure PDF Receipts
          </li>
          <li className="flex items-center gap-3 text-muted-foreground">
            <div className="h-5 w-5 flex items-center justify-center shrink-0">
              <History className="h-3 w-3" />
            </div>
            90-day history retention
          </li>
        </ul>
        <div className="pt-4">
          <Link href="/deal/new" className="block">
            <Button variant="outline" className="w-full h-11 border-border hover:bg-secondary">
              Create a Deal
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>

    {/* Pro Tier */}
    <Card className="relative bg-secondary/30 border-primary/20 shadow-lg hover:border-primary/30 transition-colors">
      <ParallaxBadge />
      <CardHeader>
        <CardTitle className="text-xl font-semibold flex items-center gap-2">The Dealmaker</CardTitle>
        <div className="mt-4 flex items-baseline">
          <span className="text-4xl font-bold tracking-tight">$9</span>
          <span className="text-muted-foreground ml-2 text-sm">/ month</span>
        </div>
        <CardDescription className="mt-2 text-foreground/80">
          For freelancers and traders who mean business.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5 pt-4">
        <ul className="space-y-3 text-sm">
          <li className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <AnimatedCheck delay={0.2} className="text-emerald-600 w-3 h-3" />
            </div>
            Everything in Starter
          </li>
          <li className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <AnimatedCheck delay={0.4} className="text-emerald-600 w-3 h-3" />
            </div>
            <strong>Unlimited History</strong>
          </li>
          <li className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <AnimatedCheck delay={0.6} className="text-emerald-600 w-3 h-3" />
            </div>
            Custom Branding
          </li>
          <li className="flex items-center gap-3">
            <div className="h-5 w-5 rounded-full bg-emerald-500/10 flex items-center justify-center shrink-0">
              <AnimatedCheck delay={0.8} className="text-emerald-600 w-3 h-3" />
            </div>
            No Watermarks on PDFs
          </li>
        </ul>
        <div className="pt-4">
          <Link href="/dashboard" className="block">
            <MagneticWrapper>
              <Button className="w-full h-11 shadow-md">Upgrade to Pro</Button>
            </MagneticWrapper>
          </Link>
        </div>
      </CardContent>
    </Card>
  </div>
);

export default function Home() {
  const router = useRouter();
  const { user } = useAppStore();

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (user) {
      router.push("/dashboard");
    }
  }, [user, router]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground font-sans selection:bg-primary/10 selection:text-primary relative overflow-x-hidden">
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
            <div className="inline-flex items-center gap-2 rounded-full border bg-secondary/50 px-3 py-1 text-sm text-muted-foreground mb-8">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Digital Handshake
            </div>

            <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight mb-8 text-foreground leading-[1.1]">
              Proof Any Deal. <br className="hidden sm:block" />
              <span className="text-muted-foreground">Instantly.</span>
            </h1>

            <p className="text-xl text-muted-foreground mb-12 leading-relaxed max-w-2xl mx-auto">
              Stop relying on <em className="">&quot;I thought we agreed&quot;</em>. Get a{" "}
              <strong>signed, sealed, and legally binding proof</strong> of any agreement in seconds. No
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
                <Button
                  size="xl"
                  variant="outline"
                  className="h-14 px-8 text-base rounded-full bg-background border-2 hover:bg-secondary/50"
                >
                  Try Interactive Demo
                </Button>
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
                <FileCheck className="h-4 w-4" /> Legally Binding
              </span>
            </div>
          </motion.div>
        </div>

        {/* Bento Grid Features */}
        <section id="features" className="mb-40 scroll-mt-24">
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
        <section id="how-it-works" className="py-32 border-y bg-secondary/30 scroll-mt-24">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold tracking-tight mb-4">How it works</h2>
              <p className="text-muted-foreground">
                From Deal to Proof in four simple steps.
              </p>
            </div>
            <WorkflowSection />
          </div>
        </section>

        {/* Real World Use Cases */}
        <section className="py-32">
          <div className="container mx-auto px-4 max-w-6xl">
            <RealWorldSection />
          </div>
        </section>

        {/* Pricing */}
        <section id="pricing" className="py-24 border-t bg-secondary/10 scroll-mt-24">
          <div className="container mx-auto px-4 text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight mb-4">Pay for Proof. Not Overheads.</h2>
            <p className="text-muted-foreground">Start for free. Upgrade to seal unlimited deals.</p>
          </div>
          <div className="container mx-auto px-4">
            <Pricing />
          </div>
        </section>

        {/* CTA */}
        <section className="py-32">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <div className="bg-secondary/30 rounded-3xl p-12 border border-border relative overflow-hidden">
              <div className="relative z-10">
                <h2 className="text-3xl font-bold mb-4">Ready to proof it?</h2>
                <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
                  Stop hoping they&apos;ll keep their word. Start proving they agreed.
                </p>
                <Link href="/deal/new">
                  <MagneticWrapper>
                    <Button
                      size="xl"
                      className="h-14 px-10 text-base rounded-full shadow-lg shadow-primary/10"
                    >
                      Create a Deal
                    </Button>
                  </MagneticWrapper>
                </Link>
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
    </div>
  );
}
