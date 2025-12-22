# Proofo Technical Roadmap
## Version 4.0 — December 2025

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current State Assessment](#current-state-assessment)
3. [Critical Issues](#critical-issues)
4. [Phase 0: Security & Code Cleanup](#phase-0-security--code-cleanup)
5. [Phase 1: Make It Work](#phase-1-make-it-work)
6. [Phase 2: Polish & Consistency](#phase-2-polish--consistency)
7. [Phase 3: Core Features](#phase-3-core-features)
8. [Phase 4: Monetization](#phase-4-monetization)
9. [Phase 5: Scale](#phase-5-scale)
10. [Architecture](#architecture)
11. [Success Metrics](#success-metrics)
12. [Action Items](#action-items)

---

## Executive Summary

Proofo is a **digital handshake platform** that enables users to create cryptographically-sealed agreements with anyone. The application has a solid foundation but requires attention to **security hardening**, **code cleanup**, and **feature completion** before production launch.

### Working Features ✅
- Deal creation flow (4-step wizard with 5 templates)
- Signature pad and deal confirmation
- PDF generation (basic quality with verification link)
- Email integration (Resend - invites & receipts)
- Authentication (Magic Link + OTP + Demo mode)
- Dashboard with stats and deal management
- People page (contact management from deals)
- Templates page (read-only template browser)
- Theme system (Light/Dark/System)
- PWA manifest and service worker

### Critical Issues ❌
| Category | Count | Priority |
|----------|-------|----------|
| Security vulnerabilities | 5 | 🔴 HIGH |
| Non-functional UI elements | 20+ | 🟠 MEDIUM |
| Dead/duplicate code | ~400 lines | 🟠 MEDIUM |
| Missing persistence | 3 features | 🟠 MEDIUM |
| Missing tests | 0 tests | 🟡 LOW |
| Config/documentation gaps | 4 items | 🟡 LOW |

---

## Current State Assessment

### 2.1 Working Features ✅

| Feature | Status | Notes |
|---------|--------|-------|
| Landing Page | ✅ Works | Animations, demo flow, CTA buttons |
| Magic Link Auth | ✅ Works | OTP-based with Supabase |
| Demo Mode | ✅ Works | Full app without backend |
| Deal Creation | ✅ Works | 4-step wizard, 5 templates |
| Signature Pad | ✅ Works | Canvas-based, base64 encoding |
| Deal Confirmation | ✅ Works | Multi-step recipient flow |
| PDF Generation | ✅ Works | jsPDF with branding |
| Email System | ✅ Works | Resend for invites & receipts |
| Dashboard | ✅ Works | Stats, deals, activity feed |
| Agreements Page | ✅ Works | Void, duplicate, nudge actions |
| Inbox Page | ✅ Works | Received deals list |
| People Page | ✅ Works | Contact cards (client-side only) |
| Templates Page | ✅ Works | Read-only template browser |
| Verification Page | ✅ Works | Hash recalculation |
| Theme Toggle | ✅ Works | Light/Dark/System |

---

### 2.2 Security Vulnerabilities 🔴

| Severity | Issue | Location | Risk | Mitigation |
|----------|-------|----------|------|------------|
| **HIGH** | No input validation | `deal-actions.ts` (all actions) | SQL injection, XSS, malformed data | Add Zod schemas |
| **HIGH** | No rate limiting | All server actions | DoS, spam, abuse | Upstash Redis |
| **HIGH** | No CSRF protection | Server actions | CSRF attacks | Add CSRF tokens |
| **MEDIUM** | Sensitive data in client state | Zustand store | Data exposure via XSS | Minimize stored data |
| **LOW** | Console statements in production | Multiple files | Info leakage | ESLint no-console rule |

---

### 2.3 Non-Functional UI Elements ⚠️

#### Settings Page (20+ broken elements)

| Tab | Element | Current Behavior | Required Action |
|-----|---------|------------------|-----------------|
| Profile | Update Signature button | Does nothing | Connect to signature editor |
| Profile | Profile Completion 65% | Hardcoded value | Calculate dynamically |
| Profile | Job Title field | Not persisted | Add DB column, save action |
| Profile | Location field | Not persisted | Add DB column, save action |
| Profile | Currency selector | Not persisted | Add DB column, save action |
| Account | Language selector | Disabled | Remove or implement i18n |
| Account | Two-Factor Auth toggle | Disabled | Remove until Phase 5 |
| Account | Quick Login toggle | No handler | Remove or implement |
| Account | Session Logout buttons | No handler | Implement session management |
| Account | Delete Account button | No handler | Implement with confirmation |
| Appearance | Compact Mode toggle | No effect | Implement CSS/state |
| Appearance | Font Scaling slider | No effect | Implement CSS variables |
| Appearance | Reduced Motion toggle | No effect | Use `prefers-reduced-motion` |
| Billing | Upgrade to Pro button | No handler | Remove until Stripe integration |
| Billing | Manage Subscription | No handler | Remove until Stripe integration |
| Billing | Add Payment Method | No handler | Remove until Stripe integration |
| Billing | Invoice Download | No handler | Remove until Stripe integration |
| Notifications | All 12+ toggles | Not persisted | Add DB table, save actions |
| Notifications | Mute All / DND buttons | No handler | Implement notification management |

#### Other Non-Functional Elements

| Location | Element | Issue | Fix |
|----------|---------|-------|-----|
| Dashboard | Nudge button | Uses `alert("Nudge sent!")` | Use toast notification |
| Dashboard | Copy link | Uses `alert()` | Use toast notification |
| People Page | Add Contact | Not persisted to DB | Add contacts table or remove |
| People Page | Hide/Unhide | State resets on refresh | Persist to localStorage or DB |
| Templates Page | Create Template | No UI exists | Add creation form or remove button |
| PDF | QR Code section | Shows URL text only | Add actual QR code image |
| Login | Terms/Privacy links | Pages don't exist | Create pages or remove links |

---

### 2.4 Dead & Duplicate Code 🟠

| Issue | File | Lines | Action |
|-------|------|-------|--------|
| **Dead client module** | `lib/supabase/deals.ts` | 363 | **DELETE** - Server actions replaced |
| `transformDeal()` duplicated | `deals.ts` + `deal-actions.ts` | ~44 | Keep only in `deal-actions.ts` |
| Copy-to-clipboard pattern | 12+ locations | ~36 | Create `useCopyToClipboard` hook |
| Local state duplication | Settings tabs | ~50 | Use form library or custom hook |

**Total dead/duplicate code: ~400+ lines**

---

### 2.5 Type Safety Issues

| File | Issue | Fix |
|------|-------|-----|
| `lib/supabase/deals.ts` | 14× `eslint-disable` + `any` casts | Delete file |
| `lib/supabase/auth.ts` | 1× `eslint-disable` | Generate Supabase types |
| `lib/crypto.ts` | 1× `eslint-disable` for `any` param | Type the function properly |
| `dashboard/page.tsx` | 2× `eslint-disable` | Add proper types |
| `dashboard/templates/page.tsx` | 3× `eslint-disable` | Add proper types |
| `public-header.tsx` | 1× `eslint-disable` | Add proper types |
| `deal/new/page.tsx` | 1× `react-hooks/exhaustive-deps` | Fix dependency array |

**Total: 22+ eslint-disable comments**

**Fix**: Run `npx supabase gen types typescript` to generate proper Supabase types.

---

### 2.6 Console Statements

| Type | Location | Action |
|------|----------|--------|
| `console.log` | `auth-provider.tsx:117` | Remove (debug) |
| `console.log` | `login/page.tsx:75` | Remove (debug) |
| `console.error` | `auth-provider.tsx:87` | Replace with error boundary |
| `console.error` | `login/page.tsx:82` | Replace with error handling |
| `console.error` | `deal-actions.ts` (10+ locations) | Replace with logging service |
| `console.error` | `email.ts` (4 locations) | Replace with logging service |
| `console.warn` | `crypto.ts:100` | Remove or use logger |
| `console.warn` | `pdf.ts:299` | Remove or use logger |
| `console.warn` | `email.ts:240,313` | Remove or use logger |

**Recommendation**: Add ESLint rule `"no-console": "error"` and use a logging service like Pino or Winston with log levels.

---

### 2.7 Magic Numbers & Hardcoded Values

| Value | Usage | Locations | Solution |
|-------|-------|-----------|----------|
| `2000` (ms) | Copy feedback timeout | 12+ files | `TIMING.COPY_FEEDBACK` |
| `800` (ms) | Fake save delay | Settings page | Remove (implement real save) |
| `500` (ms) | Refresh debounce | Dashboard | `TIMING.REFRESH_DEBOUNCE` |
| `7` (days) | Token expiry | crypto.ts, deal-actions.ts | `LIMITS.TOKEN_EXPIRY_DAYS` |
| `65%` | Profile completion | Settings page | Calculate dynamically |
| `10` (mins) | Session refresh interval | auth-provider.tsx | `TIMING.SESSION_CHECK_INTERVAL` |

---

### 2.8 Missing Infrastructure ⚠️

| Item | Status | Impact |
|------|--------|--------|
| Unit/Integration Tests | **None** | No test coverage, risky deploys |
| Root `middleware.ts` | Missing | No route protection at Next.js level | changes to proxy.ts file !improtant |
| `.env.example` | Missing | Onboarding difficulty |
| CI/CD Pipeline | None | No automated testing/deployment |
| Error Boundaries | Not implemented | Crashes propagate to users |
| Logging Service | None | Production debugging difficulty |
| Monitoring/APM | None | No visibility into production issues |

---

### 2.9 Database Schema Gaps

The `profiles` table is missing columns needed for Settings page persistence:

```sql
-- Required additions to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;
```

For notification preferences, a new table is needed:

```sql
CREATE TABLE IF NOT EXISTS public.user_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  notification_email_deals BOOLEAN DEFAULT TRUE,
  notification_email_reminders BOOLEAN DEFAULT TRUE,
  notification_email_marketing BOOLEAN DEFAULT FALSE,
  compact_mode BOOLEAN DEFAULT FALSE,
  font_scale NUMERIC(3,2) DEFAULT 1.00,
  reduced_motion BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);
```

---

## Critical Issues

### Priority 1: Security 🔴 (Block Launch)

1. **Add input validation with Zod**
   - All server actions accept unvalidated input
   - Risk: SQL injection, XSS, data corruption

2. **Add rate limiting**
   - No protection against abuse
   - Risk: DoS attacks, spam, resource exhaustion

3. **Implement error boundaries**
   - Errors crash the entire app
   - Risk: Poor user experience, data loss

### Priority 2: Dead Code 🟠 (Pre-Launch)

1. **Delete `lib/supabase/deals.ts`** (363 lines)
   - Server actions fully replaced all functionality
   - Causes confusion and maintenance burden

2. **Remove debug console statements** (2 locations)
   - Leaks information in production
   - Unprofessional appearance

### Priority 3: Non-Functional UI 🟡 (Launch Blocking)

1. **Settings page overhaul**
   - Remove ALL non-functional elements
   - Show "Coming Soon" badges where appropriate
   - Users lose trust when buttons don't work

2. **Replace browser alerts**
   - Use toast notifications instead
   - Professional user experience

---

## Phase 0: Security & Code Cleanup
**Timeline: 1 Week**

> **Goal**: Fix security vulnerabilities and remove dead code

### Milestone 0.1: Input Validation

- [x] Install Zod: `pnpm add zod` *(Completed: Dec 22, 2025)*
- [x] Create validation schemas in `lib/validations/`: *(Completed: Dec 22, 2025)*

```typescript
// lib/validations/deal.ts
import { z } from 'zod';

export const createDealSchema = z.object({
  title: z.string().min(1).max(200).trim(),
  description: z.string().max(1000).optional(),
  recipientName: z.string().min(1).max(100).trim(),
  recipientEmail: z.string().email().optional().or(z.literal('')),
  terms: z.array(z.object({
    label: z.string().min(1).max(100),
    value: z.string().min(1).max(500),
    type: z.enum(['text', 'number', 'date', 'currency']),
  })).max(20),
  templateId: z.string().optional(),
});

export const confirmDealSchema = z.object({
  dealId: z.string().uuid(),
  publicId: z.string().min(1),
  token: z.string().min(32),
  signatureBase64: z.string().startsWith('data:image/'),
  recipientEmail: z.string().email().optional(),
});
```

- [x] Add validation to all server actions in `deal-actions.ts` *(Completed: Dec 22, 2025)*
- [x] Add validation to profile update actions *(Completed: Dec 22, 2025)*

### Milestone 0.2: Rate Limiting

- [x] Install Upstash: `pnpm add @upstash/ratelimit @upstash/redis` *(Completed: Dec 22, 2025)*
- [x] Create rate limiter in `lib/rate-limit.ts` *(Completed: Dec 22, 2025)*
- [x] Apply rate limiting to auth, deal creation, and email actions *(Completed: Dec 22, 2025)*

### Milestone 0.3: Code Cleanup

- [x] **DELETE** `lib/supabase/deals.ts` (363 lines) *(Completed: Dec 22, 2025)*
- [x] Remove `console.log` from `auth-provider.tsx:117` *(Completed: Dec 22, 2025)*
- [x] Remove `console.log` from `login/page.tsx:75` *(Completed: Dec 22, 2025)*
- [x] Add ESLint rule: `"no-console": "error"` *(Completed: Dec 22, 2025 - set to warn)*
- [x] Generate Supabase types: `npx supabase gen types typescript` *(Completed: Dec 22, 2025)*
- [x] Remove all `eslint-disable` comments and fix properly *(7 of 9 removed, 2 remaining are justified)*

### Milestone 0.4: Shared Utilities

- [x] Create `lib/constants.ts` *(Completed: Dec 22, 2025)*
- [x] Create `hooks/useCopyToClipboard.ts` (consolidate 12+ duplicates) *(Completed: Dec 22, 2025)*
- [x] Create `lib/storage-keys.ts` for localStorage key management *(Merged into constants.ts)*

### Milestone 0.5: Error Boundaries

- [x] Create `components/error-boundary.tsx` *(Completed: Dec 22, 2025)*
- [x] Wrap main layout with error boundary *(Completed: Dec 22, 2025)*
- [x] Wrap dashboard pages with error boundary *(Completed: Dec 22, 2025)*
- [x] Add user-friendly fallback UI with retry option *(Completed: Dec 22, 2025)*

### Milestone 0.6: Documentation

- [x] Create `.env.example` with all required variables *(Completed: Dec 22, 2025)*
- [ ] Update README with setup instructions
- [ ] Document Supabase setup requirements

### Milestone 0.7: Extended Security Hardening *(NEW)*

- [x] Replace `getSession()` with `getUser()` in `auth.ts` for JWT validation *(Completed: Dec 22, 2025)*
- [x] Add Content-Security-Policy header to `next.config.ts` *(Completed: Dec 22, 2025)*
- [x] Create centralized `lib/logger.ts` utility *(Completed: Dec 22, 2025)*
- [x] Replace 35+ console statements with logger in `deal-actions.ts` and `email.ts` *(Completed: Dec 22, 2025)*
- [x] Fix 8 `any` type usages in settings/page.tsx and people/page.tsx *(Completed: Dec 22, 2025)*
- [ ] Create root `middleware.ts` for route protection at Next.js level *(in this version of next proxy.ts is used instead)*
- [ ] Add security monitoring (Sentry or similar for error tracking) *(Future)*

---

## Phase 1: Make It Work
**Timeline: 1-2 Weeks**

> **Goal**: Remove fake features and fix broken ones

### Milestone 1.1: Settings Page Cleanup

**Database changes required:**

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;
```

**Profile Tab fixes:**
- [ ] Connect name save to `updateProfileAction`
- [ ] Add job_title persistence
- [ ] Add location persistence
- [ ] Add currency persistence
- [ ] Calculate profile completion dynamically
- [ ] Connect Update Signature to signature editor

**Remove non-functional elements (show "Coming Soon"):**
- [ ] Account: 2FA toggle, Quick Login, Session management
- [ ] Billing: All Stripe-related UI
- [ ] Notifications: All toggles (until persistent)
- [ ] Appearance: Compact mode, Font scaling, Reduced motion (unless implementing)

### Milestone 1.2: Toast Notifications

- [ ] Add `sonner` package: `pnpm add sonner`
- [ ] Configure Toaster in layout
- [ ] Replace all `alert()` calls (2 locations):
  - `dashboard/page.tsx:486` - Copy link
  - `dashboard/page.tsx:492` - Nudge sent

### Milestone 1.3: People Page Persistence

**Option A: Remove non-working features**
- [ ] Remove Add Contact button
- [ ] Remove Hide/Unhide functionality
- [ ] Keep only auto-generated contacts from deals

**Option B: Add persistence (if keeping features)**
- [ ] Create `contacts` table in Supabase
- [ ] Add server actions for CRUD
- [ ] Persist custom contacts

### Milestone 1.4: Missing Pages

- [ ] Create `/terms` page (Terms of Service)
- [ ] Create `/privacy` page (Privacy Policy)
- [ ] Or remove links from login page footer

---

## Phase 2: Polish & Consistency
**Timeline: 2-3 Weeks**

### Milestone 2.1: PDF Quality

- [ ] Install `qrcode` package: `pnpm add qrcode`
- [ ] Generate actual QR code image for verification URL
- [ ] Improve layout and spacing
- [ ] Add subtle watermark design for free tier
- [ ] Professional footer with page numbers

### Milestone 2.2: UI Consistency

- [ ] Standardize card component variants
- [ ] Consistent spacing scale across all pages
- [ ] Consistent form styling (input heights, labels)
- [ ] Extract shared animation variants to `lib/animations.ts`
- [ ] Audit all pages for visual consistency

### Milestone 2.3: Loading & Error States

- [ ] All data fetching shows skeleton loaders
- [ ] All async buttons show loading state
- [ ] Form submissions disable inputs during submit
- [ ] Add offline indicator using service worker
- [ ] Graceful error handling with retry options

### Milestone 2.4: Accessibility

- [ ] Audit with axe DevTools
- [ ] Ensure proper heading hierarchy
- [ ] Add skip links
- [ ] Proper focus management in modals
- [ ] Color contrast compliance

---

## Phase 3: Core Features
**Timeline: 3-4 Weeks**

### Milestone 3.1: Custom Templates

**Database changes:**

```sql
CREATE TABLE IF NOT EXISTS public.user_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT DEFAULT 'file-text',
  fields JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_public BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- [ ] Template creation form UI
- [ ] Dynamic field management (add/remove/reorder)
- [ ] Field types: text, textarea, date, number, currency
- [ ] Save to user's collection
- [ ] Edit/delete templates
- [ ] Use custom templates in deal creation

### Milestone 3.2: Deal Attachments

- [ ] Allow image uploads during deal creation
- [ ] Support 3-5 attachments per deal
- [ ] Image compression before upload
- [ ] Display attachments in deal view
- [ ] Include attachments in PDF as appendix

### Milestone 3.3: Stored Signatures

- [ ] Save signature to user profile (signature_url in profiles table)
- [ ] Auto-fill when creating deals as creator
- [ ] Update signature in settings
- [ ] Preview saved signature

### Milestone 3.4: Email Preferences

- [ ] Create `user_preferences` table (see 2.9)
- [ ] Store notification preferences in DB
- [ ] Check preferences before sending emails
- [ ] Email frequency options
- [ ] One-click unsubscribe links in emails

---

## Phase 4: Monetization
**Timeline: 4-6 Weeks**

### Milestone 4.1: Stripe Integration

**Files to create:**

```
src/lib/stripe.ts
src/app/api/stripe/checkout/route.ts
src/app/api/stripe/webhook/route.ts
src/app/api/stripe/portal/route.ts
```

- [ ] Stripe Checkout for subscriptions
- [ ] Customer portal for management
- [ ] Webhook handling for subscription events
- [ ] Update `is_pro` field on profile
- [ ] Add `stripe_customer_id` to profiles table

### Milestone 4.2: Pro Features

- [ ] No PDF watermark for Pro users
- [ ] Custom branding options
- [ ] Unlimited deal history
- [ ] Custom templates (unlimited)
- [ ] View tracking and analytics
- [ ] Priority email delivery

### Milestone 4.3: Feature Gates

- [ ] Watermark logic based on `is_pro`
- [ ] History limits for free users (e.g., 30 days)
- [ ] Template limits (e.g., 5 for free)
- [ ] Upgrade prompts in appropriate places
- [ ] Free tier usage dashboard

---

## Phase 5: Scale
**Timeline: 6+ Weeks**

### Milestone 5.1: Testing Infrastructure

- [ ] Set up Vitest for unit testing
- [ ] Add component tests with Testing Library
- [ ] Add E2E tests with Playwright
- [ ] CI/CD pipeline with GitHub Actions
- [ ] Code coverage requirements

### Milestone 5.2: PWA Enhancement

- [ ] Offline dashboard viewing
- [ ] Offline indicator in header
- [ ] Action queue for reconnection
- [ ] Install prompts at appropriate times
- [ ] Background sync for pending actions

### Milestone 5.3: Two-Factor Authentication

- [ ] TOTP implementation with speakeasy
- [ ] QR code setup flow
- [ ] Backup codes generation
- [ ] Remember device option
- [ ] 2FA recovery flow

### Milestone 5.4: Team Accounts

- [ ] Organization creation
- [ ] Member invitations
- [ ] Shared deal visibility
- [ ] Role permissions (admin, member, viewer)
- [ ] Billing at organization level

### Milestone 5.5: API Access

- [ ] API key management in settings
- [ ] REST endpoints for external access
- [ ] Webhook notifications for deal events
- [ ] API rate limiting (separate from UI limits)
- [ ] API documentation

---

## Architecture

### Tech Stack

| Layer | Technology | Version |
|-------|------------|---------|
| Framework | Next.js (App Router) | 16.1 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| Components | Radix UI | Latest |
| Animation | Framer Motion | 12.x |
| State | Zustand + localStorage | 5.x |
| Database | Supabase (Postgres) | Latest |
| Auth | Supabase Auth | Latest |
| Email | Resend | 4.x |
| PDF | jsPDF | 3.x |
| QR Codes | qrcode.react | 4.x |

### Key Files (by size)

| Path | Lines | Purpose | Notes |
|------|-------|---------|-------|
| `d/[id]/page.tsx` | 1395 | Deal confirmation | Complex, could split |
| `dashboard/settings/page.tsx` | 1029 | Settings page | Needs overhaul |
| `deal/new/page.tsx` | 938 | Deal creation | Multi-step wizard |
| `app/actions/deal-actions.ts` | 935 | Server actions | Core API |
| `dashboard/page.tsx` | 921 | Main dashboard | |
| `dashboard/people/page.tsx` | 890 | Contacts | No persistence |
| `lib/supabase/deals.ts` | 363 | **DELETE** | Dead code |

### Directory Structure

```
src/
├── app/
│   ├── (main)/          # Protected routes
│   │   └── dashboard/   # Dashboard pages
│   ├── actions/         # Server actions
│   ├── api/             # API routes
│   ├── auth/            # Auth callback
│   ├── d/               # Public deal view
│   ├── deal/            # Deal creation
│   └── login/           # Login page
├── components/
│   ├── dashboard/       # Dashboard components
│   ├── providers/       # Context providers
│   └── ui/              # Radix UI components
├── lib/
│   └── supabase/        # Supabase utilities
├── store/               # Zustand store
└── types/               # TypeScript types
```

---

## Success Metrics

### Phase 0-1 (Security & Basics)

| Metric | Target |
|--------|--------|
| Security vulnerabilities | 0 |
| Non-functional UI elements | 0 |
| Browser alerts | 0 |
| Debug console statements | 0 |
| ESLint errors | 0 |

### Phase 2 (Polish)

| Metric | Target |
|--------|--------|
| PDF quality rating (user feedback) | 4+/5 |
| UI consistency audit | All pages match |
| Error handling coverage | 100% |
| Accessibility score | 90+ |

### Phase 3 (Features)

| Metric | Target |
|--------|--------|
| Custom templates created/week | 10+ |
| Deals with attachments | 20%+ |
| Email preference opt-out rate | <20% |

### Phase 4 (Monetization)

| Metric | Target |
|--------|--------|
| Pro conversion rate | >3% |
| Monthly churn | <5% |
| 6-month MRR | $1000+ |

### Phase 5 (Scale)

| Metric | Target |
|--------|--------|
| Test coverage | >70% |
| P99 latency | <500ms |
| Uptime | 99.9% |

---

## Action Items

### This Week — Security 🔴 *(Partially Completed)*

1. [x] **DELETE** `lib/supabase/deals.ts` *(Completed: Dec 22, 2025)*
2. [x] Install Zod and add input validation to `deal-actions.ts` *(Schemas created: Dec 22, 2025)*
3. [x] Remove 2 debug `console.log` statements *(Completed: Dec 22, 2025)*
4. [x] Create `.env.example` file *(Completed: Dec 22, 2025)*
5. [x] Set up Upstash and add rate limiting *(Completed: Dec 22, 2025)*

### Week 2 — Cleanup *(Partially Completed)*

6. [x] Generate Supabase types and fix all `any` casts *(Completed: Dec 22, 2025)*
7. [x] Create `lib/constants.ts` for magic numbers *(Completed: Dec 22, 2025)*
8. [x] Create `useCopyToClipboard` hook *(Completed: Dec 22, 2025)*
9. [x] Implement error boundaries *(Component created: Dec 22, 2025)*
10. [x] Add ESLint no-console rule *(Completed: Dec 22, 2025)*

### Week 3 — Phase 1

11. [ ] Add database columns for Settings persistence
12. [ ] Remove or implement all non-functional Settings elements
13. [ ] Replace `alert()` with toast notifications
14. [ ] Create Terms of Service page
15. [ ] Create Privacy Policy page

### Week 4 — Phase 2 Start

16. [ ] Add QR code to PDF
17. [ ] Improve PDF quality
18. [ ] UI consistency audit
19. [ ] Add loading skeletons to all pages
20. [ ] Accessibility audit with axe

---

*This roadmap provides a clear path from the current state to a production-ready application. Execute phases in order—security and cleanup first, then features. Each phase builds on the previous.*
