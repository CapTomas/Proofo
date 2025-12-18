"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
  LucideIcon,
  Filter,
  Type,
  Calendar,
  Hash,
  Eye,
  RotateCcw,
  Plus,
  Wrench,
  Copy,
  XCircle,
  FileText,
  Command,
} from "lucide-react";
import Link from "next/link";
import { dealTemplates } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { DealTemplate } from "@/types";
import { dashboardStyles, containerVariants, itemVariants, cardFlipTransition, getToggleButtonClass, getFilterPillClass, getGridClass } from "@/lib/dashboard-ui";
import { HighlightText, KeyboardHint } from "@/components/dashboard/shared-components";

// --- CONFIGURATION ---

const iconMap: Record<string, LucideIcon> = {
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
};

const fieldTypeIcons: Record<string, LucideIcon> = {
  text: Type,
  textarea: Type,
  currency: DollarSign,
  date: Calendar,
  number: Hash,
};

const CATEGORIES = ["All", "Financial", "Services", "Personal", "General"];

const templateMetadata: Record<string, { category: string }> = {
  "lend-item": { category: "Personal" },
  "simple-agreement": { category: "General" },
  "payment-promise": { category: "Financial" },
  "service-exchange": { category: "Services" },
  "custom": { category: "General" },
};

// HighlightText imported from shared-components

// --- COMPONENTS ---

interface TemplateCardProps {
  template: DealTemplate;
  viewMode: "grid" | "list";
  searchQuery: string;
  isExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
  isFlipped: boolean;
  onFlip: (e: React.MouseEvent) => void;
}

