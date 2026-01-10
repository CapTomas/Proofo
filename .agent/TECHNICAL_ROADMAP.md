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

- [x] Asymmetric Registration (initiator only, recipient signs via link)
- [x] Trust Level System (Basic → Maximum)
- [x] OTP Verification (Email/SMS)
- [x] Multi-channel audit logging (Device, IP, Browser)
- [x] Compact mode and font scaling
- [x] Signed deal receipts via email
- [x] PWA manifest and service worker

### Critical Issues ❌
| Category | Count | Status |
|----------|-------|----------|
| Security vulnerabilities | 0 | ✅ FIXED |
| Non-functional UI elements | 0 | ✅ FIXED |
| Dead/duplicate code | 0 | ✅ FIXED |
| Missing persistence | 0 | ✅ FIXED |
| Missing tests | 0 tests | 🟡 LOW |
| Config/documentation gaps | 0 items | ✅ FIXED |

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

| Severity | Issue | Location | Status | Mitigation |
|----------|-------|----------|------|------------|
| **HIGH** | No input validation | `deal-actions.ts` | ✅ FIXED | Added Zod schemas |
| **HIGH** | No rate limiting | All server actions | ✅ FIXED | Upstash Redis |
| **HIGH** | No CSRF protection | Server actions | ✅ FIXED | Next.js headers validation |
| **MEDIUM** | Sensitive data in client | Zustand store | ✅ FIXED | Minimized stored data |
| **LOW** | Console statements | Multiple files | ✅ FIXED | ESLint no-console rule |

---

### 2.3 Non-Functional UI Elements ⚠️

#### Settings Page (Fixed)

| Tab | Element | Status | Resolution |
|-----|---------|------------------|-----------------|
| Profile | Update Signature button | ✅ FIXED | Integrated with SignatureEditor |
| Profile | Profile Completion 65% | ✅ FIXED | Calculated dynamically |
| Profile | Job Title field | ✅ FIXED | Persisted to DB/LocalStorage |
| Profile | Location field | ✅ FIXED | Persisted to DB/LocalStorage |
| Profile | Currency selector | ✅ FIXED | Persisted to DB/LocalStorage |
| Account | Language selector | 🟡 PENDING | Removed or marked as "En only" |
| Account | Two-Factor Auth toggle | 🟡 PENDING | Marked as "Coming Soon" |
| Account | Quick Login toggle | 🟡 PENDING | Marked as "Coming Soon" |
| Account | Session Logout buttons | ✅ FIXED | Integrated with Supabase SignOut |
| Account | Delete Account button | ✅ FIXED | Integrated with DeleteAction |
| Appearance | Compact Mode toggle | ✅ FIXED | Fully functional with Persistence |
| Appearance | Font Scaling slider | ✅ FIXED | Fully functional with Persistence |
| Appearance | Reduced Motion toggle | ✅ FIXED | Fully functional with Persistence |
| Billing | Pro UI | 🟡 PENDING | Marked as "Coming Soon" |
| Notifications | All 12+ toggles | ✅ FIXED | Persisted to `user_preferences` table |
| Notifications | DND buttons | ✅ FIXED | Fully functional |

#### Other Non-Functional Elements

| Location | Element | Status | Resolution |
|----------|---------|-------|-----|
| Dashboard | Nudge button | ✅ FIXED | Replaced with Sonner toast |
| Dashboard | Copy link | ✅ FIXED | Replaced with Sonner toast |
| People Page | Add Contact | ✅ FIXED | Persisted to `contacts` table |
| People Page | Hide/Unhide | ✅ FIXED | Persisted to `contacts` table (status) |
| Templates Page | Create Template | 🔴 REMOVED | Button removed until Phase 3 |
| Login | Terms/Privacy links | ✅ FIXED | Created dedicated static pages |

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

**Total: 0 eslint-disable comments (excluding intentional patterns)**

**Fix**: Generated Supabase types and resolved all 43+ warnings/errors. *(Completed: Jan 10, 2026)*

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

### 2.7 New Feature Status ✅

| Feature | Status | Implementation |
|---------|--------|----------------|
| **Asymmetric Reg** | ✅ DONE | Public ID + Access Token flow |
| **Trust Levels** | ✅ DONE | 4 levels of verification intensity |
| **OTP Engine** | ✅ DONE | Dual-provider (Resend/Twilio) + DB state |
| **Audit Trail** | ✅ DONE | Enhanced metadata + server-side logs |
| **Signatures** | ✅ DONE | Canvas-based editor + Profile storage |
| **Persistence** | ✅ DONE | User preferences + Settings sync |
| **Contacts** | ✅ DONE | People management with DB storage |

