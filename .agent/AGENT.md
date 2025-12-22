# Proofo Agent Instructions

> **READ THIS FIRST** before making any changes.

---

## 🚨 Critical Rules

### NEVER Do This
- ❌ `any` types → Use proper TypeScript types
- ❌ `eslint-disable` → Fix the underlying issue
- ❌ `console.log/warn/error` → Use proper error handling
- ❌ `alert()` → Use toast (sonner)
- ❌ Hardcoded secrets → Use environment variables
- ❌ Client-side DB calls → Use server actions only

### ALWAYS Do This
- ✅ Validate input with Zod before processing
- ✅ Check auth with `getUser()` (not `getSession()`)
- ✅ Return `{ result, error }` from server actions
- ✅ Show loading states on async buttons
- ✅ Use toast for user feedback
- ✅ Reuse components from `components/ui/`

---

## Quick Reference

| Need to... | Read... |
|-----------|---------|
| Understand the project | `CONTEXT.md` |
| Know architecture decisions | `DECISIONS.md` |
| Write code | `DEVELOPMENT.md` |
| Find known issues and requests | `TECHNICAL_ROADMAP.md` |

### Workflows

| Command | Use When |
|---------|----------|
| `/pre-commit` | Before committing ANY code |
| `/code-review` | Auditing/cleaning up code |
| `/security-check` | Before deployment |
| `/database-changes` | Adding tables/columns |
| `/debugging` | Something isn't working |

---

## Tech Stack

| What | Technology |
|------|------------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript 5 |
| Styling | Tailwind CSS 4 |
| Components | Radix UI |
| Animation | Framer Motion |
| State | Zustand |
| Database | Supabase (Postgres) |
| Auth | Supabase Auth |
| Email | Resend |
| Toast | Sonner |
| Validation | Zod |

---

## Environment Variables

Required:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_APP_URL=
RESEND_API_KEY=
```

---

*For coding patterns and templates, see `DEVELOPMENT.md`*
