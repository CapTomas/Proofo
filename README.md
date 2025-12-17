<div align="center">
  <h1>🔏 Proofo</h1>
  <p><strong>Friction-free digital agreements that hold up.</strong></p>

  <p>
    <a href="#features"><img src="https://img.shields.io/badge/Status-Beta-blue?style=flat-square" alt="Status"></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/Next.js-16-black?style=flat-square&logo=next.js" alt="Next.js"></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/TypeScript-5-blue?style=flat-square&logo=typescript" alt="TypeScript"></a>
    <a href="#tech-stack"><img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=flat-square&logo=supabase" alt="Supabase"></a>
    <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License"></a>
  </p>
</div>

---

## 📋 Overview

**Proofo** is a modern web platform for creating verifiable, cryptographically-sealed peer-to-peer agreements. Our key innovation is **asymmetric registration** — only the deal creator needs an account, while recipients simply scan a QR code, review terms, and sign.

Perfect for:
- 🛒 **Marketplace transactions** — Buying/selling items with proof of agreement
- 🔧 **Service agreements** — Freelance work, repairs, rentals
- 🤝 **Personal deals** — Loans between friends, roommate agreements
- 📝 **Any handshake deal** that needs documentation

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **🤝 Asymmetric Registration** | Only creators need accounts — recipients just scan & sign |
| **✍️ Visual Signatures** | Draw-to-sign experience for psychological trust |
| **🔐 Cryptographic Sealing** | SHA-256 hash creates tamper-proof verification |
| **📱 Mobile-First PWA** | Installable progressive web app for any device |
| **📄 PDF Receipts** | Auto-generated professional documentation |
| **🔍 Deal Verification** | Anyone can verify authenticity via QR code or Deal ID |
| **📊 Audit Trail** | Complete immutable timeline of all deal events |
| **🎨 Modern UI** | Beautiful animations with dark/light mode support |
| **📧 Email Notifications** | Automated deal invitations via Resend |
| **📁 Templates** | Pre-built and custom deal templates |

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| **Framework** | Next.js 16 (App Router) |
| **Language** | TypeScript |
| **Styling** | Tailwind CSS v4 |
| **UI Components** | Radix UI Primitives |
| **Animation** | Framer Motion |
| **State Management** | Zustand |
| **Database** | Supabase (PostgreSQL) |
| **Authentication** | Supabase Auth (Magic Links, OAuth) |
| **Email** | Resend |
| **PDF Generation** | jsPDF |
| **Signatures** | react-signature-canvas |
| **QR Codes** | qrcode.react |
| **PWA** | Serwist |

---

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/proofo.git
cd proofo

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the app.

### Demo Mode

The app runs in **demo mode** without any backend configuration. All data is stored locally in the browser using Zustand with localStorage persistence.

---

## ⚙️ Production Setup

### Environment Variables

Create a `.env.local` file in the project root:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Email (Resend)
RESEND_API_KEY=re_xxxxxxxxxxxx

# App
NEXT_PUBLIC_APP_URL=https://your-domain.com
```

### Supabase Setup

1. Create a project at [supabase.com](https://supabase.com)
2. Run the schema in `supabase/schema.sql` via SQL Editor
3. Configure Authentication:
   - Enable Email provider (magic links)
   - Set Site URL and Redirect URLs
   - Optionally enable Google OAuth
4. Copy your Project URL and Anon Key to `.env.local`

For detailed setup instructions, see [SUPABASE_OTP_SETUP.md](SUPABASE_OTP_SETUP.md).

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── (main)/            # Protected dashboard routes
│   │   └── dashboard/     # Dashboard, agreements, settings, etc.
│   ├── actions/           # Server actions
│   ├── auth/              # Auth callback handling
│   ├── d/[id]/            # Public deal view/signing
│   ├── deal/new/          # Deal creation flow
│   └── login/             # Authentication page
├── components/            # React components
│   ├── ui/               # Reusable UI primitives
│   └── providers/        # Context providers
├── lib/                   # Utilities
│   ├── supabase/         # Supabase client & helpers
│   ├── crypto.ts         # Cryptographic hashing
│   ├── pdf.ts            # PDF generation
│   └── email.ts          # Email sending
├── store/                # Zustand state management
└── types/                # TypeScript definitions
```

---

## 📜 Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build for production |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

---

## 🔒 Security

- **Cryptographic Sealing**: Every confirmed deal is sealed with a SHA-256 hash of its contents
- **Access Tokens**: Secure, expiring tokens for recipient access
- **Row Level Security**: Supabase RLS policies protect data at the database level
- **Audit Logging**: Append-only event log for complete traceability

---

## 🤝 Contributing

Contributions are welcome! Please read our contributing guidelines before submitting a PR.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <p><strong>Proofo</strong> — Evidence that holds up. 🔏</p>
</div>
