"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTheme } from "next-themes";
import { LucideIcon } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";

import { useAppStore } from "@/store";
import { dashboardStyles, containerVariants, itemVariants, getTabButtonClass } from "@/lib/dashboard-ui";
import { cn, getUserInitials } from "@/lib/utils";
import {
  SettingsHeaderSkeleton,
  SettingsTabsSkeleton,
  SettingsCardSkeleton,
  SettingsGroupSkeleton,
  SettingsProfileSkeleton
} from "@/components/dashboard/shared-components";
import {
  updateProfileAction,
  getUserProfileAction,
  getNotificationPreferencesAction,
  updateNotificationPreferencesAction,
  deleteUserAccountAction,
  uploadAvatarAction,
  getDoNotDisturbStatusAction,
  toggleDoNotDisturbAction,
  NotificationPreferences,
  DoNotDisturbStatus,
  downloadUserDataAction
} from "@/app/actions/deal-actions";
import { isSupabaseConfigured } from "@/lib/supabase";
import { CopyableId } from "@/components/dashboard/shared-components";
import { User as UserType } from "@/types";
import { toast } from "sonner";
import { useAppearance } from "@/components/providers/appearance-provider";
import { SignatureEditor } from "@/components/signature-editor";
import { BillingTab } from "./billing-tab";

// Type for settings user (extends User with optional fields that may be locally modified)
type SettingsUser = UserType | null;

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
  <div className="space-y-4">
    <div className="flex flex-col gap-1">
      <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
        {title}
      </h3>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <div className="grid gap-4">
      {children}
    </div>
  </div>
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
  icon?: LucideIcon,
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
              <h4 className={cn("font-semibold text-sm text-foreground", variant === "danger" && "text-destructive")}>{title}</h4>
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

