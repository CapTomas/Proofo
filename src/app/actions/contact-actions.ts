"use server";

import { z } from "zod/v4";
import { logger } from "@/lib/logger";
import { createServerSupabaseClient, isSupabaseConfiguredServer } from "@/lib/supabase/server";
import { Database } from "@/lib/supabase/types";

type ContactRow = Database["public"]["Tables"]["contacts"]["Row"];
type ContactInsert = Database["public"]["Tables"]["contacts"]["Insert"];

// ============================================
// VALIDATION SCHEMAS
// ============================================

const createContactSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).trim(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
});

const updateContactSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(100).trim().optional(),
  email: z.string().email().optional().or(z.literal("")),
  notes: z.string().max(500).optional(),
  isHidden: z.boolean().optional(),
});

// ============================================
// TYPES
// ============================================

export interface Contact {
  id: string;
  userId: string;
  name: string;
  email?: string | null;
  notes?: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

// ============================================
// SERVER ACTIONS
// ============================================

/**
 * Get all contacts for the current user
 */
export async function getContactsAction(): Promise<{
  contacts: Contact[];
  error: string | null
}> {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfiguredServer()) {
      return { contacts: [], error: null }; // Demo mode - return empty
    }

    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { contacts: [], error: "Not authenticated" };
    }

    const { data, error } = await supabase
      .from("contacts")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      logger.error("Error fetching contacts", error);
      return { contacts: [], error: error.message };
    }

    const contactRows = (data || []) as ContactRow[];
    const contacts: Contact[] = contactRows.map((c) => ({
      id: c.id,
      userId: c.user_id,
      name: c.name,
      email: c.email,
      notes: c.notes,
      isHidden: c.is_hidden,
      createdAt: c.created_at,
      updatedAt: c.updated_at,
    }));

    return { contacts, error: null };
  } catch (error) {
    logger.error("Error in getContactsAction", error);
    return { contacts: [], error: "Server error" };
  }
}

/**
 * Create a new contact
 */
export async function createContactAction(data: {
  name: string;
  email?: string;
  notes?: string;
}): Promise<{ contact: Contact | null; error: string | null }> {
  try {
    // Check if Supabase is configured
    if (!isSupabaseConfiguredServer()) {
      return { contact: null, error: "Demo mode - contacts are stored locally" };
    }

    // Validate input
    const validation = createContactSchema.safeParse(data);
    if (!validation.success) {
      return { contact: null, error: validation.error.issues[0]?.message || "Invalid input" };
    }
    const validatedData = validation.data;

    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { contact: null, error: "Not authenticated" };
    }

    const insertData: ContactInsert = {
      user_id: user.id,
      name: validatedData.name,
      email: validatedData.email || null,
      notes: validatedData.notes || null,
    };

    const { data: contact, error } = await supabase
      .from("contacts")
      .insert(insertData as never) // Type assertion needed due to Supabase typed client limitations
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === "23505") {
        return { contact: null, error: "A contact with this email already exists" };
      }
      logger.error("Error creating contact", error);
      return { contact: null, error: error.message };
    }

    const contactRow = contact as ContactRow;
    return {
      contact: {
        id: contactRow.id,
        userId: contactRow.user_id,
        name: contactRow.name,
        email: contactRow.email,
        notes: contactRow.notes,
        isHidden: contactRow.is_hidden,
        createdAt: contactRow.created_at,
        updatedAt: contactRow.updated_at,
      },
      error: null,
    };
  } catch (error) {
    logger.error("Error in createContactAction", error);
    return { contact: null, error: "Server error" };
  }
}

/**
 * Update a contact
 */
export async function updateContactAction(data: {
  id: string;
  name?: string;
  email?: string;
  notes?: string;
  isHidden?: boolean;
}): Promise<{ error: string | null }> {
  try {
    // Check if Supabase is configured - in demo mode, just succeed silently
    if (!isSupabaseConfiguredServer()) {
      return { error: null };
    }

    // Validate input
    const validation = updateContactSchema.safeParse(data);
    if (!validation.success) {
      return { error: validation.error.issues[0]?.message || "Invalid input" };
    }
    const validatedData = validation.data;

    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    // Build update object
    const updates: Record<string, unknown> = {};
    if (validatedData.name !== undefined) updates.name = validatedData.name;
    if (validatedData.email !== undefined) updates.email = validatedData.email || null;
    if (validatedData.notes !== undefined) updates.notes = validatedData.notes || null;
    if (validatedData.isHidden !== undefined) updates.is_hidden = validatedData.isHidden;

    const { error } = await supabase
      .from("contacts")
      .update(updates as never) // Type assertion needed due to Supabase typed client limitations
      .eq("id", validatedData.id)
      .eq("user_id", user.id); // Ensure user owns the contact

    if (error) {
      logger.error("Error updating contact", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    logger.error("Error in updateContactAction", error);
    return { error: "Server error" };
  }
}

/**
 * Delete a contact
 */
export async function deleteContactAction(contactId: string): Promise<{ error: string | null }> {
  try {
    // Check if Supabase is configured - in demo mode, just succeed silently
    if (!isSupabaseConfiguredServer()) {
      return { error: null };
    }

    if (!contactId || !z.string().uuid().safeParse(contactId).success) {
      return { error: "Invalid contact ID" };
    }

    const supabase = await createServerSupabaseClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("contacts")
      .delete()
      .eq("id", contactId)
      .eq("user_id", user.id); // Ensure user owns the contact

    if (error) {
      logger.error("Error deleting contact", error);
      return { error: error.message };
    }

    return { error: null };
  } catch (error) {
    logger.error("Error in deleteContactAction", error);
    return { error: "Server error" };
  }
}

/**
 * Toggle contact visibility (hide/unhide)
 */
export async function toggleContactVisibilityAction(
  contactId: string,
  isHidden: boolean
): Promise<{ error: string | null }> {
  return updateContactAction({ id: contactId, isHidden });
}
