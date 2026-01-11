"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Type,
  Hash,
  Calendar,
  DollarSign,
  AlignLeft,
  Loader2,
  AlertCircle,
  FileText,
  LayoutTemplate,
  Handshake,
  Package,
  ArrowLeftRight,
  PenLine,
  LucideIcon,
  ShieldCheck,
  Home,
  Car,
  Briefcase,
  Gift,
  Users,
  Heart,
  Star,
  Clock,
  Zap,
  Shield,
  Key,
  CreditCard,
  Building2,
  ShoppingBag,
  Laptop,
  Smartphone,
  Camera,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TemplateField, UserTemplate, TemplateTheme } from "@/types";
import { createTemplateAction, updateTemplateAction } from "@/app/actions/template-actions";
import { toast } from "sonner";
import { nanoid } from "nanoid";

// Icon options for templates - expanded list
const ICON_OPTIONS: { value: string; label: string; icon: LucideIcon }[] = [
  { value: "file-text", label: "Document", icon: FileText },
  { value: "Handshake", label: "Handshake", icon: Handshake },
  { value: "Package", label: "Package", icon: Package },
  { value: "DollarSign", label: "Money", icon: DollarSign },
  { value: "ArrowLeftRight", label: "Exchange", icon: ArrowLeftRight },
  { value: "PenLine", label: "Custom", icon: PenLine },
  { value: "ShieldCheck", label: "Verified", icon: ShieldCheck },
  { value: "Home", label: "Home", icon: Home },
  { value: "Car", label: "Vehicle", icon: Car },
  { value: "Briefcase", label: "Business", icon: Briefcase },
  { value: "Gift", label: "Gift", icon: Gift },
  { value: "Users", label: "People", icon: Users },
  { value: "Heart", label: "Personal", icon: Heart },
  { value: "Star", label: "Featured", icon: Star },
  { value: "Clock", label: "Schedule", icon: Clock },
  { value: "Zap", label: "Quick", icon: Zap },
  { value: "Shield", label: "Protection", icon: Shield },
  { value: "Key", label: "Access", icon: Key },
  { value: "CreditCard", label: "Payment", icon: CreditCard },
  { value: "Building2", label: "Property", icon: Building2 },
  { value: "ShoppingBag", label: "Shopping", icon: ShoppingBag },
  { value: "Laptop", label: "Tech", icon: Laptop },
  { value: "Smartphone", label: "Mobile", icon: Smartphone },
  { value: "Camera", label: "Media", icon: Camera },
];

// Theme options
const THEME_OPTIONS: { value: TemplateTheme; label: string }[] = [
  { value: "financial", label: "Financial" },
  { value: "services", label: "Services" },
  { value: "personal", label: "Personal" },
  { value: "general", label: "General" },
];

// Field type options
const FIELD_TYPES: { value: TemplateField["type"]; label: string; icon: LucideIcon }[] = [
  { value: "text", label: "Text", icon: Type },
  { value: "textarea", label: "Long Text", icon: AlignLeft },
  { value: "number", label: "Number", icon: Hash },
  { value: "currency", label: "Currency", icon: DollarSign },
  { value: "date", label: "Date", icon: Calendar },
];

interface CreateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (template: UserTemplate) => void;
  editTemplate?: UserTemplate | null;
  duplicateTemplate?: {
    name: string;
    description?: string;
    icon: string;
    theme: TemplateTheme;
    fields: TemplateField[];
  } | null;
}

