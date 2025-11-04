import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#8b5cf6",
};

export const metadata: Metadata = {
  title: "Ringba After-Hours Tracker | Call Center Performance Analytics",
  description:
    "Track and analyze after-hours call performance, callback rates, and lead conversion across multiple call centers. Monitor operating hours, call rates, and missed opportunities in real-time.",
  keywords:
    "ringba, call tracking, after hours calls, call center analytics, lead tracking, callback rates, call center performance, irev integration",
  authors: [{ name: "AI Wealth" }],
  robots: "noindex, nofollow",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/apple-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Ringba After-Hours Tracker",
    description:
      "Track after-hours call performance and callback rates across call centers",
    type: "website",
    siteName: "Ringba After-Hours Tracker",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Ringba Tracker",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#8b5cf6" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Ringba Tracker" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
