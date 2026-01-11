"use client";

import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Search,
  LayoutGrid,
  List as ListIcon,
  DollarSign,
  PenLine,
  LucideIcon,
  Filter,
  Type,
  Calendar,
  Hash,
  Plus,
  Wrench,
  Copy,
  LayoutTemplate,
  Trash2,
  Edit,
  Loader2,
  User,
} from "lucide-react";
import Link from "next/link";
import { usePersistence } from "@/hooks/usePersistence";
import { dealTemplates, iconMap } from "@/lib/templates";
import { DealTemplate, TemplateField, UserTemplate, TemplateTheme } from "@/types";
import { cn } from "@/lib/utils";
import {
  dashboardStyles,
  containerVariants,
  itemVariants,
  getToggleButtonClass,
  getFilterPillClass,
  getGridClass,
} from "@/lib/dashboard-ui";
import { HighlightText, KeyboardHint } from "@/components/dashboard/shared-components";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CreateTemplateModal } from "@/components/create-template-modal";
import { getUserTemplatesAction, deleteTemplateAction } from "@/app/actions/template-actions";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// --- CONFIGURATION ---

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
  custom: { category: "General" },
};

// HighlightText imported from shared-components

// --- COMPONENTS ---

interface TemplateCardProps {
  template: DealTemplate;
  viewMode: "grid" | "list";
  searchQuery: string;
  isExpanded: boolean;
  onToggleExpand: (e: React.MouseEvent) => void;
  onDuplicate: () => void;
}

