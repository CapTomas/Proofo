import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Proofo - Digital Handshake Platform",
  description: "Create enforceable proof of any deal in 30 seconds. No signup required for the other party.",
  keywords: ["digital agreement", "handshake", "contract", "signature", "proof"],
  authors: [{ name: "Proofo" }],
  openGraph: {
    title: "Proofo - Digital Handshake Platform",
    description: "Create enforceable proof of any deal in 30 seconds.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased font-sans">
        {children}
      </body>
    </html>
  );
}
