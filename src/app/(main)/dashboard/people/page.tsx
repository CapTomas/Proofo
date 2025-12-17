"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Users,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  History,
  Send,
  EyeOff,
  Eye,
  UserPlus,
  X,
  XCircle,
  Copy,
  Check,
  Mail,
  RotateCcw,
  Trash2,
  Clock,
  ArrowDownAZ,
  ArrowUpAZ,
  Sparkles,
  ChevronDown,
  Command,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

import { useAppStore } from "@/store";
import { timeAgo, formatDate } from "@/lib/crypto";
import { cn, getUserInitials } from "@/lib/utils";
import { Deal } from "@/types";
import { dashboardStyles, containerVariants, itemVariants, cardFlipTransition, getToggleButtonClass, getFilterPillClass, getGridClass } from "@/lib/dashboard-ui";
import { HighlightText } from "@/components/dashboard/shared-components";

// --- TYPES & CONFIG ---

interface Contact {
  id: string;
  name: string;
  email?: string;
  dealsCount: number;
  lastDealDate?: string;
  role: "recipient" | "creator" | "both";
  isCustom?: boolean;
  recentDeals: Deal[];
}

type SortOption = "recent" | "name_asc" | "name_desc" | "deals_count";
type ViewMode = "grid" | "list";

// HighlightText imported from shared-components