const TemplateCard = ({
  template,
  viewMode,
  searchQuery,
  isExpanded,
  onToggleExpand,
  onDuplicate,
}: TemplateCardProps) => {
  const IconComponent = iconMap[template.icon] || PenLine;
  const meta = templateMetadata[template.id] || { category: "General" };
  const linkHref = `/deal/new?template=${template.id}`;

  if (viewMode === "list") {
    return (
      <motion.div variants={itemVariants} layout className="group relative">
        <Link href={linkHref}>
          <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer">
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors border shadow-sm",
                "bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20"
              )}
            >
              <IconComponent className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  <HighlightText text={template.name} query={searchQuery} />
                </h3>
                <Badge
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5 font-medium border-0 bg-secondary/50 text-muted-foreground"
                >
                  {meta.category}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                <HighlightText text={template.description} query={searchQuery} />
              </p>
            </div>

            <div className="hidden sm:flex items-center gap-2 mr-4">
              {(isExpanded ? template.fields : template.fields.slice(0, 3)).map(
                (field: TemplateField) => {
                  const FieldIcon = fieldTypeIcons[field.type] || Type;
                  return (
                    <div
                      key={field.id}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/30 px-2 py-1.5 rounded-md border border-transparent group-hover:border-border/50 transition-colors h-7"
                    >
                      <FieldIcon className="h-3 w-3 opacity-70" />
                      <span>{field.label}</span>
                    </div>
                  );
                }
              )}
              {!isExpanded && template.fields.length > 3 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleExpand(e);
                  }}
                  className="text-[10px] px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium h-7 flex items-center"
                >
                  +{template.fields.length - 3}
                </button>
              )}
            </div>

            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onDuplicate();
                }}
                title="Duplicate Template"
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Link>
      </motion.div>
    );
  }

  // Grid View
  return (
    <motion.div variants={itemVariants} layout className="h-full">
      <div
        className="group h-full flex flex-col overflow-hidden bg-card border hover:border-primary/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative cursor-pointer"
        onClick={() => window.location.href = linkHref}
        tabIndex={0}
        role="button"
        aria-label={`Select ${template.name} template`}
        onKeyDown={(e) => e.key === "Enter" && (window.location.href = linkHref)}
      >
        <div className="flex flex-col h-full">
          <Link href={linkHref} className="flex-1 p-5 pb-0 flex flex-col">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
              <div
                className={cn(
                  "h-10 w-10 rounded-lg flex items-center justify-center transition-colors border shadow-sm",
                  "bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20"
                )}
              >
                <IconComponent className="h-5 w-5" />
              </div>
              <Badge
                variant="outline"
                className="text-[10px] h-5 px-1.5 font-medium bg-background text-muted-foreground border-border/50"
              >
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

            {/* Field Tags */}
            <div className="flex flex-wrap gap-1.5 mb-6 content-start flex-1 items-start">
              {(isExpanded ? template.fields : template.fields.slice(0, 3)).map(
                (field: TemplateField) => (
                  <Badge
                    key={field.id}
                    variant="secondary"
                    className="text-[10px] px-1.5 py-0.5 font-normal bg-secondary/30 text-muted-foreground border border-transparent group-hover:border-border/50 transition-colors h-6 flex items-center"
                  >
                    {field.label}
                  </Badge>
                )
              )}
              {!isExpanded && template.fields.length > 3 && (
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0.5 font-normal text-muted-foreground border-dashed cursor-pointer hover:bg-secondary hover:text-foreground transition-colors h-6 flex items-center"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onToggleExpand(e);
                  }}
                >
                  +{template.fields.length - 3}
                </Badge>
              )}
            </div>
          </Link>

          {/* Footer Action Bar */}
          <div className={dashboardStyles.cardFooter}>
            <span className="text-xs font-medium text-muted-foreground group-hover:text-primary transition-colors">
              Use Template
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDuplicate();
              }}
              title="Duplicate Template"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [viewMode, setViewMode] = usePersistence<"grid" | "list">("proofo-view-mode-templates", "grid");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // User templates state
  const [userTemplates, setUserTemplates] = useState<UserTemplate[]>([]);
  const [isLoadingUserTemplates, setIsLoadingUserTemplates] = useState(true);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editTemplate, setEditTemplate] = useState<UserTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<UserTemplate | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedUserTemplates, setExpandedUserTemplates] = useState<Record<string, boolean>>({});
  const [duplicateTemplate, setDuplicateTemplate] = useState<{
    name: string;
    description?: string;
    icon: string;
    theme: TemplateTheme;
    fields: TemplateField[];
  } | null>(null);

  // Fetch user templates on mount
  useEffect(() => {
    const fetchUserTemplates = async () => {
      setIsLoadingUserTemplates(true);
      try {
        const { templates, error } = await getUserTemplatesAction();
        if (!error) {
          setUserTemplates(templates);
        }
      } catch {
        // Silently fail - user may not be authenticated
      } finally {
        setIsLoadingUserTemplates(false);
      }
    };
    fetchUserTemplates();
  }, []);

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

  // Handle template creation/update success
  const handleTemplateSuccess = useCallback((template: UserTemplate) => {
    setUserTemplates((prev) => {
      const exists = prev.find((t) => t.id === template.id);
      if (exists) {
        return prev.map((t) => (t.id === template.id ? template : t));
      }
      return [template, ...prev];
    });
    setEditTemplate(null);
    setDuplicateTemplate(null);
  }, []);

  // Handle template delete
  const handleDeleteTemplate = useCallback(async () => {
    if (!templateToDelete) return;
    setIsDeleting(true);
    try {
      const { success, error } = await deleteTemplateAction(templateToDelete.id);
      if (success) {
        setUserTemplates((prev) => prev.filter((t) => t.id !== templateToDelete.id));
        toast.success("Template deleted");
      } else {
        toast.error(error || "Failed to delete template");
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    }
  }, [templateToDelete]);

  // Filter built-in templates
  const filteredBuiltInTemplates = useMemo(() => {
    return dealTemplates
      .filter((t) => t.id !== "custom")
      .filter((template) => {
        const matchesSearch =
          template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          template.description.toLowerCase().includes(searchQuery.toLowerCase());

        const meta = templateMetadata[template.id];
        const matchesCategory =
          selectedCategory === "All" || (meta && meta.category === selectedCategory);

        return matchesSearch && matchesCategory;
      });
  }, [searchQuery, selectedCategory]);

  // Filter user templates - show on All, Custom, or matching theme categories
  const filteredUserTemplates = useMemo(() => {
    return userTemplates.filter((template) => {
      const matchesSearch =
        template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (template.description || "").toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      // Show on All, Custom, or matching theme category
      if (selectedCategory === "All" || selectedCategory === "Custom") return true;

      // Match theme to category (case-insensitive)
      const templateTheme = (template.theme || "general").toLowerCase();
      return templateTheme === selectedCategory.toLowerCase();
    });
  }, [userTemplates, searchQuery, selectedCategory]);

  // Categories with "Custom" if user has any
  const categories = useMemo(() => {
    if (userTemplates.length > 0) {
      return ["All", "Custom", ...CATEGORIES.slice(1)];
    }
    return CATEGORIES;
  }, [userTemplates.length]);

  return (
    <div className={dashboardStyles.pageContainer}>
      {/* Header */}
      <div className={dashboardStyles.pageHeader}>
        <div className="min-w-0">
          <h1 className={dashboardStyles.pageTitle}>Templates</h1>
          <p className={dashboardStyles.pageDescription}>
            Jumpstart your agreements with battle-tested patterns
          </p>
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
            {categories.map((category) => (
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

      {/* User Templates Section */}
      {(filteredUserTemplates.length > 0 || selectedCategory === "All") && selectedCategory !== "Custom" && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
              Custom Templates
            </h2>
            <Badge variant="secondary" className="text-xs">
              {filteredUserTemplates.length}
            </Badge>
          </div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 4))}
          >
            {filteredUserTemplates.map((template) => (
              <UserTemplateCard
                key={template.id}
                template={template}
                viewMode={viewMode}
                searchQuery={searchQuery}
                onEdit={() => {
                  setEditTemplate(template);
                  setCreateModalOpen(true);
                }}
                onDelete={() => {
                  setTemplateToDelete(template);
                  setDeleteDialogOpen(true);
                }}
                onDuplicate={() => {
                  setDuplicateTemplate({
                    name: template.name,
                    description: template.description,
                    icon: template.icon,
                    theme: template.theme || "general",
                    fields: template.fields,
                  });
                  setCreateModalOpen(true);
                }}
                isExpanded={!!expandedUserTemplates[template.id]}
                onToggleExpand={() => setExpandedUserTemplates(prev => ({ ...prev, [template.id]: !prev[template.id] }))}
              />
            ))}
            {/* Integrated Create Card */}
            {viewMode === "grid" && (
              <CreateTemplateCard onClick={() => setCreateModalOpen(true)} />
            )}
          </motion.div>
        </div>
      )}

      {/* Only Custom Templates - Full Grid */}
      {selectedCategory === "Custom" && (
        <AnimatePresence mode="popLayout">
          <motion.div
            key={`custom-templates-${searchQuery}-${viewMode}`}
            variants={containerVariants}
            initial="hidden"
            animate="show"
            layout
            className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 4))}
          >
            {filteredUserTemplates.length > 0 ? (
              filteredUserTemplates.map((template) => (
                <UserTemplateCard
                  key={template.id}
                  template={template}
                  viewMode={viewMode}
                  searchQuery={searchQuery}
                  onEdit={() => {
                    setEditTemplate(template);
                    setCreateModalOpen(true);
                  }}
                  onDelete={() => {
                    setTemplateToDelete(template);
                    setDeleteDialogOpen(true);
                  }}
                  onDuplicate={() => {
                    setDuplicateTemplate({
                      name: template.name,
                      description: template.description,
                      icon: template.icon,
                      theme: template.theme || "general",
                      fields: template.fields,
                    });
                    setCreateModalOpen(true);
                  }}
                  isExpanded={!!expandedUserTemplates[template.id]}
                  onToggleExpand={() => setExpandedUserTemplates(prev => ({ ...prev, [template.id]: !prev[template.id] }))}
                />
              ))
            ) : (
              <EmptyState
                icon={LayoutTemplate}
                title="No custom templates yet"
                description="Create your first template to get started."
                action={
                  <Button onClick={() => setCreateModalOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Template
                  </Button>
                }
                className="col-span-full"
              />
            )}
            {/* Integrated Create Card for Custom Filter */}
            {filteredUserTemplates.length > 0 && viewMode === "grid" && (
              <CreateTemplateCard onClick={() => setCreateModalOpen(true)} />
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {/* Built-in Templates Section */}
      {selectedCategory !== "Custom" && (
        <>
          {selectedCategory === "All" && (
            <div className="flex items-center gap-2 mb-4">
              <LayoutTemplate className="h-4 w-4 text-muted-foreground" />
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                Default Templates
              </h2>
            </div>
          )}
          <AnimatePresence mode="popLayout">
            <motion.div
              key={`${selectedCategory}-${searchQuery}-${viewMode}`}
              variants={containerVariants}
              initial="hidden"
              animate="show"
              layout
              className={cn(dashboardStyles.gridContainer, getGridClass(viewMode, 4))}
            >
              {filteredBuiltInTemplates.length > 0 ? (
                filteredBuiltInTemplates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    viewMode={viewMode}
                    searchQuery={searchQuery}
                    isExpanded={expandedId === template.id}
                    onToggleExpand={(e) => {
                      e.preventDefault();
                      setExpandedId(expandedId === template.id ? null : template.id);
                    }}
                    onDuplicate={() => {
                      const meta = templateMetadata[template.id] || { category: "General" };
                      setDuplicateTemplate({
                        name: template.name,
                        description: template.description,
                        icon: template.icon,
                        theme: meta.category.toLowerCase() as TemplateTheme,
                        fields: template.fields,
                      });
                      setCreateModalOpen(true);
                    }}
                  />
                ))
              ) : (
                <EmptyState
                  icon={Filter}
                  title="No templates found"
                  description="Try adjusting your search or category filter."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSearchQuery("");
                        setSelectedCategory("All");
                      }}
                    >
                      Clear Filters
                    </Button>
                  }
                  className="col-span-full"
                />
              )}
            </motion.div>
          </AnimatePresence>
        </>
      )}

      {/* Verification for spacing: integrated into grid above */}

      {/* Create/Edit/Duplicate Template Modal */}
      <CreateTemplateModal
        open={createModalOpen}
        onOpenChange={(open) => {
          setCreateModalOpen(open);
          if (!open) {
            setEditTemplate(null);
            setDuplicateTemplate(null);
          }
        }}
        onSuccess={handleTemplateSuccess}
        editTemplate={editTemplate}
        duplicateTemplate={duplicateTemplate}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Template</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{templateToDelete?.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTemplate}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// User Template Card Component
