"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence, Variants } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  User,
  Mail,
  Crown,
  Shield,
  Bell,
  Palette,
  Check,
  Camera,
  Sparkles,
  AlertTriangle,
  Monitor,
  Smartphone,
  Globe,
  LogOut,
  Trash2,
  ChevronRight,
  Settings2,
  RefreshCw,
} from "lucide-react";
import { useAppStore } from "@/store";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn } from "@/lib/utils";
import { dashboardStyles, containerVariants, itemVariants } from "@/lib/dashboard-ui";

// --- CONFIGURATION ---

type SettingsCategory = "profile" | "subscription" | "appearance" | "security" | "notifications" | "danger";

interface NavItem {
  id: SettingsCategory;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color?: string;
}

const navItems: NavItem[] = [
  { id: "profile", label: "Profile", icon: User, description: "Your personal information" },
  { id: "subscription", label: "Subscription", icon: Crown, description: "Manage your plan" },
  { id: "appearance", label: "Appearance", icon: Palette, description: "Customize your experience" },
  { id: "security", label: "Security", icon: Shield, description: "Keep your account safe" },
  { id: "notifications", label: "Notifications", icon: Bell, description: "Configure alerts" },
  { id: "danger", label: "Danger Zone", icon: AlertTriangle, description: "Irreversible actions", color: "text-destructive" },
];

// --- ANIMATION VARIANTS ---

const contentVariants: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: {
      duration: 0.3,
      ease: [0.23, 1, 0.32, 1] as const
    }
  },
  exit: {
    opacity: 0,
    x: -20,
    transition: { duration: 0.2 }
  }
};

// --- SECTION COMPONENTS ---

const ProfileSection = ({ user, name, setName, email, setEmail, isSaving, saved, onSave }: {
  user: any;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  isSaving: boolean;
  saved: boolean;
  onSave: () => void;
}) => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="show"
    className="space-y-6"
  >
    {/* Avatar Section */}
    <motion.div variants={itemVariants} className="flex items-center gap-5">
      <div className="relative group">
        <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center text-2xl font-bold text-primary shadow-lg">
          {name ? name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2) : "?"}
        </div>
        <button className="absolute inset-0 rounded-2xl bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
          <Camera className="h-6 w-6 text-white" />
        </button>
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-lg">{name || "Add your name"}</h3>
        <p className="text-sm text-muted-foreground">{email || "Add your email"}</p>
        <Badge variant="secondary" className="mt-2 text-[10px]">
          Member since {user?.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : 'Recently'}
        </Badge>
      </div>
    </motion.div>

    {/* Form Fields */}
    <motion.div variants={itemVariants} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name" className="text-sm font-medium">Display Name</Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
            className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-background transition-colors"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          This name will appear on your deals and receipts
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
        <div className="relative">
          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="pl-10 h-11 rounded-xl bg-secondary/30 border-border/50 focus:bg-background transition-colors"
          />
        </div>
      </div>
    </motion.div>

    {/* Save Button */}
    <motion.div variants={itemVariants}>
      <Button
        onClick={onSave}
        disabled={isSaving || (!name && !email)}
        className="h-11 px-6 rounded-xl shadow-sm"
      >
        {isSaving ? (
          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
        ) : saved ? (
          <>
            <Check className="h-4 w-4 mr-2" />
            Saved!
          </>
        ) : (
          "Save Changes"
        )}
      </Button>
    </motion.div>
  </motion.div>
);