const TemplateCard = ({
  template,
  viewMode,
  searchQuery,
  isExpanded,
  onToggleExpand,
  isFlipped,
  onFlip
}: TemplateCardProps) => {
  const IconComponent = iconMap[template.icon] || PenLine;
  const meta = templateMetadata[template.id] || { category: "General" };
  const linkHref = `/deal/new?template=${template.id}`;

  if (viewMode === "list") {
    return (
      <motion.div
        variants={itemVariants}
        layout
        className="group relative"
      >
        <Link href={linkHref}>
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
            <div className={cn(
              "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors border shadow-sm",
              "bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20"
            )}>
              <IconComponent className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  <HighlightText text={template.name} query={searchQuery} />
                </h3>
                <Badge variant="secondary" className="text-[10px] h-5 px-1.5 font-medium border-0 bg-secondary/50 text-muted-foreground">
                  {meta.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                <HighlightText text={template.description} query={searchQuery} />
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 mr-4">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {(isExpanded ? template.fields : template.fields.slice(0, 3)).map((field: any) => {
                const FieldIcon = fieldTypeIcons[field.type] || Type;
                return (
                  <div key={field.id} className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/30 px-2 py-1.5 rounded-md border border-transparent group-hover:border-border/50 transition-colors h-7">
                    <FieldIcon className="h-3 w-3 opacity-70" />
                    <span>{field.label}</span>
                  </div>
                );
              })}
              {!isExpanded && template.fields.length > 3 && (
                <button
                  onClick={(e) => { e.preventDefault(); onToggleExpand(e); }}
                  className="text-[10px] px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium h-7 flex items-center"
                >
                  +{template.fields.length - 3}
                </button>
              )}
            </div>

            <div className="flex gap-1">
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                  <Eye className="h-4 w-4" />
               </Button>
               <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground">
                  <Copy className="h-4 w-4" />
               </Button>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Grid View with Flip Interaction
  return (
    <motion.div
      variants={itemVariants}
      layout
      className="h-full perspective-1000"
    >
      <div className="relative h-full w-full" style={{ perspective: "1000px" }}>

        {/* Front of Card */}
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
            <Link href={linkHref} className="flex-1 p-5 pb-0 flex flex-col group">
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center transition-colors border shadow-sm",
                  "bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20"
                )}>
                  <IconComponent className="h-5 w-5" />
                </div>
                <Badge variant="outline" className="text-[10px] h-5 px-1.5 font-medium bg-background text-muted-foreground border-border/50">
                  {meta.category}
                </Badge>
              </div>

              {/* Content - Fixed height for alignment */}
              <div className="mb-6 min-h-[4.5rem]">
                <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">
                  <HighlightText text={template.name} query={searchQuery} />
                </h3>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  <HighlightText text={template.description} query={searchQuery} />
                </p>
              </div>

              {/* Field Tags (Clickable +1) */}
              <div className="flex flex-wrap gap-1.5 mb-6 content-start flex-1 items-start">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(isExpanded ? template.fields : template.fields.slice(0, 3)).map((field: any) => {
                  const FieldIcon = fieldTypeIcons[field.type] || Type;
                  return (
                    <motion.div
                      layout
                      key={field.id}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                    >
                      <Badge
                        variant="secondary"
                        className="text-[10px] px-1.5 py-0.5 font-normal bg-secondary/30 text-muted-foreground border border-transparent group-hover:border-border/50 transition-colors h-6 flex items-center"
                      >
                        <FieldIcon className="h-3 w-3 mr-1 opacity-70" />
                        {field.label}
                      </Badge>
                    </motion.div>
                  );
                })}
                {!isExpanded && template.fields.length > 3 && (
                  <motion.div layout>
                    <Badge
                      variant="outline"
                      className="text-[10px] px-1.5 py-0.5 font-normal text-muted-foreground border-dashed cursor-pointer hover:bg-secondary hover:text-foreground transition-colors h-6 flex items-center"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); onToggleExpand(e); }}
                    >
                      +{template.fields.length - 3}
                    </Badge>
                  </motion.div>
                )}
              </div>
            </Link>

            {/* Footer Action Bar */}
            <div className={dashboardStyles.cardFooter}>
              <Link href={linkHref} className="group/link flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors">
                Use Template
              </Link>

              <div className={dashboardStyles.cardFooterActions}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); onFlip(e); }}
                  title="Preview Template"
                >
                  <Eye className="h-3.5 w-3.5" />
                </Button>
                <Link href={linkHref}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
                    title="Duplicate / Edit"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground/40 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors cursor-not-allowed opacity-50"
                  disabled
                  title="Void Template (Disabled for defaults)"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Back of Card (Preview) */}
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
                <FileText className="h-3.5 w-3.5 text-primary" />
                Included Fields
              </h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full -mr-2 text-muted-foreground hover:text-primary"
                onClick={(e) => { e.preventDefault(); onFlip(e); }}
              >
                <RotateCcw className="h-3.5 w-3.5" />
              </Button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar -mr-2 pr-2 space-y-2">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {template.fields.map((field: any) => {
                const FieldIcon = fieldTypeIcons[field.type] || Type;
                return (
                  <div key={field.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-background border border-border/50 shadow-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <FieldIcon className="h-3.5 w-3.5 opacity-70" />
                      <span>{field.label}</span>
                    </div>
                    {field.required && <span className="text-[9px] text-destructive font-medium bg-destructive/5 px-1.5 py-0.5 rounded-md border border-destructive/10">Req</span>}
                  </div>
                );
              })}
            </div>

            <div className="mt-auto pt-4 border-t border-border/40">
              <Link href={linkHref} className="group/link flex items-center justify-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors w-full py-1">
                Use Template
              </Link>
            </div>
          </CardContent>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [flippedId, setFlippedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // QoL: Keyboard shortcut to focus search
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

  const filteredTemplates = useMemo(() => {
    return dealTemplates
      .filter(t => t.id !== "custom")
      .filter((template) => {
        const matchesSearch =
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase());

        const meta = templateMetadata[template.id];
        const matchesCategory = selectedCategory === "All" || (meta && meta.category === selectedCategory);

        return matchesSearch && matchesCategory;
      });
  }, [searchQuery, selectedCategory]);

  return (
    <div className={dashboardStyles.pageContainer}>

      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>Templates</h1>
          <p className={dashboardStyles.pageDescription}>Jumpstart your agreements with battle-tested patterns</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={dashboardStyles.filterBar}>
        <div className={dashboardStyles.searchInputContainer}>
          <Search className={dashboardStyles.searchIcon} />
          <Input
            ref={searchInputRef}
            placeholder="Search templates... (Press '/')"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={dashboardStyles.searchInput}
          />
          <KeyboardHint />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-2 sm:pb-0 no-scrollbar">
          <div className={cn(dashboardStyles.toggleGroup, "items-center")}>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={getFilterPillClass(selectedCategory === category)}
              >
                {category}
              </button>
            ))}
          </div>

          <div className={dashboardStyles.divider} />

          <div className={dashboardStyles.toggleGroup}>
            <button
              onClick={() => setViewMode("grid")}
              className={getToggleButtonClass(viewMode === "grid")}
            >
              <LayoutGrid className={dashboardStyles.iconMd} />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={getToggleButtonClass(viewMode === "list")}
            >
              <ListIcon className={dashboardStyles.iconMd} />
            </button>
          </div>
        </div>
      </div>

      {/* Templates Grid/List */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 4))}
      >
        <AnimatePresence mode="popLayout">
          {filteredTemplates.length > 0 ? (
            filteredTemplates.map((template, index) => (
              <TemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                searchQuery={searchQuery}
                isExpanded={expandedId === template.id}
                onToggleExpand={(e) => { e.preventDefault(); setExpandedId(expandedId === template.id ? null : template.id); }}
                isFlipped={flippedId === template.id}
                onFlip={(e) => { e.preventDefault(); setFlippedId(flippedId === template.id ? null : template.id); }}
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
                <Filter className="h-8 w-8 text-muted-foreground/50" />
              </div>
              <h3 className={dashboardStyles.emptyStateTitle}>No templates found</h3>
              <p className={dashboardStyles.emptyStateDescription}>
                Try adjusting your search or category filter.
              </p>
              <Button
                variant="outline"
                onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
              >
                Clear Filters
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Create Custom Template Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Link href="/deal/new?template=custom" className="block group">
          <div className="border-2 border-dashed border-border hover:border-primary/30 rounded-2xl p-8 text-center bg-muted/5 hover:bg-muted/30 transition-all duration-300 relative overflow-hidden">
            <div className="relative z-10">
              <div className="h-14 w-14 rounded-2xl bg-background border shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/20">
                <Wrench className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
              </div>
              <h3 className="text-xl font-semibold mb-2 group-hover:text-primary transition-colors">Create Custom Template</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">
                Build a reusable template from scratch with your own fields, terms, and logic.
              </p>
              <div className="inline-flex items-center gap-2 text-sm font-medium bg-primary text-primary-foreground px-4 py-2 rounded-xl shadow-sm group-hover:shadow-md transition-all">
                <Plus className="h-4 w-4" />
                Create New
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
