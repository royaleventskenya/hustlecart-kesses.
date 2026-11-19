import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegister } from "@/components/service-worker-register";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "HustleCart Kesses — We shop for you. We deliver.",
  description:
    "HustleCart Kesses is your personal shopper for Kesses. Browse the catalog or send a quick order — we'll buy from local shops and deliver to your door. Cash on delivery.",
  keywords: [
    "HustleCart",
    "Kesses",
    "Uasin Gishu",
    "Kenya",
    "personal shopper",
    "grocery delivery",
    "local market",
    "delivery",
    "cash on delivery",
  ],
  authors: [{ name: "HustleCart Kesses" }],
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "HustleCart",
    statusBarStyle: "default",
  },
  openGraph: {
    title: "HustleCart Kesses — We shop for you. We deliver.",
    description:
      "Your personal shopper for Kesses. Browse the catalog or send a quick order — we'll buy from local shops and deliver to your door.",
    siteName: "HustleCart Kesses",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#FF6B35",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <ServiceWorkerRegister />
        <SonnerToaster richColors position="top-center" />
        <Toaster />
      </body>
    </html>
  );
}
