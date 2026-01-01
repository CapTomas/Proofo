import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { AuthProvider } from "@/components/providers/auth-provider";
import { Toaster } from "sonner";
import { SpeedInsights } from "@vercel/speed-insights/next";

export const metadata: Metadata = {
  title: "Proofo | Proof Any Deal. Instantly.",
  description:
    "The instant digital handshake for everyone. Secure, legally binding proof of any agreement in seconds. No app needed for recipients.",
  keywords: [
    "digital handshake",
    "secure agreement",
    "rapid contract",
    "proof of deal",
    "legal proof",
    "instant signature",
    "contract app",
    "deal verification",
  ],
  authors: [{ name: "Proofo" }],
  creator: "Proofo",
  openGraph: {
    title: "Proofo | Proof Any Deal. Instantly.",
    description:
      "The instant digital handshake for everyone. Secure, legally binding proof of any agreement in seconds. No app needed for recipients.",
    type: "website",
    siteName: "Proofo",
  },
  twitter: {
    card: "summary_large_image",
    title: "Proofo | Proof Any Deal. Instantly.",
    description: "The instant digital handshake for everyone. Secure, legally binding proof of agreement in seconds.",
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: [{ url: "/favicon.ico" }],
    apple: [{ url: "/favicon.ico" }],
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
      <body className="min-h-screen font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          {/* JSON-LD Structured Data */}
          <script
            type="application/ld+json"
            dangerouslySetInnerHTML={{
              __html: JSON.stringify({
                "@context": "https://schema.org",
                "@type": "SoftwareApplication",
                "name": "Proofo",
                "applicationCategory": "BusinessApplication",
                "operatingSystem": "Web",
                "offers": {
                  "@type": "Offer",
                  "price": "0",
                  "priceCurrency": "USD"
                },
                "description": "The instant digital handshake. Secure, legally binding proof of any agreement in seconds.",
                "aggregateRating": {
                    "@type": "AggregateRating",
                    "ratingValue": "4.9",
                    "ratingCount": "120"
                }
              }),
            }}
          />
          <AuthProvider>{children}</AuthProvider>
          <Toaster richColors position="bottom-right" theme="system" />
          <SpeedInsights />
        </ThemeProvider>
      </body>
    </html>
  );
}
