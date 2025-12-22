---
description: How to debug issues in the Proofo codebase
---

# Debugging Guide

> Use this when something isn't working as expected.

## Build Errors

// turbo
```bash
pnpm build 2>&1 | head -50
```

Common fixes:
- **Module not found**: Check import path
- **Type error**: Check types in `src/types/` or regenerate Supabase types
- **Server component error**: Add `"use client"` if using hooks

## Runtime Errors

### Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red error messages

### Check Server Logs
If running `pnpm dev`, check the terminal for server-side errors.

## Database Issues

### Verify Supabase Connection
Check environment variables are set:
// turbo
```bash
grep -c "NEXT_PUBLIC_SUPABASE" .env.local 2>/dev/null || echo "Missing .env.local"
```

### Test Query in Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Run your query directly to isolate issue

### Check RLS Policies
If data isn't returning:
1. Check RLS is enabled on the table
2. Check policy allows the operation for the user role

## Auth Issues

### Use getUser() not getSession()
```typescript
// CORRECT - validates JWT server-side
const { data: { user } } = await supabase.auth.getUser();

// WRONG - doesn't validate, can be spoofed
const { data: { session } } = await supabase.auth.getSession();
```

### Check Cookies
1. DevTools → Application → Cookies
2. Look for `sb-*` cookies from Supabase

## Type Errors

### Regenerate Supabase Types
// turbo
```bash
npx supabase gen types typescript --project-id YOUR_PROJECT_ID > src/lib/supabase/database.types.ts
```

### Check for Outdated Types
If you added a database column, regenerate types.

## Component Not Rendering

1. Check for JavaScript errors in console
2. Verify component is exported correctly
3. Check conditional rendering logic

## Server Action Errors

Add temporary logging (remove before commit):
```typescript
console.log('[DEBUG] Action input:', data);
// ... action code
console.log('[DEBUG] Action result:', result);
```

Remember to remove before commit - run `/pre-commit` to check.

## Common Error Messages

| Error | Likely Cause | Fix |
|-------|--------------|-----|
| "Not authenticated" | Missing or invalid session | Check auth flow, cookies |
| "Invalid or expired token" | Token expired or used | Get fresh token |
| "Failed to fetch" | Network/CORS issue | Check browser network tab |
| "Hydration mismatch" | Server/client render different | Check for date/random values |
