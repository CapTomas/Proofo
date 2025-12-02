import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";

export const metadata: Metadata = {
  title: "Proofo - Digital Handshake Platform",
  description: "Create enforceable proof of any deal in 30 seconds. No signup required for the other party. Evidence that holds up.",
  keywords: ["digital agreement", "handshake", "contract", "signature", "proof", "legal", "enforceable"],
  authors: [{ name: "Proofo" }],
  creator: "Proofo",
  openGraph: {
    title: "Proofo - Digital Handshake Platform",
    description: "Create enforceable proof of any deal in 30 seconds. No signup required for the other party.",
    type: "website",
    siteName: "Proofo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proofo - Digital Handshake Platform",
    description: "Create enforceable proof of any deal in 30 seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#0a0a0a" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen font-sans antialiased">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
