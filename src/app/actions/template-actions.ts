"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { z } from "zod";
import { UserTemplate, TemplateField, TemplateTheme } from "@/types";
import { checkRateLimit } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

// Helper to create Supabase server client
async function createServerSupabaseClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Cookies can fail during static generation
          }
        },
        remove(name: string, options) {
          try {
            cookieStore.delete({ name, ...options });
          } catch {
            // Cookies can fail during static generation
          }
        },
      },
    }
  );
}

// Validation schemas
const templateFieldSchema = z.object({
  id: z.string().min(1),
  label: z.string().min(1).max(100),
  type: z.enum(["text", "textarea", "number", "date", "currency"]),
  placeholder: z.string().max(200).optional(),
  required: z.boolean(),
  defaultValue: z.string().max(500).optional(),
});

const createTemplateSchema = z.object({
  name: z.string().min(1, "Name is required").max(100, "Name too long"),
  description: z.string().max(500).optional(),
  icon: z.string().max(50).optional(),
  theme: z.enum(["financial", "services", "personal", "general"]).optional(),
  fields: z.array(templateFieldSchema).min(1, "At least one field required").max(20, "Too many fields"),
  isPublic: z.boolean().optional(),
});

const updateTemplateSchema = createTemplateSchema.partial();

// Transform database row to UserTemplate
function transformTemplate(dbTemplate: Record<string, unknown>): UserTemplate {
  return {
    id: dbTemplate.id as string,
    name: dbTemplate.name as string,
    description: (dbTemplate.description as string) || "",
    icon: (dbTemplate.icon as string) || "file-text",
    theme: (dbTemplate.theme as TemplateTheme) || "general",
    fields: dbTemplate.fields as TemplateField[],
    userId: dbTemplate.user_id as string,
    isPublic: (dbTemplate.is_public as boolean) || false,
    createdAt: dbTemplate.created_at as string,
    updatedAt: dbTemplate.updated_at as string,
  };
}

// Get all templates for the current user
export async function getUserTemplatesAction(): Promise<{
  templates: UserTemplate[];
  error: string | null;
}> {
  try {
    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { templates: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_templates")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching user templates", error);
      return { templates: [], error: error.message };
    }

    const templates = (data || []).map((row) =>
      transformTemplate(row as Record<string, unknown>)
    );

    return { templates, error: null };
  } catch (error) {
    logger.error("Server error fetching templates", error);
    return { templates: [], error: "Server error" };
  }
}

// Create a new template
export async function createTemplateAction(data: {
  name: string;
  description?: string;
  icon?: string;
  theme?: TemplateTheme;
  fields: TemplateField[];
  isPublic?: boolean;
}): Promise<{
  template: UserTemplate | null;
  error: string | null;
}> {
  try {
    // Validate input
    const validation = createTemplateSchema.safeParse(data);
    if (!validation.success) {
      return {
        template: null,
        error: validation.error.issues[0]?.message || "Invalid input",
      };
    }
    const validatedData = validation.data;

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { template: null, error: "Not authenticated" };
    }

    // Rate limit: 20 templates per hour
    const rateLimitResult = await checkRateLimit("general", user.id);
    if (!rateLimitResult.success) {
      return { template: null, error: "Rate limit exceeded. Please try again later." };
    }

    const { data: template, error } = await supabase
      .from("user_templates")
      .insert({
        user_id: user.id,
        name: validatedData.name,
        description: validatedData.description || null,
        icon: validatedData.icon || "file-text",
        theme: validatedData.theme || "general",
        fields: validatedData.fields,
        is_public: validatedData.isPublic || false,
      })
      .select()
      .single();

    if (error || !template) {
      logger.error("Error creating template", error);
      return { template: null, error: error?.message || "Failed to create template" };
    }

    return {
      template: transformTemplate(template as Record<string, unknown>),
      error: null,
    };
  } catch (error) {
    logger.error("Server error creating template", error);
    return { template: null, error: "Server error" };
  }
}

// Update an existing template
export async function updateTemplateAction(
  templateId: string,
  data: Partial<{
    name: string;
    description: string;
    icon: string;
    theme: TemplateTheme;
    fields: TemplateField[];
    isPublic: boolean;
  }>
): Promise<{
  template: UserTemplate | null;
  error: string | null;
}> {
  try {
    // Validate templateId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!templateId || !uuidRegex.test(templateId)) {
      return { template: null, error: "Invalid template ID" };
    }

    // Validate input
    const validation = updateTemplateSchema.safeParse(data);
    if (!validation.success) {
      return {
        template: null,
        error: validation.error.issues[0]?.message || "Invalid input",
      };
    }
    const validatedData = validation.data;

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { template: null, error: "Not authenticated" };
    }

    // Build update object (only include provided fields)
    const updateObj: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updateObj.name = validatedData.name;
    if (validatedData.description !== undefined) updateObj.description = validatedData.description;
    if (validatedData.icon !== undefined) updateObj.icon = validatedData.icon;
    if (validatedData.theme !== undefined) updateObj.theme = validatedData.theme;
    if (validatedData.fields !== undefined) updateObj.fields = validatedData.fields;
    if (validatedData.isPublic !== undefined) updateObj.is_public = validatedData.isPublic;

    if (Object.keys(updateObj).length === 0) {
      return { template: null, error: "No fields to update" };
    }

    const { data: template, error } = await supabase
      .from("user_templates")
      .update(updateObj)
      .eq("id", templateId)
      .eq("user_id", user.id) // RLS ensures user can only update their own
      .select()
      .single();

    if (error || !template) {
      logger.error("Error updating template", error);
      return { template: null, error: error?.message || "Failed to update template" };
    }

    return {
      template: transformTemplate(template as Record<string, unknown>),
      error: null,
    };
  } catch (error) {
    logger.error("Server error updating template", error);
    return { template: null, error: "Server error" };
  }
}

// Delete a template
export async function deleteTemplateAction(templateId: string): Promise<{
  success: boolean;
  error: string | null;
}> {
  try {
    // Validate templateId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!templateId || !uuidRegex.test(templateId)) {
      return { success: false, error: "Invalid template ID" };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("user_templates")
      .delete()
      .eq("id", templateId)
      .eq("user_id", user.id); // RLS ensures user can only delete their own

    if (error) {
      logger.error("Error deleting template", error);
      return { success: false, error: error.message };
    }

    return { success: true, error: null };
  } catch (error) {
    logger.error("Server error deleting template", error);
    return { success: false, error: "Server error" };
  }
}

// Get a single template by ID
export async function getTemplateByIdAction(templateId: string): Promise<{
  template: UserTemplate | null;
  error: string | null;
}> {
  try {
    // Validate templateId
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!templateId || !uuidRegex.test(templateId)) {
      return { template: null, error: "Invalid template ID" };
    }

    const supabase = await createServerSupabaseClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { template: null, error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("user_templates")
      .select("*")
      .eq("id", templateId)
      .eq("user_id", user.id)
      .single();

    if (error || !data) {
      return { template: null, error: error?.message || "Template not found" };
    }

    return {
      template: transformTemplate(data as Record<string, unknown>),
      error: null,
    };
  } catch (error) {
    logger.error("Server error fetching template", error);
    return { template: null, error: "Server error" };
  }
}
