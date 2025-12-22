---
description: Run before committing any code - checks for common issues
---

# Pre-Commit Checklist

> Run these checks before committing ANY code changes.

## Automated Checks

// turbo
```bash
pnpm lint
```

// turbo
```bash
pnpm build
```

If either fails, fix the issues before proceeding.

## Manual Verification

Review your changes for:

### 1. TypeScript Quality
- [ ] No `any` types (search: `as any`, `: any`)
- [ ] No `eslint-disable` comments added
- [ ] No `@ts-ignore` or `@ts-expect-error`

### 2. Console Statements
- [ ] No `console.log` (debug leftovers)
- [ ] No `console.error` (use error handling)
- [ ] No `console.warn`

### 3. Security
- [ ] User input validated with Zod
- [ ] Auth checked in server actions
- [ ] No secrets hardcoded

### 4. UI/UX
- [ ] No `alert()` - use toast
- [ ] Loading states on buttons
- [ ] Error states handled
- [ ] Mobile responsive

### 5. Patterns
- [ ] Used existing components from `components/ui/`
- [ ] Follows patterns in similar files
- [ ] Magic numbers in `lib/constants.ts`

## Quick Search Commands

Find potential issues:
// turbo
```bash
grep -rn "as any\|: any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20
```

// turbo
```bash
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20
```

// turbo
```bash
grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20
```

// turbo
```bash
grep -rn "alert(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | head -20
```
