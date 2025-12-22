# CONTEXT.md

## What is Proofo?
Digital handshake platform - cryptographically sealed P2P agreements

## Core Innovation
**Asymmetric Registration** - Only deal creators need accounts.
Recipients scan QR → review → sign. No friction.

## Target Users
- Marketplace sellers (Facebook, Craigslist)
- Freelancers doing informal contracts
- Friends making loans/agreements
- Anyone who needs "proof it happened"

## Key Success Metrics
- Time to first deal: <3 minutes
- Recipient completion rate: >70%
- Mobile usage: >80%

## Why These Tech Choices?
- **Supabase**: RLS for security, fast setup
- **Server Actions**: Simplicity over API routes
- **Zustand + localStorage**: Demo mode without backend
- **jsPDF**: Client-side generation (no server costs)
