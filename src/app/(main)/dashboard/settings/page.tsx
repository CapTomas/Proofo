"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import {
  User,
  Shield,
  Bell,
  Palette,
  CreditCard,
  Check,
  Camera,
  Monitor,
  Smartphone,
  Globe,
  Trash2,
  Moon,
  Sun,
  Laptop,
  RefreshCw,
  Fingerprint,
  Zap,
  ChevronRight,
  LogOut,
  Mail,
  AlertTriangle,
  Briefcase,
  MapPin,
  PenLine,
  Type,
  MousePointer2,
  Download,
  Receipt,
  CreditCard as CardIcon,
  PieChart,
  DollarSign,
  Clock,
  Languages,
  Sparkles,
  MessageSquare,
  FileText,
  Calendar,
  Volume2,
  VolumeX,
  BellRing,
  BellOff,
  AtSign,
  Send,
  Activity
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { useAppStore } from "@/store";
import { dashboardStyles, containerVariants, itemVariants, getTabButtonClass } from "@/lib/dashboard-ui";
import { cn, getUserInitials } from "@/lib/utils";
import { updateProfileAction } from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CopyableId } from "@/components/dashboard/shared-components";

// --- CONFIGURATION ---

const TABS = [
  { id: "profile", label: "Profile", icon: User },
  { id: "account", label: "Account", icon: Shield },
  { id: "appearance", label: "Appearance", icon: Palette },
  { id: "billing", label: "Billing", icon: CreditCard },
  { id: "notifications", label: "Notifications", icon: Bell },
];

const THEMES = [
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
  { id: "system", label: "System", icon: Laptop },
];

const CURRENCIES = [
  { value: "USD", label: "USD ($)" },
  { value: "EUR", label: "EUR (€)" },
  { value: "GBP", label: "GBP (£)" },
  { value: "CZK", label: "CZK (Kč)" },
];

// --- SUB-COMPONENTS ---

const SettingGroup = ({ title, description, children }: { title: string, description?: string, children: React.ReactNode }) => (
  <motion.div variants={itemVariants} className="space-y-4">
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {title}
      </h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <div className="grid gap-4">
      {children}
    </div>
  </motion.div>
);

