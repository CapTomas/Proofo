"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { DashboardLayout } from "@/components/dashboard-layout";
import {
  Plus,
  Search,
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
  FileCheck,
  MoreHorizontal,
  Edit,
  Trash2,
  Copy,
  ArrowRight,
  LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { dealTemplates } from "@/lib/templates";

// Icon mapping for templates
const iconMap: Record<string, LucideIcon> = {
  Package,
  Handshake,
  DollarSign,
  ArrowLeftRight,
  PenLine,
};

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTemplateId, setExpandedTemplateId] = useState<string | null>(null);

  // Filter templates based on search
  const filteredTemplates = dealTemplates.filter((template) =>
    template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout title="Templates" showNewDealButton={false}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">Deal Templates</h2>
            <p className="text-sm text-muted-foreground">Choose a template to create a new deal or customize your own</p>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Templates Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {filteredTemplates.map((template, index) => {
            const IconComponent = iconMap[template.icon] || FileCheck;
            return (
              <motion.div
                key={template.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Card className="h-full hover:border-primary/50 transition-colors group">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div className="relative">
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                        <div className="hidden group-hover:block absolute right-0 top-full mt-1 w-32 p-1 bg-popover border rounded-lg shadow-lg z-10">
                          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                            <Edit className="h-3 w-3" />
                            Edit
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs">
                            <Copy className="h-3 w-3" />
                            Duplicate
                          </Button>
                          <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-8 text-xs text-destructive hover:text-destructive">
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-lg mt-3">{template.name}</CardTitle>
                    <CardDescription>{template.description}</CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {(expandedTemplateId === template.id ? template.fields : template.fields.slice(0, 3)).map((field) => (
                        <Badge key={field.id} variant="outline" className="text-xs font-normal">
                          {field.label}
                        </Badge>
                      ))}
                      {template.fields.length > 3 && (
                        <Badge 
                          variant="outline" 
                          className="text-xs font-normal cursor-pointer hover:bg-secondary/80 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedTemplateId(expandedTemplateId === template.id ? null : template.id);
                          }}
                        >
                          {expandedTemplateId === template.id ? "Show less" : `+${template.fields.length - 3} more`}
                        </Badge>
                      )}
                    </div>
                    <Link href={`/deal/new?template=${template.id}`}>
                      <Button variant="outline" className="w-full gap-2 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        Use Template
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Create Custom Template CTA */}
        <Card className="mt-6 border-dashed">
          <CardContent className="py-8 text-center">
            <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center mx-auto mb-4">
              <Plus className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-semibold mb-2">Create Custom Template</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              Need something specific? Create a custom template with your own fields and terms.
            </p>
            <Link href="/deal/new?template=custom">
              <Button variant="outline" className="gap-2">
                <PenLine className="h-4 w-4" />
                Create Custom
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