const SubscriptionSection = ({ isPro }: { isPro: boolean }) => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="show"
    className="space-y-6"
  >
    {/* Current Plan Status */}
    <motion.div variants={itemVariants}>
      <Card className={cn(
        "overflow-hidden rounded-2xl border-2 transition-colors",
        isPro ? "border-primary/50 bg-primary/5" : "border-border"
      )}>
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <div className={cn(
              "h-14 w-14 rounded-xl flex items-center justify-center shadow-lg",
              isPro ? "bg-gradient-to-br from-primary to-primary/80" : "bg-secondary"
            )}>
              {isPro ? (
                <Sparkles className="h-7 w-7 text-primary-foreground" />
              ) : (
                <Crown className="h-7 w-7 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold text-lg">{isPro ? "Pro Plan" : "Free Plan"}</h3>
                <Badge variant={isPro ? "default" : "secondary"}>
                  {isPro ? "Active" : "Current"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                {isPro
                  ? "Enjoy unlimited history, custom branding, and no watermarks."
                  : "Upgrade to unlock premium features and remove limits."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>

    {/* Feature Comparison */}
    <motion.div variants={itemVariants} className="grid sm:grid-cols-2 gap-4">
      <Card className="rounded-2xl border-border/50">
        <CardContent className="p-5">
          <h4 className="font-semibold mb-3 text-sm">Free Plan</h4>
          <ul className="space-y-2 text-sm">
            {["Unlimited deals", "90-day history", "Visual signatures"].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                {feature}
              </li>
            ))}
            {["Custom branding", "Priority support"].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-muted-foreground/50">
                <span className="h-4 w-4 flex items-center justify-center shrink-0">✗</span>
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card className={cn(
        "rounded-2xl transition-colors",
        isPro ? "border-primary/30 bg-primary/5" : "border-border/50"
      )}>
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-sm">Pro Plan</h4>
            <Badge className="bg-primary/10 text-primary border-primary/20">$9/mo</Badge>
          </div>
          <ul className="space-y-2 text-sm">
            {["Everything in Free", "Unlimited history", "No watermarks", "Custom branding", "Priority support"].map((feature) => (
              <li key={feature} className="flex items-center gap-2 text-muted-foreground">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                {feature}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </motion.div>

    {/* Action Button */}
    <motion.div variants={itemVariants}>
      <Button
        className={cn(
          "w-full sm:w-auto h-11 px-6 rounded-xl shadow-sm gap-2",
          isPro ? "bg-secondary text-foreground hover:bg-secondary/80" : ""
        )}
        variant={isPro ? "outline" : "default"}
      >
        <Crown className="h-4 w-4" />
        {isPro ? "Manage Subscription" : "Upgrade to Pro"}
      </Button>
    </motion.div>
  </motion.div>
);

const AppearanceSection = () => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="show"
    className="space-y-6"
  >
    <motion.div variants={itemVariants}>
      <Card className="rounded-2xl overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                <Palette className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <p className="font-medium">Theme</p>
                <p className="text-sm text-muted-foreground">
                  Choose between light and dark mode
                </p>
              </div>
            </div>
            <ThemeToggle />
          </div>
        </CardContent>
      </Card>
    </motion.div>

    <motion.div variants={itemVariants}>
      <Card className="rounded-2xl overflow-hidden opacity-60">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">Accent Color</p>
                  <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Customize your accent color
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  </motion.div>
);

const SecuritySection = () => {
  const sessions = [
    { id: 1, device: "MacBook Pro", browser: "Chrome", location: "Prague, CZ", current: true, icon: Monitor },
    { id: 2, device: "iPhone 15", browser: "Safari", location: "Prague, CZ", current: false, icon: Smartphone },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      {/* 2FA Toggle */}
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-0">
            <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">Two-Factor Authentication</p>
                    <Badge variant="outline" className="text-[10px]">Coming Soon</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Add an extra layer of security
                  </p>
                </div>
              </div>
              <Switch disabled />
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Active Sessions */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-medium text-sm">Active Sessions</h4>
          <Button variant="ghost" size="sm" className="text-xs text-muted-foreground h-7">
            Sign out all
          </Button>
        </div>
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-0 divide-y divide-border/50">
            {sessions.map((session) => {
              const Icon = session.icon;
              return (
                <div key={session.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-secondary/50 flex items-center justify-center">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm">{session.device}</p>
                        {session.current && (
                          <Badge variant="secondary" className="text-[9px] h-4 px-1">Current</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{session.browser}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Globe className="h-3 w-3" />
                          {session.location}
                        </span>
                      </div>
                    </div>
                  </div>
                  {!session.current && (
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive">
                      <LogOut className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

const NotificationsSection = () => {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dealUpdates, setDealUpdates] = useState(true);
  const [marketingEmails, setMarketingEmails] = useState(false);

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="space-y-6"
    >
      <motion.div variants={itemVariants}>
        <Card className="rounded-2xl overflow-hidden">
          <CardContent className="p-0 divide-y divide-border/50">
            <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Email Notifications</p>
                  <p className="text-sm text-muted-foreground">
                    Receive email updates for important activities
                  </p>
                </div>
              </div>
              <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
            </div>

            <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Deal Updates</p>
                  <p className="text-sm text-muted-foreground">
                    Get notified when deals are signed or voided
                  </p>
                </div>
              </div>
              <Switch checked={dealUpdates} onCheckedChange={setDealUpdates} />
            </div>

            <div className="flex items-center justify-between p-5 hover:bg-muted/30 transition-colors">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Product Updates</p>
                  <p className="text-sm text-muted-foreground">
                    News about features and improvements
                  </p>
                </div>
              </div>
              <Switch checked={marketingEmails} onCheckedChange={setMarketingEmails} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
};

const DangerZoneSection = () => (
  <motion.div
    variants={containerVariants}
    initial="hidden"
    animate="show"
    className="space-y-6"
  >
    <motion.div variants={itemVariants}>
      <Card className="rounded-2xl border-destructive/30 bg-destructive/5 overflow-hidden">
        <CardContent className="p-0">
          <div className="flex items-center justify-between p-5">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-destructive/10 flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="font-medium text-destructive">Delete Account</p>
                <p className="text-sm text-muted-foreground">
                  Permanently delete your account and all data
                </p>
              </div>
            </div>
            <Button variant="destructive" size="sm" className="rounded-xl">
              Delete
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>

    <motion.div variants={itemVariants}>
      <p className="text-xs text-muted-foreground text-center max-w-md mx-auto">
        Once you delete your account, there is no going back. All your deals, templates, and data will be permanently removed.
      </p>
    </motion.div>
  </motion.div>
);

// --- MAIN PAGE ---

export default function SettingsPage() {
  const { user, setUser } = useAppStore();
  const [activeCategory, setActiveCategory] = useState<SettingsCategory>("profile");
  const [name, setName] = useState(() => user?.name || "");
  const [email, setEmail] = useState(() => user?.email || "");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Sync state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setEmail(user.email || "");
    }
  }, [user]);

  const handleSave = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    if (user) {
      setUser({ ...user, name, email });
    } else {
      setUser({
        id: `user-${Date.now()}`,
        name,
        email,
        createdAt: new Date().toISOString(),
      });
    }

    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const isPro = user?.isPro || false;

  const renderContent = () => {
    switch (activeCategory) {
      case "profile":
        return (
          <ProfileSection
            user={user}
            name={name}
            setName={setName}
            email={email}
            setEmail={setEmail}
            isSaving={isSaving}
            saved={saved}
            onSave={handleSave}
          />
        );
      case "subscription":
        return <SubscriptionSection isPro={isPro} />;
      case "appearance":
        return <AppearanceSection />;
      case "security":
        return <SecuritySection />;
      case "notifications":
        return <NotificationsSection />;
      case "danger":
        return <DangerZoneSection />;
      default:
        return null;
    }
  };

  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>Settings</h1>
          <p className={dashboardStyles.pageDescription}>Manage your account and preferences</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Badge variant="secondary" className="hidden sm:flex gap-1.5 text-xs">
            <Settings2 className="h-3 w-3" />
            {isPro ? "Pro" : "Free"} Plan
          </Badge>
        </div>
      </div>

      {/* Main Layout */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar Navigation */}
        <motion.nav
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-1"
        >
          <Card className="rounded-2xl overflow-hidden border-border/50 shadow-sm">
            <CardContent className="p-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeCategory === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveCategory(item.id)}
                    className={cn(
                      "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 group cursor-pointer",
                      isActive
                        ? "bg-primary/10 text-primary"
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "h-9 w-9 rounded-lg flex items-center justify-center transition-colors shrink-0",
                      isActive ? "bg-primary/20" : "bg-secondary/50 group-hover:bg-secondary"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4 transition-colors",
                        item.color,
                        isActive && !item.color && "text-primary"
                      )} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn(
                        "font-medium text-sm truncate",
                        item.color
                      )}>
                        {item.label}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {item.description}
                      </p>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 shrink-0 transition-transform",
                      isActive ? "text-primary" : "text-muted-foreground/50",
                      isActive && "translate-x-0.5"
                    )} />
                  </button>
                );
              })}
            </CardContent>
          </Card>
        </motion.nav>

        {/* Content Area */}
        <div className="min-h-[500px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeCategory}
              variants={contentVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <Card className="rounded-2xl border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="mb-6 pb-4 border-b border-border/50">
                    <h2 className="text-lg font-semibold">
                      {navItems.find(n => n.id === activeCategory)?.label}
                    </h2>
                    <p className="text-sm text-muted-foreground">
                      {navItems.find(n => n.id === activeCategory)?.description}
                    </p>
                  </div>
                  {renderContent()}
                </CardContent>
              </Card>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
