---
description: How to make database schema changes safely
---

# Database Changes

> Follow this when adding tables, columns, or modifying schema.

## Step 1: Plan the Change

Before writing SQL:
- What table/column is changing?
- Is this a breaking change?
- Does it affect existing data?

## Step 2: Write Migration SQL

Add to `supabase/schema.sql`:

### Adding a Column
```sql
ALTER TABLE public.tablename
ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
```

### Adding a Table
```sql
CREATE TABLE IF NOT EXISTS public.new_table (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.new_table ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users can manage their own records"
  ON public.new_table FOR ALL
  USING (auth.uid() = user_id);
```

## Step 3: Run in Supabase

1. Go to Supabase Dashboard
2. Open SQL Editor
3. Paste and run your SQL

## Step 4: Regenerate Types

// turbo
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

If you don't have project ID:
1. Go to Supabase Dashboard → Settings → General
2. Copy "Reference ID"

## Step 5: Update TypeScript Types

If the change affects user-facing types, update `src/types/deal.ts`:

```typescript
export interface User {
  // ... existing fields
  newField?: string; // Add new field
}
```

## Step 6: Add Server Action

If you need to read/write the new data, add to `src/app/actions/deal-actions.ts`:

```typescript
export async function updateNewFieldAction(value: string) {
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("tablename")
    .update({ new_column: value })
    .eq("user_id", user.id);

  return { error: error?.message || null };
}
```

## Step 7: Test

// turbo
```bash
pnpm build
```

Then manually test the new functionality.

## Checklist

- [ ] SQL is idempotent (uses IF NOT EXISTS, IF EXISTS)
- [ ] RLS enabled on new tables
- [ ] Policies created for new tables
- [ ] Types regenerated
- [ ] TypeScript types updated
- [ ] Server action added if needed
- [ ] Build passes
