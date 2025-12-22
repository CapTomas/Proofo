---
description: Security checklist - verify code is secure before deployment
---

# Security Checklist

> Run this before any deployment or when touching auth/data handling.

## Input Validation

All user input MUST be validated with Zod.

Check server actions have validation:
// turbo
```bash
grep -A5 "export async function" src/app/actions/deal-actions.ts | grep -E "safeParse|Schema" | wc -l
```

### Validation Pattern
```typescript
const validation = schema.safeParse(data);
if (!validation.success) {
  return { error: validation.error.errors[0].message };
}
```

## Authentication

All protected actions must check auth:
// turbo
```bash
grep -c "auth.getUser()" src/app/actions/deal-actions.ts
```

### Auth Pattern
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) {
  return { error: "Not authenticated" };
}
```

**CRITICAL**: Use `getUser()` not `getSession()` - `getUser()` validates the JWT server-side.

## No Secrets in Code
// turbo
```bash
grep -rn "secret\|password\|api_key\|token" src/ --include="*.ts" --include="*.tsx" | grep -v "process.env\|accessToken\|// \|interface\|type " | head -20
```

Any matches should be reviewed - secrets must be in environment variables.

## Rate Limiting

Check rate limiting is configured:
// turbo
```bash
ls -la src/lib/rate-limit.ts 2>/dev/null || echo "WARNING: No rate limiting file found"
```

Important endpoints should rate limit:
- Authentication attempts
- Deal creation
- Email sending

## XSS Prevention

Email templates must escape HTML:
// turbo
```bash
grep -c "escapeHtml" src/lib/email.ts
```

Pattern:
```typescript
function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
```

## Database Security

### RLS Enabled
Check Row Level Security is on all tables - verify in `supabase/schema.sql`:
```sql
ALTER TABLE public.tablename ENABLE ROW LEVEL SECURITY;
```

### Policies Exist
All tables should have SELECT/INSERT/UPDATE policies.

## Sensitive Data Exposure

Don't return sensitive data to client:
// turbo
```bash
grep -rn "password\|secret\|private" src/types/ --include="*.ts" | head -10
```

User-facing types should NOT include:
- Passwords
- Internal IDs that shouldn't be exposed
- Admin-only fields

## Error Messages

Don't leak internal errors to users:
```typescript
// BAD
return { error: dbError.message };

// GOOD (for production)
return { error: "Failed to save. Please try again." };
```

## Environment Variables

All required env vars documented:
// turbo
```bash
cat .env.example 2>/dev/null || echo "WARNING: No .env.example file"
```

## Security Checklist Summary

- [ ] All inputs validated with Zod
- [ ] Auth checked with `getUser()` (not `getSession()`)
- [ ] No secrets in code (check for hardcoded strings)
- [ ] Rate limiting on sensitive endpoints
- [ ] HTML escaped in emails/PDFs
- [ ] RLS enabled on all tables
- [ ] Error messages don't leak internals
- [ ] `.env.example` is up to date