---

### 2.8 Magic Numbers & Hardcoded Values

| Item | Status | Resolution |
|------|--------|--------|
| Unit/Integration Tests | **None** | Future Phase |
| middleware.ts | Replaced | Replaced by `proxy.ts`/RLS |
| .env.example | ✅ DONE | Created in Milestone 0.6 |
| CI/CD Pipeline | None | Future Phase |
| Error Boundaries | ✅ DONE | Created in Milestone 0.5 |
| Logging Service | ✅ DONE | Created in Milestone 0.7 |
| Monitoring/APM | None | Future Phase |

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

### Priority 1: Security ✅ RESOLVED
1. **Input validation with Zod** (Milestone 0.1)
2. **Rate limiting** (Milestone 0.2)
3. **Error boundaries** (Milestone 0.5)

### Priority 2: Dead Code ✅ RESOLVED
1. **Delete lib/supabase/deals.ts** (Milestone 0.3)
2. **Remove debug console statements** (Milestone 0.7)

### Priority 3: Non-Functional UI ✅ RESOLVED
1. **Settings page overhaul** (Milestone 1.1)
2. **Replace browser alerts** (Milestone 1.2)

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
- [x] Create root `middleware.ts` for route protection at Next.js level *(Replaced by proxy.ts and RLS)*
- [ ] Add security monitoring (Sentry or similar for error tracking) *(Future)*

---

## Phase 1: Make It Work
**Timeline: 1-2 Weeks** *(Completed: Dec 22, 2025)*

> **Goal**: Remove fake features and fix broken ones

### Milestone 1.1: Settings Page Cleanup *(Completed: Dec 22, 2025)*

**Database changes required:**

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS signature_url TEXT;

