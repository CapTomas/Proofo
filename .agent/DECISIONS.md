# DECISIONS.md

## Architecture Decisions

### Why Server Actions instead of API routes?
- Simpler auth flow (automatic cookie handling)
- Type-safe without extra boilerplate
- Closer to React Server Components pattern

### Why Zustand instead of React Context?
- Demo mode needs localStorage persistence
- Simpler than Redux, more powerful than Context
- No provider nesting hell

### Why NOT use React Hook Form?
- Most forms are simple (1-3 fields)
- Controlled inputs + Zod is sufficient
- One less dependency

### Why magic links over password auth?
- Lower friction for deal creators
- No password reset flow needed
- Better security (no weak passwords)

## Rejected Ideas

### ❌ Real-time collaboration
- Adds complexity, minimal value
- Deals are typically 1:1 async

### ❌ Blockchain verification
- SHA-256 + database is sufficient
- No need for decentralization overhead

### ❌ Mobile native apps
- PWA covers 90% of use cases
- Native would be maintenance burden