interface UserTemplateCardProps {
  template: UserTemplate;
  viewMode: "grid" | "list";
  searchQuery: string;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

const UserTemplateCard = ({
  template,
  viewMode,
  searchQuery,
  onEdit,
  onDelete,
  onDuplicate,
  isExpanded = false,
  onToggleExpand,
}: UserTemplateCardProps) => {
  const IconComponent = iconMap[template.icon] || PenLine;
  const linkHref = `/deal/new?template=user:${template.id}`;

  if (viewMode === "list") {
    return (
      <motion.div
        variants={itemVariants}
        initial="hidden"
        animate="show"
        layout
        className="group relative"
      >
        <div className="flex items-center gap-4 p-4 rounded-xl border bg-card hover:bg-muted/40 hover:border-primary/20 transition-all duration-200 shadow-sm hover:shadow-md">
          <Link href={linkHref} className="flex items-center gap-4 flex-1 min-w-0">
            <div
              className={cn(
                "h-12 w-12 rounded-xl flex items-center justify-center shrink-0 transition-colors border shadow-sm",
                "bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20"
              )}
            >
              <IconComponent className="h-5 w-5" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-semibold text-foreground truncate">
                  <HighlightText text={template.name} query={searchQuery} />
                </h3>
                <Badge
                  variant="secondary"
                  className="text-[10px] h-5 px-1.5 font-medium border border-border/50 bg-background text-muted-foreground capitalize"
                >
                  {template.theme || "general"}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground truncate">
                <HighlightText text={template.description || "No description"} query={searchQuery} />
              </p>
            </div>
          </Link>

            <div className="hidden sm:flex items-center gap-2 mr-4">
              {(isExpanded ? template.fields : template.fields.slice(0, 3)).map(
                (field: TemplateField) => {
                  const FieldIcon = fieldTypeIcons[field.type] || Type;
                  return (
                    <div
                      key={field.id}
                      className="flex items-center gap-1 text-[10px] text-muted-foreground bg-secondary/30 px-2 py-1.5 rounded-md border border-transparent group-hover:border-border/50 transition-colors h-7"
                    >
                      <FieldIcon className="h-3 w-3 opacity-70" />
                      <span>{field.label}</span>
                    </div>
                  );
                }
              )}
              {!isExpanded && template.fields.length > 3 && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    onToggleExpand?.();
                  }}
                  className="text-[10px] px-2 py-1 rounded-md bg-secondary/50 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors font-medium h-7 flex items-center"
                >
                  +{template.fields.length - 3}
                </button>
              )}
            </div>

          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={onDuplicate}
              title="Duplicate Template"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
              onClick={onEdit}
            >
              <Edit className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </motion.div>
    );
  }

  // Grid View - Match default template card structure exactly
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
      layout
      className="h-full"
    >
      <div className="h-full flex flex-col overflow-hidden bg-card border hover:border-primary/30 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 relative group">
        <Link href={linkHref} className="flex-1 p-5 pb-0 flex flex-col">
          {/* Header */}
          <div className="flex justify-between items-start mb-4">
            <div
              className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center transition-colors border shadow-sm",
                "bg-background border-border/50 text-muted-foreground group-hover:text-foreground group-hover:border-primary/20"
              )}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <Badge
              variant="outline"
              className="text-[10px] h-5 px-1.5 font-medium bg-background text-muted-foreground border-border/50 capitalize"
            >
              {template.theme || "general"}
            </Badge>
          </div>

          {/* Content - Match default template height exactly */}
          <div className="mb-6 min-h-[4.5rem]">
            <h3 className="font-semibold text-base mb-1 group-hover:text-primary transition-colors line-clamp-1">
              <HighlightText text={template.name} query={searchQuery} />
            </h3>
            <p className="text-sm text-muted-foreground line-clamp-2">
              <HighlightText text={template.description || "No description"} query={searchQuery} />
            </p>
          </div>

          {/* Field Tags - with expandable badge */}
          <div className="flex flex-wrap gap-1.5 mb-6 content-start flex-1 items-start">
            {(isExpanded ? template.fields : template.fields.slice(0, 3)).map((field: TemplateField) => (
              <Badge
                key={field.id}
                variant="secondary"
                className="text-[10px] px-1.5 py-0.5 font-normal bg-secondary/30 text-muted-foreground border border-transparent group-hover:border-border/50 transition-colors h-6 flex items-center"
              >
                {field.label}
              </Badge>
            ))}
            {!isExpanded && template.fields.length > 3 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0.5 font-normal text-muted-foreground border-dashed h-6 flex items-center cursor-pointer hover:bg-secondary hover:text-foreground transition-colors"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onToggleExpand?.();
                }}
              >
                +{template.fields.length - 3}
              </Badge>
            )}
          </div>
        </Link>

        {/* Footer Action Bar */}
        <div className={dashboardStyles.cardFooter}>
          <Link
            href={linkHref}
            className="group/link flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-primary transition-colors"
          >
            Use Template
          </Link>

          <div className={dashboardStyles.cardFooterActions}>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-lg transition-colors"
              onClick={onDuplicate}
              title="Duplicate Template"
            >
              <Copy className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
              onClick={onEdit}
              title="Edit Template"
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors"
              onClick={onDelete}
              title="Delete Template"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// Integrated "Create New" Card Component