const ProfileTab = ({ user, setUser }: { user: SettingsUser, setUser: (user: SettingsUser) => void }) => {
  const [name, setName] = useState(user?.name || "");
  const [jobTitle, setJobTitle] = useState("");
  const [location, setLocation] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || "");
  const [signatureUrl, setSignatureUrl] = useState<string | null>(null);
  const [isSignatureEditorOpen, setIsSignatureEditorOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle avatar file selection
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be less than 2MB");
      return;
    }

    setIsUploadingAvatar(true);

    try {
      // Convert to base64
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;

        if (isSupabaseConfigured() && user && !user.id.startsWith("demo-")) {
          const { avatarUrl: newUrl, error } = await uploadAvatarAction(base64);
          if (error) {
            toast.error("Failed to upload avatar", { description: error });
            setIsUploadingAvatar(false);
            return;
          }
          if (newUrl) {
            setAvatarUrl(newUrl);
            setUser({ ...user, avatarUrl: newUrl });
            toast.success("Avatar updated successfully");
          }
        } else {
          // Demo mode - just show locally
          setAvatarUrl(base64);
          if (user) setUser({ ...user, avatarUrl: base64 });
          toast.success("Avatar updated (demo mode)");
        }
        setIsUploadingAvatar(false);
      };
      reader.readAsDataURL(file);
    } catch {
      toast.error("Failed to process image");
      setIsUploadingAvatar(false);
    }
  };

  // Load persisted profile data on mount
  useEffect(() => {
    const loadProfile = async () => {
      // 1. Supabase Mode
      if (isSupabaseConfigured() && user && !user.id.startsWith("demo-")) {
        const { profile, error } = await getUserProfileAction();
        if (error) {
          toast.error("Failed to load profile data");
        } else if (profile) {
          setName(profile.name || user?.name || "");
          setJobTitle(profile.jobTitle || "");
          setLocation(profile.location || "");
          setCurrency(profile.currency || "USD");
          setSignatureUrl(profile.signatureUrl || null);
        }
        setIsLoading(false);
        return;
      }

      // 2. Demo Mode (LocalStorage)
      const saved = localStorage.getItem("proofo-demo-profile");
      if (saved) {
        try {
          const data = JSON.parse(saved);
          if (data.name) setName(data.name);
          if (data.jobTitle) setJobTitle(data.jobTitle);
          if (data.location) setLocation(data.location);
          if (data.currency) setCurrency(data.currency);
          if (data.signatureUrl) setSignatureUrl(data.signatureUrl);
        } catch (e) {
          console.error("Failed to parse demo profile", e);
        }
      }
      setIsLoading(false);
    };

    loadProfile();
  }, [user]);

  // Calculate profile completion dynamically
  const profileCompletion = useMemo(() => {
    let completed = 0;
    const total = 5; // name, email (always filled), jobTitle, location, currency

    if (user?.email) completed++;
    if (name.trim()) completed++;
    if (jobTitle.trim()) completed++;
    if (location.trim()) completed++;
    if (currency) completed++;

    return Math.round((completed / total) * 100);
  }, [user?.email, name, jobTitle, location, currency]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setIsSaving(true);

    try {
      if (isSupabaseConfigured() && user && !user.id.startsWith("demo-")) {
        const { error } = await updateProfileAction({
          name: name.trim(),
          jobTitle: jobTitle.trim() || undefined,
          location: location.trim() || undefined,
          currency: currency as "USD" | "EUR" | "GBP" | "CZK" | undefined,
        });

        if (error) {
          toast.error("Failed to save profile", { description: error });
          setIsSaving(false);
          return;
        }
      }

      if (user) {
        setUser({ ...user, name: name.trim() });

        // Save to LocalStorage if demo mode
        if (!isSupabaseConfigured() || user.id.startsWith("demo-")) {
           localStorage.setItem("proofo-demo-profile", JSON.stringify({
              name: name.trim(),
              jobTitle: jobTitle.trim(),
              location: location.trim(),
              currency,
              signatureUrl
           }));
        }
      }
      toast.success("Profile saved successfully");
    } catch {
      toast.error("An error occurred while saving");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {/* Left Column: Identity & Status */}
      <motion.div variants={itemVariants} className="lg:col-span-1 flex flex-col gap-6">
        <Card className={cn(dashboardStyles.cardBase, "h-full flex flex-col cursor-default")}>
          <CardContent className="p-6 flex flex-col items-center text-center space-y-6 flex-1">
            {isLoading ? (
              <SettingsProfileSkeleton />
            ) : (
              <>
                <div className="relative group">
                  {/* Hidden file input for avatar upload */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarUpload}
                    className="hidden"
                  />
                  <Avatar
                    className="h-32 w-32 border-4 border-background shadow-xl ring-1 ring-border/50 cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <AvatarImage src={avatarUrl || user?.avatarUrl} className="object-cover" />
                    <AvatarFallback className="text-3xl bg-linear-to-br from-primary to-primary/80 text-primary-foreground">
                      {getUserInitials(user?.name, user?.email)}
                    </AvatarFallback>
                  </Avatar>
                  <div
                    className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-[1px]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {isUploadingAvatar ? (
                      <RefreshCw className="h-8 w-8 text-white animate-spin" />
                    ) : (
                      <Camera className="h-8 w-8 text-white" />
                    )}
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
                  <div className="h-16 flex items-center justify-center bg-white rounded-lg">
                    {signatureUrl ? (
                      <img
                        src={signatureUrl}
                        alt="Your signature"
                        className="h-14 object-contain"
                      />
                    ) : (
                      <p className="text-xs text-muted-foreground italic opacity-50">No signature saved yet</p>
                    )}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-7 text-xs mt-2"
                    onClick={() => setIsSignatureEditorOpen(true)}
                  >
                    {signatureUrl ? "Update Signature" : "Add Signature"}
                  </Button>
                </div>
              </>
            )}
          </CardContent>

          {!isLoading && (
            <div className="p-4 bg-muted/30 border-t border-border/50">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground">Profile Completion</span>
                <span className="font-medium text-primary">{profileCompletion}%</span>
              </div>
              <div className="h-1.5 w-full bg-secondary rounded-full mt-2 overflow-hidden">
                <div className="h-full bg-primary rounded-full transition-all duration-300" style={{ width: `${profileCompletion}%` }} />
              </div>
            </div>
          )}
          {isLoading && (
            <div className="p-4 border-t border-border/50">
              <Skeleton className="h-3 w-20 mb-2" />
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          )}
        </Card>

        {/* Signature Editor Modal */}
        <SignatureEditor
          isOpen={isSignatureEditorOpen}
          onClose={() => setIsSignatureEditorOpen(false)}
          onSave={(url) => setSignatureUrl(url)}
          currentSignatureUrl={signatureUrl}
        />
      </motion.div>

      {/* Right Column: Detailed Form */}
      <motion.div variants={itemVariants} className="lg:col-span-2 flex flex-col gap-6">
        <Card className={cn(dashboardStyles.cardBase, "h-full flex flex-col cursor-default")}>
          <CardHeader>
            <CardTitle>Profile Details</CardTitle>
            <CardDescription>Manage your public information and preferences</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6 flex-1">
            {isLoading ? (
              <div className="space-y-8">
                <div className="space-y-4">
                  <Skeleton className="h-4 w-32 rounded-md" />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-40 rounded-md" />
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-10 w-full rounded-lg opacity-50" />
                    </div>
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-24 rounded-md" />
                      <Skeleton className="h-10 w-full rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <>
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
              </>
            )}
          </CardContent>

          <CardFooter className="bg-muted/30 border-t p-4 flex justify-between items-center mt-auto">
            <span className="text-[10px] text-muted-foreground italic">
              Changes auto-save to local storage in demo mode
            </span>
            <Button
              onClick={handleSave}
              disabled={isSaving || !name.trim()}
              size="sm"
              className="gap-2 min-w-[120px]"
            >
              {isSaving && <RefreshCw className="h-3.5 w-3.5 animate-spin" />}
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  );
};

