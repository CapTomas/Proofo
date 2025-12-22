---
description: Code review and cleanup - find and fix issues in the codebase
---

# Code Review & Cleanup

> Use this to audit code quality and clean up issues.

## Quick Audit

Run all checks at once:

### Find Bad Patterns
// turbo
```bash
echo "=== ANY TYPES ===" && grep -rn "as any\|: any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
```

// turbo
```bash
echo "=== CONSOLE STATEMENTS ===" && grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
```

// turbo
```bash
echo "=== ESLINT DISABLE ===" && grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
```

// turbo
```bash
echo "=== ALERT CALLS ===" && grep -rn "alert(" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
```

// turbo
```bash
echo "=== TODO/FIXME ===" && grep -rn "TODO\|FIXME\|HACK\|XXX" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules | wc -l
```

## Detailed Reports

### List All `any` Types
// turbo
```bash
grep -rn "as any\|: any" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Fix**: Replace with proper types. If Supabase types are wrong, regenerate them.

### List Console Statements
// turbo
```bash
grep -rn "console\." src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Fix**: Remove or replace with proper error handling.

### List ESLint Disables
// turbo
```bash
grep -rn "eslint-disable" src/ --include="*.ts" --include="*.tsx" | grep -v node_modules
```

**Fix**: Fix the underlying issue, don't suppress.

### Find Unused Code

Files larger than expected may have dead code:
// turbo
```bash
find src/ -name "*.ts" -o -name "*.tsx" | xargs wc -l | sort -n | tail -20
```

Check if largest files have unused exports.

## Known Issues to Fix

These are known issues from the technical audit:

1. **Dead Code File**: `src/lib/supabase/deals.ts` - DELETE THIS FILE
2. **Console.log in auth-provider.tsx:117** - Remove
3. **Console.log in login/page.tsx:75** - Remove
4. **Alert calls in dashboard/page.tsx** - Replace with toast

## File Size Check

Large files may need refactoring:
// turbo
```bash
wc -l src/app/actions/deal-actions.ts src/app/\(main\)/dashboard/page.tsx src/app/\(main\)/dashboard/settings/page.tsx
```

If a file is over 500 lines, consider splitting.

## Dependency Check

Find unused dependencies:
// turbo
```bash
npx depcheck --ignores="@types/*,tailwindcss,postcss,typescript,eslint*"
```

## Build Health
// turbo
```bash
pnpm build 2>&1 | tail -20
```

All checks should pass with no warnings.
