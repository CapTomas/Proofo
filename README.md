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
- 🔍 **Deal Verification** - Verify any deal's authenticity
- 📊 **Audit Trail** - Complete timeline of deal events

## Tech Stack

- **Frontend**: Next.js 16, TypeScript, Tailwind CSS v4, Radix UI
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **Animation**: Framer Motion
- **State**: Zustand
- **Signatures**: react-signature-canvas
- **QR Codes**: qrcode.react

## Quick Start (Demo Mode)

The application can run in demo mode without any backend configuration:

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint
```

In demo mode, all data is stored locally in the browser using Zustand with localStorage persistence.

## Full Setup with Supabase

### Prerequisites

- Node.js 18+
- npm or pnpm
- A [Supabase](https://supabase.com) account (free tier works)

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/login
2. Click "New Project" and fill in:
   - **Organization**: Select or create one
   - **Project name**: `proofo` (or your preferred name)
   - **Database Password**: Generate a strong password (save this!)
   - **Region**: Choose closest to your users
3. Wait for the project to be provisioned (takes ~2 minutes)

### 2. Set Up the Database Schema

1. In your Supabase dashboard, go to **SQL Editor**
2. Click "New Query"
3. Copy the entire contents of [`supabase/schema.sql`](./supabase/schema.sql) and paste it
4. Click "Run" to execute the schema
5. You should see "Success. No rows returned" - this is correct!

### 3. Configure Authentication

1. In Supabase dashboard, go to **Authentication** > **Providers**
2. **Email**: Enabled by default. For magic links:
   - Go to **Authentication** > **Email Templates**
   - Customize the "Magic Link" template if desired
3. **Google OAuth** (optional):
   - Go to **Authentication** > **Providers** > **Google**
   - Toggle "Enable Sign in with Google"
   - Follow the setup instructions to get Google OAuth credentials
   - Add your Google Client ID and Secret

4. **Site URL Configuration**:
   - Go to **Authentication** > **URL Configuration**
   - Set **Site URL**: `http://localhost:3000` (for development)
   - Add **Redirect URLs**:
     - `http://localhost:3000/auth/callback`
     - Your production URL (e.g., `https://yourapp.com/auth/callback`)

### 4. Get Your API Keys

1. Go to **Settings** > **API** in your Supabase dashboard
2. Note these values:
   - **Project URL** (looks like `https://xxxxx.supabase.co`)
   - **anon public** key (long string starting with `eyJ...`)

### 5. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: For production deployment
# NEXT_PUBLIC_APP_URL=https://yourapp.com

# Optional: Email Service (Resend)
# Required for sending deal receipts via email
# Sign up at https://resend.com and get your API key
# RESEND_API_KEY=re_xxxxxxxxxx
# RESEND_FROM_EMAIL=Proofo <noreply@yourdomain.com>
```

### 6. Configure Email Service (Optional)

To enable email functionality (sending deal receipts with PDF attachments):

1. Sign up for [Resend](https://resend.com) (free tier includes 3,000 emails/month)
2. Create an API key in the Resend dashboard
3. Add your domain and verify it (or use the sandbox for testing)
4. Add these environment variables:

```bash
RESEND_API_KEY=re_xxxxxxxxxx
RESEND_FROM_EMAIL=Proofo <noreply@yourdomain.com>
```

**Note:** Without these variables, the app will show "Email service not configured" when trying to send receipts. PDF downloads will still work without email configuration.

### 7. Run the Application

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

## Testing the Full Flow

### 1. Creator Flow (Sign Up & Create Deal)

1. Click "Get Started" or go to `/login`
2. Sign in with Google or enter your email for a magic link
3. Complete the onboarding (enter your name)
4. Click "New Deal" to create your first proof
5. Select a template (e.g., "Lend Item")
6. Fill in the recipient's name and deal details
7. Review and click "Create Deal"
8. Copy the share link or scan the QR code

### 2. Recipient Flow (Sign Deal)

1. Open the deal link in a new browser/incognito window
2. Review the deal terms
3. Click "Sign to Accept"
4. Draw your signature on the pad
5. Click "Agree & Seal"
6. (Optional) Enter your email to receive a receipt
7. See the confirmation with deal seal hash

### 3. Verification Flow

1. Go to `/verify`
2. Enter a deal ID (the short code from the URL)
3. View the verification status and audit trail

### 4. Dashboard Features

- **View all deals**: See pending, confirmed, and voided deals
- **Nudge**: Re-copy link for pending deals
- **Void**: Cancel a deal (creates a voided status)
- **Filter**: Filter by status
- **Search**: Search by title or recipient name

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── dashboard/         # User dashboard
│   ├── deal/new/          # Deal creation wizard
│   ├── d/[id]/            # Recipient confirmation page
│   ├── demo/              # Interactive demo
│   ├── login/             # Authentication
│   ├── auth/callback/     # Auth callback handler
│   ├── settings/          # User settings
│   ├── templates/         # Deal templates browser
│   └── verify/            # Deal verification
├── components/
│   ├── ui/                # Reusable UI components (shadcn/ui style)
│   ├── signature-pad.tsx  # Signature canvas component
│   ├── onboarding-modal.tsx
│   └── providers/         # React context providers
├── lib/
│   ├── utils.ts           # Utility functions
│   ├── templates.ts       # Deal templates
│   ├── crypto.ts          # Cryptographic functions
│   └── supabase/          # Supabase client and services
│       ├── client.ts      # Supabase client
│       ├── auth.ts        # Auth functions
│       ├── deals.ts       # Deal CRUD operations
│       └── types.ts       # Database types
├── store/                 # Zustand state management
├── types/                 # TypeScript types
└── supabase/
    └── schema.sql         # Database schema
```

## User Journey

1. **Creator** opens Proofo and creates a deal using templates
2. **Creator** generates QR code/shareable link
3. **Recipient** scans QR or opens link (no signup required)
4. **Recipient** reviews deal, signs on screen, clicks "Agree"
5. **System** seals deal with cryptographic hash
6. **Both parties** can view the confirmed deal and verification

## Development

### Commands

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint
```

### Key Files to Understand

- `src/store/index.ts` - Zustand store with all app state
- `src/lib/supabase/` - Supabase integration
- `src/app/d/[id]/page.tsx` - Recipient confirmation flow
- `src/app/deal/new/page.tsx` - Deal creation wizard

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | For auth | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | For auth | Your Supabase anon/public key |
| `NEXT_PUBLIC_APP_URL` | For production | Your production app URL |
| `RESEND_API_KEY` | For email | Your Resend API key for sending emails |
| `RESEND_FROM_EMAIL` | For email | Sender email address (e.g., `Proofo <noreply@yourdomain.com>`) |

## Troubleshooting

### "Supabase is not configured" message

This means the app is running in demo mode. Add your Supabase environment variables to enable full functionality.

### "Email service not configured" message

This means the email service (Resend) is not set up. Add `RESEND_API_KEY` to your environment variables to enable email receipts. See the [Email Service Setup](#6-configure-email-service-optional) section.

### Magic link not arriving

1. Check your spam folder
2. Verify the email in Supabase Auth dashboard
3. Check Supabase logs for any delivery errors

### Google OAuth not working

1. Ensure you've added `http://localhost:3000/auth/callback` to authorized redirect URIs in Google Cloud Console
2. Verify the Client ID and Secret are correct in Supabase

### Database errors

1. Make sure you ran the entire `schema.sql` file
2. Check the Supabase Logs for specific error messages
3. Verify RLS policies are enabled

## License

MIT