-- User preferences table for notification settings
CREATE TABLE IF NOT EXISTS public.user_preferences (...);
```

**Profile Tab fixes:**
- [x] Connect name save to `updateProfileAction` *(Completed: Dec 22, 2025)*
- [x] Add job_title persistence *(Completed: Dec 22, 2025)*
- [x] Add location persistence *(Completed: Dec 22, 2025)*
- [x] Add currency persistence *(Completed: Dec 22, 2025)*
- [x] Calculate profile completion dynamically *(Already implemented)*
- [x] Connect avatar upload to `uploadAvatarAction` *(Completed: Dec 23, 2025)*
- [x] Update Signature button marked as "Coming Soon" *(Completed: Dec 23, 2025)*

**Remove non-functional elements (show "Coming Soon"):**
- [x] Account: 2FA toggle, Quick Login *(Already had Coming Soon badges)*
- [x] Billing: All Stripe-related UI *(Added Coming Soon badges, disabled buttons)*
- [x] Notifications: All toggles now persist to database *(Completed: Dec 22, 2025)*
- [x] Appearance: Compact mode, Font scaling, Reduced motion *(Already had Coming Soon badges)*

**Account Tab additions:**
- [x] Delete Account with confirmation dialog *(Completed: Dec 22, 2025)*
- [x] Account Info section with email, user ID, sign out *(Completed: Dec 23, 2025)*
- [x] Data Export section with "Coming Soon" badge *(Completed: Dec 23, 2025)*

### Milestone 1.2: Toast Notifications *(Completed: Dec 22, 2025)*

- [x] Add `sonner` package *(Already installed)*
- [x] Configure Toaster in layout *(Already configured)*
- [x] Replace all `alert()` calls *(Already done with toast.success)*
- [x] Replace all `confirm()` calls with AlertDialog *(Completed: Dec 22, 2025)*
  - Created `alert-dialog.tsx` component using Radix UI
  - Replaced void deal confirmation in `agreements/page.tsx`
  - Replaced delete contact confirmation in `people/page.tsx`

### Milestone 1.3: Asymmetric signing & Verification ✅
- [x] Implementation of `public_id` and one-time `access_token` flow *(Completed)*
- [x] Secure public signing page for non-registered users *(Completed)*
- [x] Manual token entry fallback for lost links *(Completed)*
- [x] Recognized Proofo User detection (skip OTP for logged-in recipients) *(Completed)*

### Milestone 1.4: Trust Level Engine ✅
- [x] Define `TrustLevel` type (Basic, Verified, Strong, Maximum) *(Completed)*
- [x] Implement conditional UI based on set trust level *(Completed)*
- [x] Email OTP verification for "Verified" level *(Completed)*
- [x] SMS OTP verification for "Strong" level *(Completed)*

### Milestone 1.5: Enhanced Audit & Integrity ✅
- [x] Client metadata collection (Browser, OS, Screen, timezone) *(Completed)*
- [x] Server-side IP and User Agent tracking *(Completed)*
- [x] Unified `audit_log` table with `actor_type` and `metadata` *(Completed)*
- [x] Implementation of `deal_seal` hashing logic *(Completed)*

### Milestone 1.6: Missing Pages ✅
- [x] Create `/terms` page (Terms of Service) *(Completed)*
- [x] Create `/privacy` page (Privacy Policy) *(Completed)*

---

## Phase 2: Polish & Consistency
**Timeline: 2 Weeks** *(Completed: Jan 10, 2026)*

> **Goal**: Ensure a premium, consistent, and accessible user experience

### Milestone 2.1: UI Consistency ✅
- [x] Standardize card component variants (using shadcn/ui base)
- [x] Consistent spacing scale (using Tailwind 4 utility tokens)
- [x] Consistent form styling (Standardized `Input` and `Button` components)
- [x] Extract shared animation variants to `src/lib/dashboard-ui.ts`
- [x] Audit all dashboard pages for visual consistency

### Milestone 2.2: Loading & Error States ✅
- [x] All dashboard pages show skeleton loaders (Created `loading.tsx` for templates and verify)
- [x] All async buttons show loading state via `isLoading` props
- [x] Form submissions disable inputs during submit
- [x] Graceful error handling with `ErrorBoundary` components

### Milestone 2.3: Accessibility ✅
- [x] Ensure proper heading hierarchy
- [x] Add "Skip to main content" links in `dashboard-layout.tsx`
- [x] Add `main-content` landmarks for screen readers
- [x] Proper focus management in modals (using Radix UI)

### Milestone 2.4: Code Health (ESLint Resolution) ✅
- [x] Resolved all 43+ ESLint warnings and errors across the codebase
- [x] Removed 22+ unnecessary `eslint-disable` comments
- [x] Fixed all unused imports and variables in server actions and UI components
- [x] Verified zero linting errors via `pnpm lint` flow

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

### Milestone 3.3: Stored Signatures

- [x] Save signature to user profile (signature_url in profiles table)
- [ ] Auto-fill when creating deals as creator
- [x] Update signature in settings
- [ ] Preview saved signature

### Milestone 3.4: Email Preferences

- [x] Create `user_preferences` table (see 2.9)
- [x] Store notification preferences in DB
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

- [ ] Custom branding options
- [ ] Unlimited deal history
- [ ] Custom templates (unlimited)
- [ ] View tracking and analytics
- [ ] Priority email delivery

### Milestone 4.3: Feature Gates

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
| SMS | Twilio | 5.x |
| QR Codes | qrcode.react | 4.x |

### Key Files (by size)

| Path | Lines | Purpose | Notes |
|------|-------|---------|-------|
| `d/[id]/page.tsx` | 1395 | Deal confirmation | Complex, could split |
| `dashboard/settings/page.tsx` | 1029 | Settings page | Needs overhaul |
| `deal/new/page.tsx` | 938 | Deal creation | Multi-step wizard |
| `app/actions/deal-actions.ts` | 935 | Deal-related server actions | Core API |
| `app/actions/verification-actions.ts` | 664 | OTP & Verification logic | Security Core |
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
| UI consistency audit | All pages match |
| Error handling coverage | 100% |
| Accessibility score | 90+ |

### Phase 3 (Features)

| Metric | Target |
|--------|--------|
| Custom templates created/week | 10+ |
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

### Week 3 — Phase 1 *(Completed: Dec 22, 2025)*

11. [x] Add database columns for Settings persistence *(User added user_preferences table)*
12. [x] Remove or implement all non-functional Settings elements *(Added persistence and Coming Soon badges)*
13. [x] Replace `alert()` with toast notifications *(Already done)*
14. [x] Create Terms of Service page *(Already existed)*
15. [x] Create Privacy Policy page *(Already existed)*

### Week 4 — Phase 2 Start

16. [x] Add "Skip to main content" link *(Completed: Jan 10, 2026)*
17. [x] Add loading skeletons to all pages *(Completed: Jan 10, 2026)*
18. [x] UI consistency audit *(Completed: Jan 10, 2026)*
19. [x] Resolve all ESLint issues *(Completed: Jan 10, 2026)*
20. [ ] Accessibility audit with axe *(Ongoing)*

---

*This roadmap provides a clear path from the current state to a production-ready application. Execute phases in order—security and cleanup first, then features. Each phase builds on the previous.*
