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

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS v4, shadcn/ui
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Animation**: Framer Motion
- **State**: Zustand

## Getting Started

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Run development server
pnpm dev
```

## License

MIT