import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import { Provider } from "@/components/ui/provider";
import "./globals.css";

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
  metadataBase: new URL("https://shaipt.com"),
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "SHaiPT",
    title: "SHaiPT - AI Personal Training",
    description: "Your AI-powered fitness companion with personalized workout plans, nutrition guidance, and real-time form checking.",
    images: [
      {
        url: "/logo_transparent.png",
        width: 512,
        height: 512,
        alt: "SHaiPT - AI Personal Training",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "SHaiPT - AI Personal Training",
    description: "Train smarter with AI-powered workout plans, nutrition guidance, and real-time form checking.",
    images: ["/logo_transparent.png"],
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
        <meta name="theme-color" content="#15151F" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable}`}>
        <Provider defaultTheme="dark">{children}</Provider>
      </body>
    </html>
  );
}
