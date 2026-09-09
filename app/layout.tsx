import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron, Caveat, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { SITE_URL, SITE_NAME, OG_IMAGE } from "@/lib/seo";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700', '800', '900'],
});

const caveat = Caveat({
  variable: "--font-caveat",
  subsets: ["latin"],
  weight: ['400', '500', '600', '700'],
});

/** Editorial display serif for the landing page (title sequence, chapters, statements). */
const editorial = Instrument_Serif({
  variable: "--font-editorial",
  subsets: ["latin"],
  weight: ['400'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: {
    default: "SHaiPT - AI Personal Training",
    template: "%s | SHaiPT",
  },
  description: "Your AI-powered fitness companion with personalized workout plans, nutrition guidance, and real-time form checking. Train smarter with AI coaching.",
  keywords: [
    "AI personal trainer",
    "workout planner",
    "fitness app",
    "nutrition tracking",
    "form checking",
    "AI coaching",
    "training plans",
    "body composition",
    "meal planning",
  ],
  authors: [{ name: "SHaiPT" }],
  creator: "SHaiPT",
  // The apex 307s to www; absolute URLs must point at the host that actually serves 200.
  metadataBase: new URL(SITE_URL),
  // "./" resolves against the *current* route, so every page emits a self-referencing canonical
  // rather than every page claiming to be a duplicate of the landing page.
  alternates: {
    canonical: "./",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: SITE_NAME,
    title: "SHaiPT - AI Personal Training",
    description: "Your AI-powered fitness companion with personalized workout plans, nutrition guidance, and real-time form checking.",
    url: "./",
    images: [
      {
        url: "/og.png",
        width: OG_IMAGE.width,
        height: OG_IMAGE.height,
        alt: OG_IMAGE.alt,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SHaiPT - AI Personal Training",
    description: "Train smarter with AI-powered workout plans, nutrition guidance, and real-time form checking.",
    images: ["/og.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  icons: {
    icon: "/logo_transparent.png",
    apple: "/logo_transparent.png",
  },
  manifest: undefined,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
        <meta name="theme-color" content="#08080C" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} ${caveat.variable} ${editorial.variable}`}>
        {children}
      </body>
    </html>
  );
}