const CreateTemplateCard = ({ onClick }: { onClick: () => void }) => {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="show"
      className="h-full"
    >
      <button
        onClick={onClick}
        className="h-full w-full group text-left transition-all duration-300 cursor-pointer"
      >
        <div className="h-full min-h-[280px] border-2 border-dashed border-border group-hover:border-primary/30 rounded-2xl p-6 flex flex-col items-center justify-center text-center bg-muted/5 group-hover:bg-muted/10 transition-all duration-300 relative overflow-hidden">
          <div className="relative z-10">
            <div className="h-14 w-14 rounded-2xl bg-background border shadow-sm flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300 group-hover:border-primary/20">
              <Wrench className="h-7 w-7 text-muted-foreground group-hover:text-primary transition-colors" />
            </div>
            <h3 className="text-lg font-semibold mb-2 group-hover:text-primary transition-colors">
              New Template
            </h3>
            <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mb-6">
              Build a reusable pattern from scratch.
            </p>
            <div className="inline-flex items-center gap-2 text-xs font-medium bg-secondary text-foreground px-3 py-1.5 rounded-lg border border-border/50 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-all">
              <Plus className="h-3.5 w-3.5" />
              Start Building
            </div>
          </div>
        </div>
      </button>
    </motion.div>
  );
};