const CopyableText = ({ text, className }: { text: string; className?: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div
      className={cn("flex items-center gap-1.5 group/copy cursor-pointer hover:text-foreground transition-colors", className)}
      onClick={handleCopy}
      title="Click to copy"
    >
      <span className="truncate">{text}</span>
      <div className="relative w-3 h-3 shrink-0">
        <AnimatePresence mode="wait">
          {copied ? (
            <motion.div
              key="check"
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
            >
              <Check className="w-3 h-3 text-emerald-500" />
            </motion.div>
          ) : (
            <motion.div
              key="copy"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="opacity-0 group-hover/copy:opacity-100 transition-opacity"
            >
              <Copy className="w-3 h-3" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// Sort Dropdown Menu
const SortMenu = ({ current, onChange }: { current: SortOption, onChange: (o: SortOption) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const options: { id: SortOption; label: string; icon: any }[] = [
    { id: "recent", label: "Recently Active", icon: Clock },
    { id: "deals_count", label: "Most Deals", icon: Sparkles },
    { id: "name_asc", label: "Name (A-Z)", icon: ArrowDownAZ },
    { id: "name_desc", label: "Name (Z-A)", icon: ArrowUpAZ },
  ];

  const currentOption = options.find(o => o.id === current) || options[0];

  return (
    <div className="relative h-full" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 px-2.5 py-1.5 h-full rounded-lg text-xs font-medium transition-all cursor-pointer select-none",
          isOpen ? "bg-background text-foreground shadow-sm ring-1 ring-border" : "text-muted-foreground hover:text-foreground hover:bg-background/50"
        )}
      >
        <currentOption.icon className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">{currentOption.label}</span>
        <ChevronDown className={cn("h-3 w-3 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 5, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 5, scale: 0.95 }}
            transition={{ duration: 0.1 }}
            className="absolute top-full right-0 mt-2 w-40 bg-popover border border-border/50 rounded-xl shadow-xl z-50 overflow-hidden p-1"
          >
            {options.map((option) => (
              <button
                key={option.id}
                onClick={() => { onChange(option.id); setIsOpen(false); }}
                className={cn(
                  "flex items-center gap-2 px-2 py-1.5 text-xs rounded-lg transition-colors w-full text-left cursor-pointer",
                  current === option.id
                    ? "bg-secondary text-foreground font-medium"
                    : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                )}
              >
                <option.icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- CARD COMPONENT ---

const ContactCard = ({
  contact,
  viewMode,
  searchQuery,
  isFlipped,
  onFlip,
  onAction,
  onDelete,
  onHide,
  onUnhide,
  isHiddenView
}: {
  contact: Contact;
  viewMode: "grid" | "list";
  searchQuery: string;
  isFlipped: boolean;
  onFlip: (e: React.MouseEvent) => void;
  onAction: (type: "deal" | "history", contact: Contact) => void;
  onDelete?: (id: string) => void;
  onHide?: (id: string) => void;
  onUnhide?: (id: string) => void;
  isHiddenView: boolean;
}) => {
  const initials = getUserInitials(contact.name, contact.email);
  const isRecipient = contact.role === "recipient";

  // List View
  if (viewMode === "list") {
    return (
      <motion.div
        variants={itemVariants}
        layout
        className="group relative"
      >
        <div
          className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer"
          onClick={() => onAction("deal", contact)}
        >
          <div className="h-12 w-12 rounded-xl bg-background border border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 flex items-center justify-center shrink-0 transition-colors shadow-sm font-semibold">
            {initials}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <h3 className="font-semibold text-foreground truncate">
                <HighlightText text={contact.name} query={searchQuery} />
              </h3>
              <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium border-0 bg-secondary/50 text-muted-foreground">
                {contact.role === "both" ? "Partner" : isRecipient ? "Recipient" : "Sender"}
              </Badge>
            </div>
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              {contact.email && (
                <div className="flex items-center gap-1.5 min-w-0">
                  <Mail className="h-3.5 w-3.5 shrink-0" />
                  <CopyableText text={contact.email} />
                </div>
              )}
              <span className="flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 shrink-0" />
                {contact.dealsCount} deal{contact.dealsCount !== 1 ? "s" : ""}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
             <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onAction("history", contact); }}>
                <History className="h-4 w-4" />
             </Button>
             {!isHiddenView && onHide && (
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onHide(contact.id); }}>
                  <EyeOff className="h-4 w-4" />
               </Button>
             )}
             {isHiddenView && onUnhide && (
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onUnhide(contact.id); }}>
                  <Eye className="h-4 w-4" />
               </Button>
             )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid View with Flip
  return (
    <motion.div
      variants={itemVariants}
      layout
      className="h-full perspective-1000"
    >
      <div className="relative h-full w-full" style={{ perspective: "1000px", minHeight: "240px" }}>

        {/* Front */}
        <motion.div
          className={cn(
            "h-full flex flex-col overflow-hidden bg-card border hover:border-primary/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative backface-hidden",
            isFlipped ? "pointer-events-none" : "pointer-events-auto"
          )}
          initial={false}
          animate={{
            rotateY: isFlipped ? 180 : 0,
            opacity: isFlipped ? 0 : 1
          }}
          transition={cardFlipTransition}
          style={{ backfaceVisibility: "hidden" }}
        >
          <div className="flex flex-col h-full">
            <div className="flex-1 p-5 pb-0 flex flex-col group cursor-pointer" onClick={() => onAction("deal", contact)}>

              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className="h-10 w-10 rounded-lg flex items-center justify-center transition-colors border shadow-sm bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20 font-semibold">
                  {initials}
                </div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium bg-background text-muted-foreground border-border/50">
                  {contact.role === "both" ? "Partner" : isRecipient ? "Recipient" : "Sender"}
                </Badge>
              </div>

              {/* Content */}
              <div className="mb-4">
                <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors truncate">
                  <HighlightText text={contact.name} query={searchQuery} />
                </h3>
                <div className="text-sm text-muted-foreground flex items-center gap-1.5 min-w-0 h-5">
                  <Mail className="h-3 w-3 shrink-0" />
                  {contact.email ? <CopyableText text={contact.email} /> : <span className="opacity-50">No email</span>}
                </div>
              </div>

              {/* Stats */}
              <div className="flex gap-2 mb-6">
                <Badge variant="secondary" className="text-[10px] px-2 py-1 font-normal bg-secondary/30 text-muted-foreground border border-transparent group-hover:border-border/50 transition-colors">
                  <History className="h-3 w-3 mr-1 opacity-70" />
                  {contact.dealsCount} Deals
                </Badge>
                {contact.lastDealDate && (
                  <Badge variant="secondary" className="text-[10px] px-2 py-1 font-normal bg-secondary/30 text-muted-foreground border border-transparent group-hover:border-border/50 transition-colors">
                    <Clock className="h-3 w-3 mr-1 opacity-70" />
                    {timeAgo(contact.lastDealDate)}
                  </Badge>
                )}
              </div>
            </div>

            {/* Footer Action Bar */}
            <div className={dashboardStyles.cardFooter}>
              <button
                onClick={() => onAction("deal", contact)}
                className="group/link flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors cursor-pointer"
              >
                Start Deal
              </button>

              <div className={dashboardStyles.cardFooterActions}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFlip(e); }}
                  title="View History"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>

                {!isHiddenView && onHide && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onHide(contact.id); }}
                    title="Hide Contact"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                  </Button>
                )}

                {isHiddenView && onUnhide && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onUnhide(contact.id); }}
                    title="Unhide Contact"
                  >
                    <Eye className="h-3.5 w-3.5" />
                  </Button>
                )}

                {contact.isCustom && onDelete && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground/60 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); onDelete(contact.id); }}
                    title="Delete Contact"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back (History) */}
        <motion.div
          className={cn(
            "h-full flex flex-col overflow-hidden bg-card border border-primary/20 rounded-2xl shadow-md absolute inset-0 backface-hidden",
            !isFlipped ? "pointer-events-none" : "pointer-events-auto"
          )}
          initial={{ rotateY: 180 }}
          animate={{
            rotateY: isFlipped ? 0 : -180,
            opacity: isFlipped ? 1 : 0
          }}
          transition={cardFlipTransition}
          style={{ backfaceVisibility: "hidden" }}
        >
          <CardContent className="p-5 flex flex-col h-full bg-secondary/5">
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-border/50">
              <h4 className="text-sm font-semibold flex items-center gap-2">
                <History className="h-3.5 w-3.5 text-primary" />
                History
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full -mr-2 text-muted-foreground hover:text-primary"
                onClick={(e) => { e.preventDefault(); onFlip(e); }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-2">
              {contact.recentDeals.length > 0 ? (
                contact.recentDeals.slice(0, 3).map((deal) => (
                  <div key={deal.id} className="flex flex-col gap-1 p-2 rounded-lg bg-background border border-border/50 text-xs shadow-sm">
                    <div className="flex justify-between items-start">
                      <span className="font-medium truncate pr-2">{deal.title}</span>
                      <span className={cn(
                        "px-1.5 py-0.5 rounded text-[9px] font-medium capitalize border",
                        deal.status === 'confirmed' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                        deal.status === 'voided' ? "bg-destructive/10 text-destructive border-destructive/20" :
                        "bg-amber-500/10 text-amber-600 border-amber-500/20"
                      )}>
                        {deal.status}
                      </span>
                    </div>
                    <span className="text-muted-foreground text-[10px]">
                      {formatDate(deal.createdAt)}
                    </span>
                  </div>
                ))
              ) : (
                <div className="flex flex-col items-center justify-center h-20 text-muted-foreground/50 text-xs italic">
                  No deals yet
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-border/40">
              <Button
                variant="ghost"
                size="sm"
                className="w-full h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
                onClick={() => onAction("history", contact)}
              >
                View Full History
                <ArrowRight className="h-3 w-3" />
              </Button>
            </div>
          </CardContent>
        </motion.div>
      </div>
    </motion.div>
  );
};

// --- MAIN PAGE ---

export default function PeoplePage() {
  const router = useRouter();
  const { deals: storeDeals, user } = useAppStore();

  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "recipient" | "creator">("all");
  const [showHidden, setShowHidden] = useState(false);
  const [sortOrder, setSortOrder] = useState<SortOption>("recent");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [showAddModal, setShowAddModal] = useState(false);
  const [newContact, setNewContact] = useState({ name: "", email: "" });
  const [customContacts, setCustomContacts] = useState<Contact[]>([]);
  const [hiddenContactIds, setHiddenContactIds] = useState<string[]>([]);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Keyboard shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "/" && document.activeElement !== searchInputRef.current) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Load persistence
  useEffect(() => {
    const savedContacts = localStorage.getItem("proofo-custom-contacts");
    const savedHidden = localStorage.getItem("proofo-hidden-contacts");

    if (savedContacts) {
      try { setCustomContacts(JSON.parse(savedContacts)); } catch (e) { console.error(e); }
    }
    if (savedHidden) {
      try { setHiddenContactIds(JSON.parse(savedHidden)); } catch (e) { console.error(e); }
    }
    setIsLoaded(true);
  }, []);

  // Save persistence - Only save if loaded to prevent overwriting with initial empty state
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("proofo-custom-contacts", JSON.stringify(customContacts));
      localStorage.setItem("proofo-hidden-contacts", JSON.stringify(hiddenContactIds));
    }
  }, [customContacts, hiddenContactIds, isLoaded]);

  // Data Logic
  const processedContacts = useMemo(() => {
    const contactMap = new Map<string, Contact>();

    // 1. Add Custom Contacts
    customContacts.forEach(c => {
      contactMap.set(c.id, { ...c, dealsCount: 0, recentDeals: [] });
    });

    // 2. Process Deals to find contacts
    storeDeals.forEach((deal) => {
      const userEmail = user?.email?.toLowerCase();
      const recipientEmail = deal.recipientEmail?.toLowerCase();

      // Case 1: I am the Creator -> Recipient is the contact
      if (deal.recipientName && deal.recipientName !== user?.name) {
        let key = recipientEmail ? `email-${recipientEmail}` : `name-${deal.recipientName}`;
        const customMatch = customContacts.find(c =>
          (recipientEmail && c.email?.toLowerCase() === recipientEmail) ||
          c.name === deal.recipientName
        );
        if (customMatch) key = customMatch.id;

        const existing = contactMap.get(key);
        if (existing) {
          existing.dealsCount++;
          if (!existing.lastDealDate || new Date(deal.createdAt) > new Date(existing.lastDealDate)) {
            existing.lastDealDate = deal.createdAt;
          }
          existing.recentDeals.push(deal);
        } else {
          contactMap.set(key, {
            id: key,
            name: deal.recipientName,
            email: deal.recipientEmail,
            dealsCount: 1,
            lastDealDate: deal.createdAt,
            role: "recipient",
            recentDeals: [deal]
          });
        }
      }

      // Case 2: I am the Recipient -> Creator is the contact
      if (deal.creatorName && deal.creatorId !== user?.id && recipientEmail === userEmail) {
        const key = `creator-${deal.creatorId}`;
        const existing = contactMap.get(key);

        if (existing) {
          existing.dealsCount++;
          if (existing.role === "recipient") existing.role = "both";
          if (!existing.lastDealDate || new Date(deal.createdAt) > new Date(existing.lastDealDate)) {
            existing.lastDealDate = deal.createdAt;
          }
          existing.recentDeals.push(deal);
        } else {
          contactMap.set(key, {
            id: key,
            name: deal.creatorName,
            dealsCount: 1, // Start with 1
            lastDealDate: deal.createdAt,
            role: "creator",
            recentDeals: [deal]
          });
        }
      }
    });

    // Filtering
    let result = Array.from(contactMap.values());

    // Filter Hidden - Mutually Exclusive Logic
    if (showHidden) {
      // Show ONLY hidden contacts
      result = result.filter(c => hiddenContactIds.includes(c.id));
    } else {
      // Show ONLY visible (non-hidden) contacts
      result = result.filter(c => !hiddenContactIds.includes(c.id));
    }

    // Search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(c => c.name.toLowerCase().includes(q) || c.email?.toLowerCase().includes(q));
    }

    // Role Filter
    if (roleFilter === "recipient") {
      result = result.filter(c => c.role === "recipient" || c.role === "both");
    } else if (roleFilter === "creator") {
      result = result.filter(c => c.role === "creator" || c.role === "both");
    }

    // Sort
    result.sort((a, b) => {
      if (sortOrder === "recent") {
        const dateA = a.lastDealDate ? new Date(a.lastDealDate).getTime() : 0;
        const dateB = b.lastDealDate ? new Date(b.lastDealDate).getTime() : 0;
        return dateB - dateA;
      } else if (sortOrder === "deals_count") {
        return b.dealsCount - a.dealsCount;
      } else if (sortOrder === "name_asc") {
        return a.name.localeCompare(b.name);
      } else {
        return b.name.localeCompare(a.name);
      }
    });

    // Sort deals within contacts
    result.forEach(c => {
      c.recentDeals.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    });

    return result;
  }, [storeDeals, user, customContacts, searchQuery, hiddenContactIds, roleFilter, showHidden, sortOrder]);

  const hasHiddenContacts = hiddenContactIds.length > 0;

  // Handlers
  const handleAddContact = () => {
    if (!newContact.name.trim()) return;
    const contact: Contact = {
      id: `custom-${Date.now()}`,
      name: newContact.name.trim(),
      email: newContact.email.trim() || undefined,
      dealsCount: 0,
      role: "recipient",
      isCustom: true,
      recentDeals: []
    };
    setCustomContacts(prev => [...prev, contact]);
    setNewContact({ name: "", email: "" });
    setShowAddModal(false);
  };

  const handleDeleteContact = (id: string) => {
    if (confirm("Delete this contact?")) {
      setCustomContacts(prev => prev.filter(c => c.id !== id));
    }
  };

  const handleHideContact = (id: string) => {
    setHiddenContactIds(prev => [...prev, id]);
  };

  const handleUnhideContact = (id: string) => {
    setHiddenContactIds(prev => prev.filter(hid => hid !== id));
  };

  const handleAction = (type: "deal" | "history", contact: Contact) => {
    if (type === "deal") {
      const params = new URLSearchParams();
      params.set("recipient", contact.name);
      if (contact.email) params.set("email", contact.email);
      router.push(`/deal/new?${params.toString()}`);
    } else {
      router.push(`/dashboard/agreements?search=${encodeURIComponent(contact.name)}`);
    }
  };

  return (
    <div className={dashboardStyles.pageContainer}>

      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>People</h1>
          <p className={dashboardStyles.pageDescription}>Manage your network and relationships</p>
        </div>

        <Button
          onClick={() => setShowAddModal(true)}
          variant="outline"
          size="sm"
          className="hidden sm:flex gap-1.5 rounded-xl shadow-sm border-border/60 hover:bg-secondary/50"
        >
          <UserPlus className={dashboardStyles.iconMd} />
          Add Contact
        </Button>
        <Button onClick={() => setShowAddModal(true)} size="icon" variant="outline" className="sm:hidden rounded-xl shadow-sm">
          <UserPlus className={dashboardStyles.iconMd} />
        </Button>
      </div>

      {/* Filter Toolbar - Sticky & Glassmorphic */}
      <div className={dashboardStyles.filterBar}>

        {/* Left: Search (Grows) */}
        <div className={dashboardStyles.searchInputContainer}>
          <Search className={dashboardStyles.searchIcon} />
          <Input
            ref={searchInputRef}
            placeholder="Search contacts... (Press '/')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={cn(dashboardStyles.searchInput, "pr-10")}
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:flex items-center pointer-events-none">
            <kbd className={dashboardStyles.keyboardHint}>
              <Command className="h-2 w-2 mr-1" />/
            </kbd>
          </div>
        </div>

        {/* Right: Controls (Fixed, No Overflow) */}
        <div className="flex items-center gap-2 shrink-0">

          {/* Middle: Role Filters (Scrollable on small screens) */}
          <div className={cn(dashboardStyles.toggleGroup, "items-center overflow-x-auto no-scrollbar max-w-[200px] sm:max-w-none")}>
            {["all", "recipient", "creator"].map((role) => (
              <button
                key={role}
                onClick={() => setRoleFilter(role as any)}
                className={cn(getFilterPillClass(roleFilter === role), "capitalize")}
              >
                {role === "creator" ? "Senders" : role === "recipient" ? "Recipients" : "All"}
              </button>
            ))}
          </div>

          <div className={dashboardStyles.divider} />

          {/* Hidden Toggle (Conditional - Placed separately as requested) */}
          {(hasHiddenContacts || showHidden) && (
            <>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="bg-secondary/50 p-1 rounded-xl">
                      <button
                        className={cn(
                          "flex items-center justify-center h-8 w-8 rounded-lg transition-all",
                          showHidden
                            ? "bg-background text-foreground shadow-sm ring-1 ring-border"
                            : "text-muted-foreground hover:text-foreground hover:bg-background/50"
                        )}
                        onClick={() => setShowHidden(!showHidden)}
                      >
                        {showHidden ? <Eye className={dashboardStyles.iconMd} /> : <EyeOff className={dashboardStyles.iconMd} />}
                      </button>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>
                    {showHidden ? "Show Active Contacts" : "Show Hidden Contacts"}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              <div className={dashboardStyles.divider} />
            </>
          )}

          {/* Right: Fixed Action Group (Sort, View) */}
          <div className={cn(dashboardStyles.toggleGroup, "gap-1 h-10 items-center")}>

            <SortMenu current={sortOrder} onChange={setSortOrder} />

            <div className="w-px h-4 bg-border/50 my-auto" />

            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode("grid")}
                className={getToggleButtonClass(viewMode === "grid")}
              >
                <LayoutGrid className={dashboardStyles.iconSm} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={getToggleButtonClass(viewMode === "list")}
              >
                <ListIcon className={dashboardStyles.iconSm} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 4))}
      >
        <AnimatePresence mode="popLayout">
          {processedContacts.length > 0 ? (
            processedContacts.map((contact) => (
              <ContactCard
                key={contact.id}
                contact={contact}
                viewMode={viewMode}
                searchQuery={searchQuery}
                isFlipped={flippedId === contact.id}
                onFlip={(e) => { e.preventDefault(); setFlippedId(flippedId === contact.id ? null : contact.id); }}
                onAction={handleAction}
                onDelete={contact.isCustom ? () => handleDeleteContact(contact.id) : undefined}
                onHide={() => handleHideContact(contact.id)}
                onUnhide={() => handleUnhideContact(contact.id)}
                isHiddenView={showHidden}
              />
            ))
          ) : (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(dashboardStyles.emptyState, "col-span-full")}
            >
              <div className={dashboardStyles.emptyStateIcon}>
                {showHidden ? <EyeOff className="h-8 w-8 text-muted-foreground/50" /> : <Users className="h-8 w-8 text-muted-foreground/50" />}
              </div>
              <h3 className={dashboardStyles.emptyStateTitle}>{showHidden ? "No hidden contacts" : "No contacts found"}</h3>
              <p className={dashboardStyles.emptyStateDescription}>
                {searchQuery
                  ? "Try adjusting your search terms."
                  : showHidden
                    ? "You haven't hidden any contacts."
                    : "Add people or create deals to see them here."}
              </p>
              {!showHidden && (
                <Button onClick={() => setShowAddModal(true)} className="rounded-xl">
                  <UserPlus className={cn(dashboardStyles.iconMd, "mr-2")} />
                  Add First Contact
                </Button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Add Contact Dialog */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Contact</DialogTitle>
            <DialogDescription>
              Create a contact to quickly start deals with them later.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g. John Doe"
                value={newContact.name}
                onChange={(e) => setNewContact({ ...newContact, name: e.target.value })}
                className="col-span-3 rounded-xl"
                autoFocus
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email <span className="text-muted-foreground font-normal">(Optional)</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="e.g. john@example.com"
                value={newContact.email}
                onChange={(e) => setNewContact({ ...newContact, email: e.target.value })}
                className="col-span-3 rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)} className="rounded-xl">Cancel</Button>
            <Button onClick={handleAddContact} disabled={!newContact.name.trim()} className="rounded-xl">Save Contact</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
}