const AccountTab = ({ user }: { user: SettingsUser }) => {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initial load for smooth transition
    const timer = setTimeout(() => setIsLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const handleExportData = async () => {
    setIsDownloading(true);
    try {
      if (!isSupabaseConfigured() || (user && user.id.startsWith("demo-"))) {
        toast.info("Export is only available in production mode");
        setIsDownloading(false);
        return;
      }

      const { data, error } = await downloadUserDataAction();

      if (error) {
        toast.error("Failed to export data", { description: error });
        setIsDownloading(false);
        return;
      }

      if (data) {
        // Create blob and download
        const blob = new Blob([data], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `proofo-export-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        toast.success("Data export started");
      }
    } catch {
      toast.error("An error occurred during export");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== "DELETE") return;

    setIsDeleting(true);
    try {
      const { error } = await deleteUserAccountAction();
      if (error) {
        toast.error("Failed to delete account", { description: error });
        setIsDeleting(false);
        return;
      }
      toast.success("Account deleted. Redirecting...");
      // Redirect to home page after a brief delay
      setTimeout(() => {
        window.location.href = "/";
      }, 1500);
    } catch {
      toast.error("An error occurred");
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <SettingsGroupSkeleton count={2} />
        <SettingsGroupSkeleton count={1} />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <SettingGroup title="Security">
        <div className="grid gap-4 md:grid-cols-2">
          <SettingCard
            icon={Fingerprint}
            title="Two-Factor Auth"
            description="Secure your account with 2FA."
            action={
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted text-muted-foreground border-border">Coming Soon</Badge>
                <Switch disabled />
              </div>
            }
          />
          <SettingCard
            icon={Zap}
            title="Quick Login"
            description="Enable biometric login."
            action={
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-muted text-muted-foreground border-border">Coming Soon</Badge>
                <Switch disabled />
              </div>
            }
          />
        </div>
      </SettingGroup>

      <SettingGroup title="Account Information">
        <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default")}>
          <CardContent className="p-4 space-y-4">
            {/* Email */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground border border-border/50">
                  <Mail className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Email Address</p>
                  <p className="font-medium text-sm">{user?.email || "Not set"}</p>
                </div>
              </div>
            </div>

            <Separator />

            {/* User ID */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground border border-border/50">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">User ID</p>
                  <p className="font-mono text-xs text-muted-foreground">{user?.id?.slice(0, 8)}...{user?.id?.slice(-4)}</p>
                </div>
              </div>
              <CopyableId id={user?.id || ""} className="h-7" />
            </div>

            <Separator />

            {/* Sign Out */}
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-secondary/50 flex items-center justify-center text-muted-foreground border border-border/50">
                  <LogOut className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">Sign Out</p>
                  <p className="text-xs text-muted-foreground">End your current session</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => window.location.href = "/login"}
              >
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </SettingGroup>

      <SettingGroup title="Data & Privacy">
        <SettingCard
          icon={Download}
          title="Export Your Data"
          description="Download a copy of all your data in JSON format."
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-2"
                onClick={handleExportData}
                disabled={isDownloading}
              >
                {isDownloading ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Download className="h-3 w-3" />}
                Export Data
              </Button>
            </div>
          }
        />
      </SettingGroup>

      <SettingGroup title="Danger Zone">
        <SettingCard
          icon={Trash2}
          title="Delete Account"
          description="Permanently delete your account and all associated data."
          variant="danger"
          action={
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setShowDeleteDialog(true)}
            >
              Delete Account
            </Button>
          }
        >
          <div className="flex items-start gap-2 mt-2 p-3 bg-destructive/10 rounded-lg text-xs text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p>Warning: This action is irreversible. All your deals, templates, and history will be lost forever.</p>
          </div>
        </SettingCard>
      </SettingGroup>

      {/* Delete Account Confirmation Dialog */}
      <AnimatePresence>
        {showDeleteDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            onClick={() => !isDeleting && setShowDeleteDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-card border border-border rounded-2xl p-6 max-w-md w-full mx-4 shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center gap-4 mb-4">
                <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="h-6 w-6 text-destructive" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Delete Account</h3>
                  <p className="text-sm text-muted-foreground">This action cannot be undone</p>
                </div>
              </div>

              <p className="text-sm text-muted-foreground mb-4">
                This will permanently delete your account, all your deals, contacts, and preferences.
                Type <strong className="text-destructive">DELETE</strong> to confirm.
              </p>

              <Input
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder='Type "DELETE" to confirm'
                className="mb-4"
                disabled={isDeleting}
              />

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowDeleteDialog(false)}
                  disabled={isDeleting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="flex-1"
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== "DELETE" || isDeleting}
                >
                  {isDeleting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Deleting...
                    </>
                  ) : (
                    "Delete My Account"
                  )}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
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

  // Use the appearance context for persistent settings
  const {
    compactMode,
    fontScale,
    reducedMotion,
    isLoading: appearanceLoading,
    setCompactMode,
    setFontScale,
    setReducedMotion
  } = useAppearance();

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    setStoreTheme(newTheme as "light" | "dark" | "system");
  };

  if (!mounted) return null;

  // Font scale display value (e.g., "100%", "80%", "120%")
  const fontScalePercent = Math.round(fontScale * 100);

  if (appearanceLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <SettingsGroupSkeleton count={3} />
          <SettingsGroupSkeleton count={1} />
          <SettingsGroupSkeleton count={2} />
        </div>
        <div className="lg:col-span-1">
          <div className="bg-card border border-border/50 rounded-2xl h-[400px] animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

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
                      layoutId="active-theme-indicator"
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
            action={
              <Switch
                checked={compactMode}
                onCheckedChange={setCompactMode}
                disabled={appearanceLoading}
              />
            }
          />
        </SettingGroup>

        <SettingGroup title="Accessibility">
          <SettingCard
            icon={Type}
            title="Font Scaling"
            description={`Adjust the base text size. Currently: ${fontScalePercent}%`}
          >
            <div className="flex items-center gap-4 pt-2">
              <span className="text-xs text-muted-foreground w-8">80%</span>
              <input
                type="range"
                min="0.8"
                max="1.2"
                step="0.05"
                value={fontScale}
                onChange={(e) => setFontScale(parseFloat(e.target.value))}
                disabled={appearanceLoading}
                className="flex-1 h-2 bg-secondary rounded-lg appearance-none cursor-pointer accent-primary"
              />
              <span className="text-xs text-muted-foreground w-10">120%</span>
              <Badge variant="secondary" className="text-xs font-mono min-w-[48px] justify-center">
                {fontScalePercent}%
              </Badge>
            </div>
          </SettingCard>
          <SettingCard
            icon={MousePointer2}
            title="Reduced Motion"
            description="Minimize interface animations for better accessibility."
            action={
              <Switch
                checked={reducedMotion}
                onCheckedChange={setReducedMotion}
                disabled={appearanceLoading}
              />
            }
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
          <AppearancePreview compact={compactMode} />
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

// --- BILLING TAB ---

const BillingTabLegacy = ({ user }: { user: SettingsUser }) => {
  const isPro = user?.isPro || false;

  return (
    <div className="space-y-8">
      {/* Current Plan Status */}
      <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default overflow-hidden relative")}>
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary/40 via-primary to-primary/40" />
        <CardContent className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-8 items-start md:items-center justify-between">
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-primary uppercase tracking-wider flex items-center gap-2">
                <Sparkles className="h-4 w-4" /> Current Plan
              </h3>
              <div className="space-y-1">
                <h2 className="text-3xl font-bold tracking-tight">
                  {isPro ? "Professional Plan" : "Free Plan"}
                </h2>
                <p className="text-muted-foreground max-w-md">
                  {isPro
                    ? "You have full access to all features."
                    : "You're on the free plan. Upgrade to Pro when it launches for premium features."}
                </p>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3 shrink-0 w-full md:w-auto">
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{isPro ? "$9" : "$0"}</span>
                <span className="text-muted-foreground text-sm">/month</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Pro Plan Coming Soon */}
      <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default border-dashed border-2 border-primary/30")}>
        <CardContent className="p-8 text-center">
          <div className="max-w-md mx-auto space-y-6">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-2">
              <h3 className="text-2xl font-bold">Pro Plan Coming Soon</h3>
              <p className="text-muted-foreground">
                We're working on premium features that will help you close more deals faster.
              </p>
            </div>

            {/* Feature comparison */}
            <div className="grid grid-cols-2 gap-4 pt-4 text-left">
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Free</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>5 deals per month</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Basic templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>Email receipts</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span>30-day history</span>
                  </li>
                </ul>
              </div>
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-primary uppercase tracking-wider">Pro</h4>
                <ul className="space-y-2 text-sm">
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Unlimited deals</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Custom templates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>No watermarks</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>Unlimited history</span>
                  </li>
                </ul>
              </div>
            </div>

            <p className="text-xs text-muted-foreground pt-4">
              Billing features will be available when Stripe integration is complete.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

const NotificationsTab = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [prefs, setPrefs] = useState<NotificationPreferences>({
    notifyDealViewed: true,
    notifyDealSigned: true,
    notifyDealExpiring: true,
    notifyDealComments: true,
    notifyMessages: true,
    notifyMentions: true,
    notifyDeadlines: true,
    notifyFollowups: false,
    notifySecurity: true,
    notifyProductUpdates: false,
    emailFrequency: "instant",
    channelEmail: true,
    channelPush: true,
    channelMobile: false,
  });
  const [dndStatus, setDndStatus] = useState<DoNotDisturbStatus>({ enabled: false, expiresAt: null });
  const [isMuting, setIsMuting] = useState(false);

  // Load preferences on mount
  useEffect(() => {
    const loadPrefs = async () => {
      if (!isSupabaseConfigured()) {
        setIsLoading(false);
        return;
      }

      // Load notification preferences and DND status in parallel
      const [notifResult, dndResult] = await Promise.all([
        getNotificationPreferencesAction(),
        getDoNotDisturbStatusAction(),
      ]);

      if (notifResult.error) {
        toast.error("Failed to load notification preferences");
      } else if (notifResult.preferences) {
        setPrefs(notifResult.preferences);
      }

      if (dndResult.status) {
        setDndStatus(dndResult.status);
      }

      setIsLoading(false);
    };
    loadPrefs();
  }, []);

  // Save preference when it changes
  const updatePref = async <K extends keyof NotificationPreferences>(
    key: K,
    value: NotificationPreferences[K]
  ) => {
    const oldValue = prefs[key];
    setPrefs((prev) => ({ ...prev, [key]: value }));

    if (isSupabaseConfigured()) {
      const { error } = await updateNotificationPreferencesAction({ [key]: value });
      if (error) {
        toast.error("Failed to save preference");
        setPrefs((prev) => ({ ...prev, [key]: oldValue }));
      }
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-8">
          <SettingsGroupSkeleton count={4} />
          <SettingsGroupSkeleton count={2} />
          <SettingsGroupSkeleton count={2} />
        </div>
        <div className="lg:col-span-1">
          <div className="bg-card border border-border/50 rounded-2xl h-[400px] animate-pulse shadow-sm" />
        </div>
      </div>
    );
  }

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
              action={<Switch checked={prefs.notifyDealViewed} onCheckedChange={(v) => updatePref("notifyDealViewed", v)} />}
            />
            <SettingCard
              icon={PenLine}
              title="Deal Signed"
              description="When a deal is signed by all parties."
              action={<Switch checked={prefs.notifyDealSigned} onCheckedChange={(v) => updatePref("notifyDealSigned", v)} />}
            />
            <SettingCard
              icon={AlertTriangle}
              title="Deal Expiring"
              description="When a deal is about to expire."
              action={<Switch checked={prefs.notifyDealExpiring} onCheckedChange={(v) => updatePref("notifyDealExpiring", v)} />}
            />
            <SettingCard
              icon={Activity}
              title="Deal Comments"
              description="When someone comments on a deal."
              action={<Switch checked={prefs.notifyDealComments} onCheckedChange={(v) => updatePref("notifyDealComments", v)} />}
            />
          </div>
        </SettingGroup>

        <SettingGroup title="Communication" description="Manage how you receive messages">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              icon={MessageSquare}
              title="In-App Messages"
              description="Messages from other users."
              action={<Switch checked={prefs.notifyMessages} onCheckedChange={(v) => updatePref("notifyMessages", v)} />}
            />
            <SettingCard
              icon={AtSign}
              title="Mentions"
              description="When you're mentioned in a deal."
              action={<Switch checked={prefs.notifyMentions} onCheckedChange={(v) => updatePref("notifyMentions", v)} />}
            />
          </div>
        </SettingGroup>

        <SettingGroup title="Reminders & Scheduling" description="Never miss important deadlines">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingCard
              icon={Calendar}
              title="Upcoming Deadlines"
              description="Reminder before deal deadlines."
              action={<Switch checked={prefs.notifyDeadlines} onCheckedChange={(v) => updatePref("notifyDeadlines", v)} />}
            />
            <SettingCard
              icon={Clock}
              title="Follow-up Reminders"
              description="Remind to follow up on pending deals."
              action={<Switch checked={prefs.notifyFollowups} onCheckedChange={(v) => updatePref("notifyFollowups", v)} />}
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
              action={<Switch checked={prefs.notifySecurity} disabled />}
            />
            <SettingCard
              icon={Sparkles}
              title="Product Updates"
              description="New features and improvements."
              action={<Switch checked={prefs.notifyProductUpdates} onCheckedChange={(v) => updatePref("notifyProductUpdates", v)} />}
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
                    { id: "instant" as const, label: "Instant", desc: "Get notified immediately" },
                    { id: "daily" as const, label: "Daily Digest", desc: "Once per day summary" },
                    { id: "weekly" as const, label: "Weekly Digest", desc: "Once per week summary" },
                  ].map((option) => (
                    <button
                      key={option.id}
                      onClick={() => updatePref("emailFrequency", option.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                        prefs.emailFrequency === option.id
                          ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                          : "border-border/50 hover:border-primary/30 hover:bg-secondary/30"
                      )}
                    >
                      <div className={cn(
                        "h-4 w-4 rounded-full border-2 flex items-center justify-center transition-colors",
                        prefs.emailFrequency === option.id ? "border-primary bg-primary" : "border-muted-foreground/40"
                      )}>
                        {prefs.emailFrequency === option.id && (
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
                    <Switch checked={prefs.channelEmail} onCheckedChange={(v) => updatePref("channelEmail", v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Bell className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Push</span>
                    </div>
                    <Switch checked={prefs.channelPush} onCheckedChange={(v) => updatePref("channelPush", v)} />
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-secondary/30 border border-border/50">
                    <div className="flex items-center gap-3">
                      <Smartphone className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium">Mobile</span>
                    </div>
                    <Switch checked={prefs.channelMobile} onCheckedChange={(v) => updatePref("channelMobile", v)} />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions */}
          <Card className={cn(dashboardStyles.cardBase, "h-auto cursor-default")}>
            <CardContent className="p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Quick Actions</h4>

              {/* Show DND status if active */}
              {dndStatus.enabled && (
                <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                  <VolumeX className="h-4 w-4 text-amber-600" />
                  <span className="text-xs text-amber-600 font-medium">
                    Do Not Disturb is active
                    {dndStatus.expiresAt && (
                      <span className="text-amber-500/80">
                        {" "}until {new Date(dndStatus.expiresAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </span>
                </div>
              )}

              <Button
                variant="outline"
                className="w-full justify-start gap-2 h-9"
                disabled={isMuting || dndStatus.enabled}
                onClick={async () => {
                  setIsMuting(true);
                  const { error } = await toggleDoNotDisturbAction(true, 60); // 60 minutes
                  if (error) {
                    toast.error("Failed to enable mute");
                  } else {
                    const expiry = new Date();
                    expiry.setMinutes(expiry.getMinutes() + 60);
                    setDndStatus({ enabled: true, expiresAt: expiry.toISOString() });
                    toast.success("Notifications muted for 1 hour");
                  }
                  setIsMuting(false);
                }}
              >
                {isMuting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <BellOff className="h-4 w-4" />}
                <span className="text-sm">Mute All for 1 Hour</span>
              </Button>

              <Button
                variant={dndStatus.enabled ? "default" : "outline"}
                className={cn("w-full justify-start gap-2 h-9", dndStatus.enabled && "bg-amber-500 hover:bg-amber-600")}
                disabled={isMuting}
                onClick={async () => {
                  setIsMuting(true);
                  const newState = !dndStatus.enabled;
                  const { error } = await toggleDoNotDisturbAction(newState);
                  if (error) {
                    toast.error("Failed to toggle Do Not Disturb");
                  } else {
                    setDndStatus({ enabled: newState, expiresAt: null });
                    toast.success(newState ? "Do Not Disturb enabled" : "Do Not Disturb disabled");
                  }
                  setIsMuting(false);
                }}
              >
                <VolumeX className="h-4 w-4" />
                <span className="text-sm">{dndStatus.enabled ? "Turn Off Do Not Disturb" : "Do Not Disturb"}</span>
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
