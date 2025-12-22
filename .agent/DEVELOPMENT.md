# Development Guide

> Complete reference for writing code in Proofo. Read this before implementing any feature.

---

## Table of Contents

1. [Before Writing Code](#before-writing-code)
2. [Standard Patterns](#standard-patterns)
3. [Adding a New Feature](#adding-a-new-feature)
4. [Feature Checklist](#feature-checklist)

---

## Before Writing Code

### 1. Check Existing Patterns

```bash
# Find similar implementations
grep -r "functionName" src/
```

Look in these locations for reusable code:
- `src/components/ui/` - UI components
- `src/hooks/` - Custom hooks
- `src/lib/` - Utilities
- `src/app/actions/` - Server actions

### 2. Verify Types Exist

- Check `src/types/` for existing types
- Check `src/lib/supabase/types.ts` for DB types

### 3. Understand the Scope

Before coding, answer:
- What user problem does this solve?
- Which files will be affected?
- Does similar functionality exist that I can reuse?

---

## Standard Patterns

### Server Actions

All database operations use server actions in `src/app/actions/deal-actions.ts`.

**Structure:**

```typescript
import { z } from 'zod';

const mySchema = z.object({
  field: z.string().min(1),
});

export async function someAction(
  data: z.infer<typeof mySchema>
): Promise<{ result: ResultType | null; error: string | null }> {
  try {
    // 1. Create Supabase client
    const supabase = await createServerSupabaseClient();

    // 2. Validate input with Zod
    const validation = mySchema.safeParse(data);
    if (!validation.success) {
      return { result: null, error: validation.error.errors[0].message };
    }

    // 3. Check authentication (if required)
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return { result: null, error: "Not authenticated" };
    }

    // 4. Perform database operation
    const { data: result, error: dbError } = await supabase
      .from("table_name")
      .select()
      // ... query

    if (dbError) {
      return { result: null, error: dbError.message };
    }

    // 5. Return success
    return { result, error: null };

  } catch (error) {
    // 6. Handle unexpected errors (no console.log!)
    return { result: null, error: "Server error" };
  }
}
```

**Key principles:**
- Never throw errors - always return `{ result, error }` shape
- Always validate input first
- Use `getUser()` not `getSession()` for auth
- Return user-friendly error messages

---

### Components

#### Client vs Server Components

```typescript
// Server Component (default) - for data fetching
export default async function Page() {
  const data = await fetchData();
  return <ClientComponent data={data} />;
}

// Client Component - for interactivity
"use client";
export function ClientComponent({ data }: Props) {
  const [state, setState] = useState();
  // ...
}
```

#### Dashboard Page Pattern

```typescript
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { containerVariants, itemVariants } from "@/lib/dashboard-ui";

export default function SomeDashboardPage() {
  // 1. State
  const [isLoading, setIsLoading] = useState(true);
  const [data, setData] = useState<DataType[]>([]);

  // 2. Data fetching
  useEffect(() => {
    async function load() {
      const { result, error } = await someAction();
      if (error) {
        toast.error("Failed to load", { description: error });
      } else {
        setData(result || []);
      }
      setIsLoading(false);
    }
    load();
  }, []);

  // 3. Loading state
  if (isLoading) {
    return <PageSkeleton />;
  }

  // 4. Render with animations
  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      <motion.div variants={itemVariants}>
        {/* Content */}
      </motion.div>
    </motion.div>
  );
}
```

#### Standard Component Template

```typescript
"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Props {
  // Always define props interface
  title: string;
  onAction?: () => void;
}

export function MyComponent({ title, onAction }: Props) {
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async () => {
    setIsLoading(true);
    try {
      const { error } = await someAction();
      if (error) {
        toast.error("Failed", { description: error });
        return;
      }
      toast.success("Success!");
      onAction?.();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <h2>{title}</h2>
      <Button onClick={handleAction} disabled={isLoading}>
        {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
      </Button>
    </motion.div>
  );
}
```

---

### Forms & Validation

#### Form Handling Pattern

```typescript
const [isSubmitting, setIsSubmitting] = useState(false);

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  setIsSubmitting(true);

  try {
    const { error } = await someAction(formData);

    if (error) {
      toast.error("Failed", { description: error });
      return;
    }

    toast.success("Success!");
    // Reset form or navigate

  } finally {
    setIsSubmitting(false);
  }
};

// Button should show loading state
<Button disabled={isSubmitting}>
  {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Submit"}
</Button>
```

#### Creating Validation Schemas

Create in `src/lib/validations/`:

```typescript
import { z } from 'zod';

export const myFeatureSchema = z.object({
  field: z.string().min(1, "Required"),
  email: z.string().email().optional().or(z.literal('')),
  terms: z.array(z.object({
    label: z.string().min(1).max(100),
    value: z.string().min(1).max(500),
  })).max(20),
});

export type MyFeatureInput = z.infer<typeof myFeatureSchema>;
```

---

### Toast Notifications

```typescript
import { toast } from 'sonner';

// Success
toast.success("Action completed");

// With description
toast.success("Deal created", {
  description: "Share the link with your recipient"
});

// Error
toast.error("Failed to save", {
  description: error.message
});

// Loading then success/error
const toastId = toast.loading("Saving...");
// ... after operation
toast.success("Saved!", { id: toastId });
// or
toast.error("Failed", { id: toastId });
```

**Never use `alert()` - always use toast!**

---

### Clipboard Pattern

```typescript
import { useCopyToClipboard } from '@/hooks';
import { toast } from 'sonner';
import { Check, Copy } from 'lucide-react';

function Component() {
  const { copied, copy } = useCopyToClipboard();

  const handleCopy = async () => {
    const success = await copy(text);
    if (success) {
      toast.success("Copied to clipboard");
    }
  };

  return (
    <Button onClick={handleCopy}>
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
    </Button>
  );
}
```

---

### Error Handling

#### In Components

```typescript
// Wrap with ErrorBoundary in parent
<ErrorBoundary>
  <SomeComponent />
</ErrorBoundary>
```

#### In Server Actions

```typescript
// Never throw - always return error shape
return { result: null, error: "Descriptive message" };
```

#### In Data Fetching

```typescript
const { result, error } = await someAction();
if (error) {
  toast.error("Failed to load", { description: error });
  // Set error state or show fallback UI
  return;
}
```

---

### Animations

```typescript
import { fadeInUp, staggerContainer, smoothTransition } from '@/lib/animations';

// Container with staggered children
<motion.div
  variants={staggerContainer}
  initial="hidden"
  animate="visible"
>
  {items.map(item => (
    <motion.div key={item.id} variants={fadeInUp}>
      {/* Content */}
    </motion.div>
  ))}
</motion.div>

// Single element animation
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={smoothTransition}
>
  {/* Content */}
</motion.div>
```

---

### Constants Usage

```typescript
import { TIMING, LIMITS } from '@/lib/constants';

// Instead of magic numbers:
setTimeout(() => setCopied(false), TIMING.COPY_FEEDBACK);

// For validation:
if (terms.length > LIMITS.MAX_TERMS) {
  return { error: `Maximum ${LIMITS.MAX_TERMS} terms allowed` };
}
```

**Never hardcode timing values or limits!**

---

### Supabase Queries

```typescript
// Always use typed client from server action
const supabase = await createServerSupabaseClient();

// Select with join
const { data } = await supabase
  .from("deals")
  .select(`
    *,
    creator:profiles!creator_id(name, email)
  `)
  .eq("id", dealId)
  .single();

// For public access (bypasses RLS)
const { data } = await supabase
  .rpc("get_deal_by_public_id", { p_public_id: publicId });
```

---

### File Naming Conventions

- Components: `PascalCase.tsx`
- Utilities: `kebab-case.ts` or `camelCase.ts`
- Types: In `src/types/` with descriptive names
- Routes: Follow Next.js App Router conventions

---

### Import Order

```typescript
"use client";

// 1. React/Next.js
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

// 2. Third-party libraries
import { motion } from "framer-motion";
import { toast } from "sonner";

// 3. Internal components (@/components)
import { Button } from "@/components/ui/button";
import { DealCard } from "@/components/dashboard/deal-card";

// 4. Internal utilities (@/lib)
import { someAction } from "@/app/actions/deal-actions";
import { TIMING } from "@/lib/constants";

// 5. Types
import { Deal } from "@/types";

// 6. Styles (if any)
import "./styles.css";
```

---

## Adding a New Feature

### Step 1: Design Data Flow

1. **Frontend** → What components are needed?
2. **API** → What server actions are needed?
3. **Database** → What schema changes are needed?

### Step 2: Database Changes (if needed)

If new tables/columns needed, follow `workflows/database-changes.md`:

1. Write migration SQL in `supabase/schema.sql`:

```sql
ALTER TABLE public.tablename
ADD COLUMN IF NOT EXISTS column_name TYPE DEFAULT value;
```

2. Run in Supabase Dashboard SQL Editor

3. Regenerate types:

```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

4. Update `src/types/deal.ts` if needed

### Step 3: Add Validation Schema

Create in `src/lib/validations/`:

```typescript
import { z } from 'zod';

export const myFeatureSchema = z.object({
  field: z.string().min(1, "Required"),
  // ... more fields
});
```

### Step 4: Add Server Action

Add to `src/app/actions/deal-actions.ts`:

```typescript
export async function myFeatureAction(
  data: z.infer<typeof myFeatureSchema>
) {
  // 1. Validate
  const validation = myFeatureSchema.safeParse(data);
  if (!validation.success) {
    return { result: null, error: validation.error.errors[0].message };
  }

  // 2. Auth
  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { result: null, error: "Not authenticated" };

  // 3. Database operation
  const { data: result, error } = await supabase
    .from("table")
    .insert(validation.data)
    .select()
    .single();

  if (error) return { result: null, error: error.message };
  return { result, error: null };
}
```

### Step 5: Add UI Component

Follow the component patterns above:
- Import from `@/components/ui/`
- Add loading states
- Use toast for feedback
- Add animations with Framer Motion

### Step 6: Test

1. Run build:

```bash
pnpm build
```

2. Manual test:
   - Happy path
   - Error cases
   - Mobile viewport

### Step 7: Pre-Commit Check

Run `workflows/pre-commit.md` checks before committing:

```bash
pnpm lint
pnpm build
```

---

## Feature Checklist

Before committing any feature:

### Code Quality
- [ ] No `any` types
- [ ] No `eslint-disable` comments
- [ ] No `console.*` statements
- [ ] No `alert()` calls
- [ ] Magic numbers in `lib/constants.ts`
- [ ] Reused existing components where possible
- [ ] Follows existing patterns

### Functionality
- [ ] Added Zod validation for inputs
- [ ] Server action follows standard pattern
- [ ] Auth checked where needed
- [ ] Loading states on buttons
- [ ] Error handling with toasts
- [ ] Mobile responsive

### Testing
- [ ] TypeScript compiles: `pnpm build`
- [ ] ESLint passes: `pnpm lint`
- [ ] Manual testing completed
- [ ] Error cases tested

### Security
- [ ] User input validated
- [ ] Auth checked in server actions
- [ ] No secrets hardcoded
- [ ] RLS policies updated (if DB changes)

---

## Quick Reference

| Need to... | Check... |
|-----------|----------|
| Add database operation | Server Actions pattern above |
| Create a form | Form Handling pattern above |
| Add a dashboard page | Dashboard Page Pattern above |
| Handle errors | Error Handling section above |
| Add animations | Animations section above |
| Debug issues | `workflows/debugging.md` |
| Make DB changes | `workflows/database-changes.md` |
| Security check | `workflows/security-check.md` |
