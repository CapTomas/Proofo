# Proofo

A friction-free digital platform for enforceable agreements.

## Overview

Proofo enables anyone to create verifiable, immutable proof of peer-to-peer deals without requiring both parties to register. Our core differentiator is **asymmetric registration** — only the deal creator needs an account, while recipients simply scan, sign, and agree.

> "Evidence that holds up."

## Features (MVP)

- 🤝 **Asymmetric Registration** - Creator registers, recipient just scans
- ✍️ **Visual Signatures** - Draw-to-sign for psychological trust
- 🔐 **Cryptographic Sealing** - SHA-256 hash for verification
- 📱 **Mobile-First PWA** - Works beautifully on any device
- 📄 **Instant PDF Receipts** - Professional documentation
- 🎨 **Beautiful UI** - Modern, responsive design with animations

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Animation**: Framer Motion
- **State**: Zustand
- **Signatures**: react-signature-canvas
- **QR Codes**: qrcode.react

## Getting Started

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run linting
pnpm lint
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # User dashboard
│   ├── deal/new/          # Deal creation wizard
│   ├── d/[id]/            # Recipient confirmation page
│   ├── demo/              # Interactive demo
│   └── login/             # Authentication
├── components/
│   ├── ui/                # Reusable UI components (shadcn/ui style)
│   └── signature-pad.tsx  # Signature canvas component
├── lib/
│   ├── utils.ts           # Utility functions
│   └── templates.ts       # Deal templates
├── store/                 # Zustand state management
└── types/                 # TypeScript types
```

## User Journey

1. **Creator** opens Proofo and creates a deal using templates
2. **Creator** generates QR code/shareable link
3. **Recipient** scans QR or opens link (no signup required)
4. **Recipient** reviews deal, signs on screen, clicks "Agree"
5. **System** seals deal with cryptographic hash
6. **Both parties** receive PDF receipt

## License

MIT