const SettingCard = ({
  icon: Icon,
  title,
  description,
  children,
  action,
  variant = "default",
  onClick
}: {
  icon?: any,
  title: string,
  description?: string,
  children?: React.ReactNode,
  action?: React.ReactNode,
  variant?: "default" | "danger" | "highlight",
  onClick?: () => void
}) => (
  <Card
    className={cn(
      dashboardStyles.cardBase,
      "h-auto transition-all duration-200",
      variant === "danger" && "border-destructive/30 bg-destructive/5 hover:border-destructive/50",
      variant === "highlight" && "border-primary/30 bg-primary/5 hover:border-primary/50",
      onClick && "cursor-pointer hover:bg-secondary/30"
    )}
    onClick={onClick}
  >
    <CardContent className="p-4 sm:p-5">
      <div className="flex items-start gap-4">
        {Icon && (
          <div className={cn(
            "h-10 w-10 rounded-xl flex items-center justify-center shrink-0 border shadow-sm transition-colors",
            variant === "danger" ? "bg-destructive/10 text-destructive border-destructive/20" :
            variant === "highlight" ? "bg-primary/10 text-primary border-primary/20" :
            "bg-background border-border/50 text-muted-foreground"
          )}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <div className="flex-1 min-w-0 space-y-1 py-0.5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h4 className={cn("font-semibold text-sm", variant === "danger" && "text-destructive")}>{title}</h4>
              {description && <p className="text-xs text-muted-foreground line-clamp-2">{description}</p>}
            </div>
            {action && <div className="shrink-0" onClick={e => e.stopPropagation()}>{action}</div>}
          </div>
          {children && <div className="pt-3">{children}</div>}
        </div>
      </div>
    </CardContent>
  </Card>
);

// --- TAB CONTENTS ---

const ProfileTab = ({ user, setUser }: { user: any, setUser: any }) => {
  const [name, setName] = useState(user?.name || "");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    await new Promise(r => setTimeout(r, 800));

    if (isSupabaseConfigured() && user && !user.id.startsWith("demo-")) {
      await updateProfileAction({ name });
    }

    setUser({ ...user, name });
    setIsSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column: Identity & Status */}
      <motion.div variants={itemVariants} className="lg:col-span-1 flex flex-col gap-6">
        <Card className={cn(dashboardStyles.cardBase, "h-full flex flex-col cursor-default")}>
          <CardContent className="p-6 flex flex-col items-center text-center space-y-6 flex-1">
            <div className="relative group">
              <Avatar className="h-32 w-32 border-4 border-background shadow-xl ring-1 ring-border/50">
                <AvatarImage src={user?.avatarUrl} className="object-cover" />
                <AvatarFallback className="text-3xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
                  {getUserInitials(user?.name, user?.email)}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[1px]">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>

            <div className="space-y-1">
              <h3 className="font-bold text-xl">{user?.name || "User"}</h3>
              <p className="text-sm text-muted-foreground">{jobTitle || "Add a job title"}</p>
            </div>

            {/* Signature Preview */}
            <div className="w-full bg-secondary/30 rounded-xl p-4 border border-dashed border-border/60">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Stored Signature</span>
                <PenLine className="h-3 w-3 text-muted-foreground" />
              </div>
              <div className="h-16 flex items-center justify-center">
                <p className="text-xs text-muted-foreground italic opacity-50">No signature saved yet</p>
              </div>
              <Button variant="outline" size="sm" className="w-full h-7 text-xs mt-2">
                Update Signature
              </Button>
            </div>
          </CardContent>

          <div className="p-4 bg-muted/30 border-t border-border/50">
            <div className="flex justify-between items-center text-xs">
              <span className="text-muted-foreground">Profile Completion</span>
              <span className="font-medium text-primary">65%</span>
            </div>
            <div className="h-1.5 w-full bg-secondary rounded-full mt-2 overflow-hidden">
              <div className="h-full bg-primary w-[65%] rounded-full" />
            </div>
          </div>
        </Card>
      </motion.div>

      {/* Right Column: Detailed Form */}
      <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col gap-6">
        <Card className={cn(dashboardStyles.cardBase, "h-full flex flex-col cursor-default")}>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Manage your public information and preferences</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 flex-1">
            {/* Personal Info Group */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Personal Information</h4>
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="pl-9 bg-background"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="job">Job Title</Label>
                  <div className="relative">
                    <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="job"
                      value={jobTitle}
                      onChange={(e) => setJobTitle(e.target.value)}
                      placeholder="e.g. Freelancer"
                      className="pl-9 bg-background"
                    />
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      value={user?.email || ""}
                      disabled
                      className="pl-9 bg-muted/50"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="location"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. New York, USA"
                      className="pl-9 bg-background"
                    />
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Regional Preferences Group */}
            <div className="space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Regional Preferences</h4>
              <div className="grid sm:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label htmlFor="currency">Default Currency</Label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger className="bg-background">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select currency" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">Used as the default for new deals.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select defaultValue="en">
                    <SelectTrigger className="bg-background" disabled>
                      <div className="flex items-center gap-2">
                        <Languages className="h-4 w-4 text-muted-foreground" />
                        <SelectValue placeholder="Select language" />
                      </div>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English (US)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-[10px] text-muted-foreground">More languages coming soon.</p>
                </div>
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-muted/30 border-t p-4 flex justify-between items-center mt-auto">
            <span className="text-[10px] text-muted-foreground italic">
              Changes auto-save to local storage in demo mode
            </span>
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              size="sm"
              className={cn("gap-2 min-w-[120px]", saved && "bg-emerald-500 hover:bg-emerald-600 text-white")}
            >
              {isSaving ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : saved ? <Check className="h-3.5 w-3.5" /> : null}
              {isSaving ? "Saving..." : saved ? "Saved Changes" : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

const AccountTab = ({ user }: { user: any }) => {
  const sessions = [
    { id: 1, device: "MacBook Pro", browser: "Chrome", location: "Prague, CZ", current: true, icon: Monitor },
    { id: 2, device: "iPhone 15", browser: "Safari", location: "Prague, CZ", current: false, icon: Smartphone },
  ];

  return (
    <div className="space-y-8">
      <SettingGroup title="Security">
        <div className="grid gap-4 md:grid-cols-2">
          <SettingCard
            icon={Fingerprint}
            title="Two-Factor Auth"
            description="Secure your account with 2FA."
            action={<Switch disabled />}
          />
          <SettingCard
            icon={Zap}
            title="Quick Login"
            description="Enable biometric login."
            action={<Switch />}
          />
        </div>
      </SettingGroup>

      <SettingGroup title="Active Sessions">
        <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default")}>
          <div className="divide-y divide-border/50">
            {sessions.map((session) => (
              <div key={session.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground border border-border/50">
                    <session.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm">{session.device}</p>
                      {session.current && (
                        <Badge variant="secondary" className="text-[9px] h-4 px-1.5 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">Current</Badge>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                      <span>{session.browser}</span>
                      <span className="text-border">•</span>
                      <span>{session.location}</span>
                    </div>
                  </div>
                </div>
                {!session.current && (
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive">
                    <LogOut className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </Card>
      </SettingGroup>

      <SettingGroup title="Danger Zone">
        <SettingCard
          icon={Trash2}
          title="Delete Account"
          description="Permanently delete your account and all associated data."
          variant="danger"
          action={<Button variant="destructive" size="sm" className="h-8 text-xs">Delete Account</Button>}
        >
          <div className="flex items-start gap-2 mt-2 p-3 bg-destructive/10 rounded-lg text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Warning: This action is irreversible. All your deals, templates, and history will be lost forever.</p>
          </div>
        </SettingCard>
      </SettingGroup>
    </div>
  );
};

// --- APPEARANCE PREVIEW COMPONENT ---

const AppearancePreview = ({ compact }: { compact: boolean }) => (
  <div className="border border-border/50 rounded-xl overflow-hidden shadow-sm bg-background">
    <div className="bg-muted/50 px-4 py-2 border-b border-border/50 flex items-center gap-2">
      <div className="flex gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-destructive/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50" />
        <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50" />
      </div>
      <div className="h-2 w-20 bg-border/50 rounded-full ml-2" />
    </div>
    <div className={cn("p-4 space-y-3", compact ? "space-y-2" : "space-y-4")}>
      <div className="flex items-center gap-3">
        <div className={cn("rounded-lg bg-primary/10 flex items-center justify-center text-primary", compact ? "h-8 w-8" : "h-10 w-10")}>
          <Zap className={cn(compact ? "h-4 w-4" : "h-5 w-5")} />
        </div>
        <div className="space-y-1 flex-1">
          <div className="h-2 w-24 bg-foreground/20 rounded-full" />
          <div className="h-1.5 w-16 bg-muted-foreground/30 rounded-full" />
        </div>
        <Badge variant="outline" className="text-[10px]">Preview</Badge>
      </div>
      <div className="h-16 bg-secondary/30 rounded-lg border border-dashed border-border/50 w-full flex items-center justify-center">
        <div className="h-1.5 w-32 bg-muted-foreground/10 rounded-full" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 flex-1 bg-primary rounded-md opacity-90" />
        <div className="h-8 flex-1 bg-secondary rounded-md" />
      </div>
    </div>
  </div>
);

const AppearanceTab = () => {
  const { theme, setTheme } = useTheme();
  const { setTheme: setStoreTheme } = useAppStore();
  const [mounted, setMounted] = useState(false);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setStoreTheme(newTheme as any);
  };

  if (!mounted) return null;

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left: Settings Controls */}
      <div className="lg:col-span-2 space-y-8">
        <SettingGroup title="Theme Preference">
          <div className="grid grid-cols-3 gap-4">
            {THEMES.map((t) => {
              const Icon = t.icon;
              const isActive = theme === t.id;
              return (
                <button
                  key={t.id}
                  onClick={() => handleThemeChange(t.id)}
                  className={cn(
                    "relative flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer group",
                    isActive
                      ? "border-primary bg-primary/10 ring-1 ring-primary/30 shadow-lg"
                      : "border-border bg-card hover:border-primary/50 hover:bg-secondary/40 hover:shadow-md"
                  )}
                >
                  <div className={cn(
                    "h-14 w-14 rounded-full flex items-center justify-center transition-all duration-200 border-2 shadow-md",
                    isActive
                      ? "bg-primary text-primary-foreground border-primary shadow-primary/25"
                      : "bg-secondary/80 border-border/80 text-foreground group-hover:bg-secondary group-hover:border-primary/30 group-hover:scale-105"
                  )}>
                    <Icon className="h-7 w-7" strokeWidth={2} />
                  </div>
                  <span className={cn("text-sm font-semibold", isActive ? "text-primary" : "text-foreground")}>{t.label}</span>
                  {isActive && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      className="absolute top-3 right-3 h-3 w-3 rounded-full bg-primary shadow-sm ring-2 ring-background"
                    />
                  )}
                </button>
              );
            })}
          </div>
        </SettingGroup>

        <SettingGroup title="Interface Density">
          <SettingCard
            icon={Monitor}
            title="Compact Mode"
            description="Reduce padding and spacing to fit more content on screen."
            action={<Switch checked={isCompact} onCheckedChange={setIsCompact} />}
          />
        </SettingGroup>

        <SettingGroup title="Accessibility">
          <SettingCard
            icon={Type}
            title="Font Scaling"
            description="Adjust the base text size."
            action={
              <div className="w-32">
                <div className="h-1.5 w-full bg-secondary rounded-full relative">
                  <div className="absolute left-0 top-0 h-full w-1/2 bg-primary rounded-full" />
                  <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 h-3.5 w-3.5 bg-background border-2 border-primary rounded-full shadow-sm" />
                </div>
              </div>
            }
          />
          <SettingCard
            icon={MousePointer2}
            title="Reduced Motion"
            description="Minimize interface animations for better accessibility."
            action={<Switch />}
          />
        </SettingGroup>
      </div>

      {/* Right: Live Preview */}
      <div className="lg:col-span-1">
        <div className="sticky top-24 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Live Preview</h3>
            <Badge variant="outline" className="text-[10px]">Active</Badge>
          </div>
          <AppearancePreview compact={isCompact} />
          <p className="text-xs text-muted-foreground text-center">
            Preview updates instantly as you change settings.
          </p>
        </div>
      </div>
    </div>
  );
};

// --- BILLING COMPONENTS ---

const VisualCreditCard = ({ isPro }: { isPro: boolean }) => (
  <div className={cn(
    "relative w-full aspect-[1.586] rounded-2xl p-6 flex flex-col justify-between overflow-hidden text-white shadow-xl transition-all duration-500",
    isPro
      ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border border-slate-700"
      : "bg-gradient-to-br from-slate-400 to-slate-500 grayscale opacity-80"
  )}>
    {/* Background Pattern */}
    <div className="absolute inset-0 opacity-20">
      <div className="absolute -right-10 -top-10 w-40 h-40 rounded-full bg-white blur-3xl" />
      <div className="absolute -left-10 -bottom-10 w-40 h-40 rounded-full bg-primary blur-3xl" />
    </div>

    <div className="relative z-10 flex justify-between items-start">
      <div className="flex gap-2 items-center">
        <div className="w-8 h-5 rounded bg-yellow-200/80" /> {/* Chip */}
        <Zap className="h-4 w-4 text-white/50" />
      </div>
      <span className="font-bold tracking-wider text-lg italic">VISA</span>
    </div>

    <div className="relative z-10 space-y-4">
      <div className="font-mono text-lg tracking-widest text-shadow-sm">
        {isPro ? "•••• •••• •••• 4242" : "•••• •••• •••• ••••"}
      </div>
      <div className="flex justify-between items-end">
        <div className="space-y-0.5">
          <div className="text-[8px] uppercase tracking-widest text-white/60">Card Holder</div>
          <div className="font-medium tracking-wide text-sm">ALEX JOHNSON</div>
        </div>
        <div className="space-y-0.5">
          <div className="text-[8px] uppercase tracking-widest text-white/60">Expires</div>
          <div className="font-medium tracking-wide text-sm">12/28</div>
        </div>
      </div>
    </div>
  </div>
);

const BillingTab = ({ user }: { user: any }) => {
  const isPro = user?.isPro || false;

  return (
    <div className="space-y-8">
      {/* Plan Status */}
      <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default border-primary/20 overflow-hidden relative")}>
        {isPro && (
          <div className="absolute top-0 right-0 p-4">
            <Badge className="bg-primary text-primary-foreground shadow-sm">Active Subscription</Badge>
          </div>
        )}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Current Plan
              </h3>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">
                  {isPro ? "Professional Plan" : "Starter Plan"}
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {isPro
                    ? "You have full access to all features including unlimited history and custom branding."
                    : "Unlock unlimited history, custom branding, and remove watermarks from your documents."}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{isPro ? "$9" : "$0"}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
              <Button size="lg" variant={isPro ? "outline" : "default"} className="w-full md:w-auto shadow-lg">
                {isPro ? "Manage Subscription" : "Upgrade to Pro"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Payment Method - Visual Card */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            Payment Method
          </h3>
          <Card className={cn(dashboardStyles.cardBase, "h-full cursor-default bg-secondary/10")}>
            <CardContent className="p-6 flex flex-col items-center gap-6">
              <VisualCreditCard isPro={isPro} />
              <div className="w-full">
                {isPro ? (
                  <Button variant="outline" className="w-full">Update Card</Button>
                ) : (
                  <Button variant="outline" className="w-full border-dashed border-2">
                    <PlusIcon className="h-4 w-4 mr-2" /> Add Payment Method
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Usage & History */}
        <div className="lg:col-span-2 space-y-8">
          <SettingGroup title="Usage Overview">
            <div className="grid sm:grid-cols-2 gap-4">
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-600">
                    <PieChart className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Deals This Month</p>
                    <p className="text-xl font-bold">12 <span className="text-sm text-muted-foreground font-normal">/ {isPro ? "Unlimited" : "5"}</span></p>
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50 shadow-sm">
                <CardContent className="p-4 flex items-center gap-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-600">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Next Invoice</p>
                    <p className="text-xl font-bold">{isPro ? "Feb 1, 2024" : "N/A"}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </SettingGroup>

          <SettingGroup title="Invoice History">
            <Card className={cn(dashboardStyles.cardBase, "cursor-default")}>
              <div className="divide-y divide-border/50">
                {[
                  { id: "INV-001", date: "Jan 1, 2024", amount: "$9.00", status: "Paid" },
                  { id: "INV-002", date: "Dec 1, 2023", amount: "$9.00", status: "Paid" },
                ].map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-8 w-8 rounded-lg bg-secondary flex items-center justify-center text-muted-foreground">
                        <Receipt className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{inv.id}</p>
                        <p className="text-xs text-muted-foreground">{inv.date}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-sm font-medium">{inv.amount}</span>
                      <Badge variant="secondary" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                        {inv.status}
                      </Badge>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </SettingGroup>
        </div>
      </div>
    </div>
  );
};

const NotificationsTab = () => {
  const [emailFrequency, setEmailFrequency] = useState("instant");

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Left: Notification Settings */}
      <div className="lg:col-span-2 space-y-8">
        <SettingGroup title="Deal Notifications" description="Stay updated on your deals and agreements">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              icon={FileText}
              title="Deal Viewed"
              description="When someone opens your deal."
              action={<Switch defaultChecked />}
            />
            <SettingCard
              icon={PenLine}
              title="Deal Signed"
              description="When a deal is signed by all parties."
              action={<Switch defaultChecked />}
            />
            <SettingCard
              icon={AlertTriangle}
              title="Deal Expiring"
              description="When a deal is about to expire."
              action={<Switch defaultChecked />}
            />
            <SettingCard
              icon={Activity}
              title="Deal Comments"
              description="When someone comments on a deal."
              action={<Switch defaultChecked />}
            />
          </div>
        </SettingGroup>

        <SettingGroup title="Communication" description="Manage how you receive messages">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              icon={MessageSquare}
              title="In-App Messages"
              description="Messages from other users."
              action={<Switch defaultChecked />}
            />
            <SettingCard
              icon={AtSign}
              title="Mentions"
              description="When you're mentioned in a deal."
              action={<Switch defaultChecked />}
            />
          </div>
        </SettingGroup>

        <SettingGroup title="Reminders & Scheduling" description="Never miss important deadlines">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              icon={Calendar}
              title="Upcoming Deadlines"
              description="Reminder before deal deadlines."
              action={<Switch defaultChecked />}
            />
            <SettingCard
              icon={Clock}
              title="Follow-up Reminders"
              description="Remind to follow up on pending deals."
              action={<Switch />}
            />
          </div>
        </SettingGroup>

        <SettingGroup title="System Notifications">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              icon={Shield}
              title="Security Alerts"
              description="Important security notifications."
              variant="highlight"
              action={<Switch defaultChecked disabled />}
            />
            <SettingCard
              icon={Sparkles}
              title="Product Updates"
              description="New features and improvements."
              action={<Switch />}
            />
          </div>
        </SettingGroup>
      </div>

      {/* Right: Delivery Preferences */}
      <div className="lg:col-span-1 space-y-6">
        <div className="sticky top-24 space-y-6">
          <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default")}>
            <CardHeader className="pb-4">
              <CardTitle className="text-base flex items-center gap-2">
                <Send className="h-4 w-4 text-primary" />
                Delivery Preferences
              </CardTitle>
              <CardDescription className="text-xs">Choose how to receive notifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Email Frequency */}
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Email Frequency</Label>
                <div className="space-y-2">
                  {[
                    { id: "instant", label: "Instant", desc: "Get notified immediately" },
                    { id: "daily", label: "Daily Digest", desc: "Once per day summary" },
                    { id: "weekly", label: "Weekly Digest", desc: "Once per week summary" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => setEmailFrequency(option.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        emailFrequency === option.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 hover:bg-secondary/30"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                        emailFrequency === option.id ? "border-primary bg-primary" : "border-muted-foreground/40"
                      )}>
                        {emailFrequency === option.id && (
                          <div className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium">{option.label}</p>
                        <p className="text-xs text-muted-foreground">{option.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              <Separator />

              {/* Channels */}
              <div className="space-y-3">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Channels</Label>
                <div className="space-y-2">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Email</span>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Push</span>
                    </div>
                    <Switch defaultChecked />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Mobile</span>
                    </div>
                    <Switch />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default")}>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h4>
              <Button variant="outline" className="w-full justify-start gap-2 h-9">
                <BellOff className="h-4 w-4" />
                <span className="text-sm">Mute All for 1 Hour</span>
              </Button>
              <Button variant="outline" className="w-full justify-start gap-2 h-9">
                <VolumeX className="h-4 w-4" />
                <span className="text-sm">Do Not Disturb</span>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

// --- MAIN COMPONENT ---

export default function SettingsPage() {
  const { user, setUser } = useAppStore();
  const [activeTab, setActiveTab] = useState("profile");

  return (
    <div className={dashboardStyles.pageContainer}>

      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>Settings</h1>
          <p className={dashboardStyles.pageDescription}>Manage your account preferences</p>
        </div>
        {user && (
          <div className="hidden sm:flex items-center gap-2 bg-secondary/50 px-3 py-1.5 rounded-lg border border-border/50">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">User ID</span>
            <CopyableId id={user.id} className="bg-background border-border/50 h-5" />
          </div>
        )}
      </div>

      {/* Navigation Tabs - Standardized Filter Bar */}
      <div className={dashboardStyles.filterBar}>
        <div className={cn(dashboardStyles.toggleGroup, "w-full overflow-x-auto no-scrollbar flex items-center")}>
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  getTabButtonClass(isActive),
                  "inline-flex flex-1 sm:flex-none min-w-[100px] justify-center sm:justify-start items-center gap-2"
                )}
              >
                <Icon className={cn("h-4 w-4 shrink-0", isActive ? "text-primary" : "opacity-70")} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div className="min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            exit={{ opacity: 0, y: 10, transition: { duration: 0.15 } }}
            className="w-full"
          >
            {activeTab === "profile" && <ProfileTab user={user} setUser={setUser} />}
            {activeTab === "account" && <AccountTab user={user} />}
            {activeTab === "appearance" && <AppearanceTab />}
            {activeTab === "billing" && <BillingTab user={user} />}
            {activeTab === "notifications" && <NotificationsTab />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}

// Icon helper for Add Method button
const PlusIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="12" y1="5" x2="12" y2="19"></line>
    <line x1="5" y1="12" x2="19" y2="12"></line>
  </svg>
);