export function CreateTemplateModal({
  open,
  onOpenChange,
  onSuccess,
  editTemplate,
  duplicateTemplate,
}: CreateTemplateModalProps) {
  const isEditing = !!editTemplate;
  const isDuplicating = !!duplicateTemplate;
  const sourceTemplate = editTemplate || duplicateTemplate;

  // Form state
  const [name, setName] = useState(sourceTemplate?.name || "");
  const [description, setDescription] = useState(sourceTemplate?.description || "");
  const [icon, setIcon] = useState(sourceTemplate?.icon || "file-text");
  const [theme, setTheme] = useState<TemplateTheme>(
    (editTemplate?.theme || duplicateTemplate?.theme) || "general"
  );
  const [fields, setFields] = useState<TemplateField[]>(
    sourceTemplate?.fields || [
      { id: nanoid(8), label: "", type: "text", placeholder: "", required: true },
    ]
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastAddedId, setLastAddedId] = useState<string | null>(null);
  const fieldsEndRef = useRef<HTMLDivElement>(null);

  // Reset form when modal opens/closes
  const resetForm = useCallback(() => {
    const source = editTemplate || duplicateTemplate;
    if (source) {
      setName(isDuplicating ? `Copy of ${source.name}` : source.name);
      setDescription(source.description || "");
      setIcon(source.icon);
      setTheme((editTemplate?.theme || duplicateTemplate?.theme) || "general");
      // For editing, keep original IDs. For duplicating, create new IDs
      if (isDuplicating) {
        setFields(source.fields.map(f => ({ ...f, id: nanoid(8) })));
      } else {
        setFields(source.fields);
      }
    } else {
      setName("");
      setDescription("");
      setIcon("file-text");
      setTheme("general");
      setFields([{ id: nanoid(8), label: "", type: "text", placeholder: "", required: true }]);
    }
    setError(null);
  }, [editTemplate, duplicateTemplate, isDuplicating]);

  // Sync form state when modal opens or source template changes
  useEffect(() => {
    if (open) {
      resetForm();
    }
  }, [open, editTemplate, duplicateTemplate, resetForm]);

  // Add new field with auto-scroll and auto-focus
  const addField = () => {
    if (fields.length >= 20) {
      toast.error("Maximum 20 fields allowed");
      return;
    }
    const newId = nanoid(8);
    setLastAddedId(newId);
    setFields([
      ...fields,
      { id: newId, label: "", type: "text", placeholder: "", required: false },
    ]);
    // Auto-scroll to the new field after render
    setTimeout(() => {
      fieldsEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
    }, 100);
  };

  // Remove field
  const removeField = (id: string) => {
    if (fields.length <= 1) {
      toast.error("At least one field is required");
      return;
    }
    setFields(fields.filter((f) => f.id !== id));
  };

  // Update field
  const updateField = (id: string, updates: Partial<TemplateField>) => {
    setFields(fields.map((f) => (f.id === id ? { ...f, ...updates } : f)));
  };

  // Move field up
  const moveFieldUp = (index: number) => {
    if (index <= 0) return;
    const newFields = [...fields];
    [newFields[index - 1], newFields[index]] = [newFields[index], newFields[index - 1]];
    setFields(newFields);
  };

  // Move field down
  const moveFieldDown = (index: number) => {
    if (index >= fields.length - 1) return;
    const newFields = [...fields];
    [newFields[index], newFields[index + 1]] = [newFields[index + 1], newFields[index]];
    setFields(newFields);
  };

  // Submit handler
  const handleSubmit = async () => {
    setError(null);

    // Validation
    if (!name.trim()) {
      setError("Template name is required");
      return;
    }

    const validFields = fields.filter((f) => f.label.trim());
    if (validFields.length === 0) {
      setError("At least one field with a label is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        icon,
        theme,
        fields: validFields.map((f) => ({
          ...f,
          label: f.label.trim(),
          placeholder: f.placeholder?.trim() || undefined,
        })),
      };

      let result;
      if (isEditing && editTemplate) {
        result = await updateTemplateAction(editTemplate.id, payload);
      } else {
        result = await createTemplateAction(payload);
      }

      if (result.error) {
        setError(result.error);
        return;
      }

      if (result.template) {
        toast.success(isEditing ? "Template updated!" : "Template created!");
        onSuccess(result.template);
        onOpenChange(false);
        resetForm();
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] rounded-2xl [&>button]:cursor-pointer flex flex-col overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <LayoutTemplate className="h-5 w-5 text-primary" />
            {isEditing ? "Edit Template" : isDuplicating ? "Duplicate Template" : "Create Template"}
          </DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update your custom template with new fields and settings."
              : isDuplicating
              ? "Create a copy of this template with your own modifications."
              : "Create a reusable template for your agreements."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4 px-1 overflow-y-auto flex-1">
          {/* Error Alert */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive text-sm border border-destructive/20"
              >
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Template Name */}
          <div className="space-y-2">
            <Label htmlFor="template-name">Template Name</Label>
            <Input
              id="template-name"
              placeholder="e.g., Rental Agreement"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              className="rounded-xl"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="template-description">Description</Label>
            <Textarea
              id="template-description"
              placeholder="Describe when to use this template..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              className="resize-none h-20 rounded-xl"
            />
          </div>

          {/* Icon Selector */}
          <div className="space-y-2">
            <Label>Template Icon</Label>
            <div className="flex flex-wrap gap-2">
              {ICON_OPTIONS.map((opt) => {
                const IconComponent = opt.icon;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setIcon(opt.value)}
                    className={cn(
                      "h-9 w-9 rounded-xl border flex items-center justify-center transition-all cursor-pointer",
                      icon === opt.value
                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                        : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:bg-muted/50"
                    )}
                    title={opt.label}
                  >
                    <IconComponent className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Theme Selector */}
          <div className="space-y-2">
            <Label>Category</Label>
            <div className="flex flex-wrap gap-2">
              {THEME_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setTheme(opt.value)}
                  className={cn(
                    "px-3 py-1.5 rounded-lg text-sm font-medium border transition-all cursor-pointer",
                    theme === opt.value
                      ? "bg-primary text-primary-foreground border-primary shadow-sm"
                      : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground hover:bg-muted/50"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Fields Section */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Fields</Label>
              <Badge variant="secondary" className="text-xs rounded-full">
                {fields.length}/20 fields
              </Badge>
            </div>

            <div className="space-y-2">
              <AnimatePresence initial={false}>
                {fields.map((field, index) => (
                  <motion.div
                    key={field.id}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, height: 0 }}
                    layout
                    className="flex items-start gap-2 p-3 rounded-xl border bg-muted/30"
                  >
                    {/* Reorder buttons - horizontal and compact */}
                    <div className="flex items-center gap-0 mt-1.5">
                      <button
                        type="button"
                        onClick={() => moveFieldUp(index)}
                        disabled={index === 0}
                        className={cn(
                          "h-6 w-5 rounded-l border-y border-l flex items-center justify-center transition-colors cursor-pointer",
                          index === 0
                            ? "text-muted-foreground/30 cursor-not-allowed bg-muted/50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted bg-background"
                        )}
                        title="Move up"
                      >
                        <ChevronUp className="h-3 w-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveFieldDown(index)}
                        disabled={index === fields.length - 1}
                        className={cn(
                          "h-6 w-5 rounded-r border flex items-center justify-center transition-colors cursor-pointer",
                          index === fields.length - 1
                            ? "text-muted-foreground/30 cursor-not-allowed bg-muted/50"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted bg-background"
                        )}
                        title="Move down"
                      >
                        <ChevronDown className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-12 gap-2">
                      {/* Field Label */}
                      <div className="sm:col-span-4">
                        <Input
                          placeholder="Field label"
                          value={field.label}
                          onChange={(e) => updateField(field.id, { label: e.target.value })}
                          className="h-9 rounded-lg"
                          autoFocus={field.id === lastAddedId}
                          onFocus={() => {
                            if (field.id === lastAddedId) setLastAddedId(null);
                          }}
                        />
                      </div>

                      {/* Field Type */}
                      <div className="sm:col-span-3">
                        <Select
                          value={field.type}
                          onValueChange={(value: TemplateField["type"]) =>
                            updateField(field.id, { type: value })
                          }
                        >
                          <SelectTrigger className="h-9 rounded-lg cursor-pointer">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {FIELD_TYPES.map((ft) => {
                              const TypeIcon = ft.icon;
                              return (
                                <SelectItem key={ft.value} value={ft.value} className="cursor-pointer rounded-lg">
                                  <div className="flex items-center gap-2">
                                    <TypeIcon className="h-3.5 w-3.5" />
                                    {ft.label}
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Placeholder */}
                      <div className="sm:col-span-3">
                        <Input
                          placeholder="Placeholder"
                          value={field.placeholder || ""}
                          onChange={(e) => updateField(field.id, { placeholder: e.target.value })}
                          className="h-9 rounded-lg"
                        />
                      </div>

                      {/* Required Toggle */}
                      <div className="sm:col-span-2 flex items-center justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => updateField(field.id, { required: !field.required })}
                          className={cn(
                            "text-xs px-2 py-1 rounded-lg transition-colors cursor-pointer",
                            field.required
                              ? "bg-primary/10 text-primary font-medium"
                              : "bg-muted text-muted-foreground hover:bg-muted/80"
                          )}
                        >
                          {field.required ? "Req" : "Opt"}
                        </button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive cursor-pointer rounded-lg"
                          onClick={() => removeField(field.id)}
                          disabled={fields.length <= 1}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>

              {/* Scroll reference for auto-scroll on add */}
              <div ref={fieldsEndRef} />

              <Button
                type="button"
                variant="outline"
                className="w-full h-9 border-dashed rounded-xl cursor-pointer"
                onClick={addField}
                disabled={fields.length >= 20}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Field
              </Button>
            </div>
          </div>
        </div>

        {/* Footer Actions - Sticky */}
        <div className="flex justify-end gap-2 pt-4 border-t bg-background shrink-0">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="rounded-xl cursor-pointer"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? "Save Changes" : "Create Template"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
