import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { ToastProvider } from "@/components/ui/toast";
import { PWAProvider } from "@/components/providers/pwa-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "TrainAI - AI-Powered Employee Training",
  description: "Create training videos in 10 minutes. Learn faster with an AI tutor.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "TrainAI",
  },
  formatDetection: {
    telephone: false,
  },
  openGraph: {
    type: "website",
    siteName: "TrainAI",
    title: "TrainAI - AI-Powered Employee Training",
    description: "Create training videos in 10 minutes. Learn faster with an AI tutor.",
  },
  twitter: {
    card: "summary",
    title: "TrainAI - AI-Powered Employee Training",
    description: "Create training videos in 10 minutes. Learn faster with an AI tutor.",
  },
};

export const viewport: Viewport = {
  themeColor: "#2563eb",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/icon-192.png" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TrainAI" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="msapplication-TileColor" content="#2563eb" />
        <meta name="msapplication-tap-highlight" content="no" />
      </head>
      <body className={`${inter.variable} font-sans antialiased`}>
        <ErrorBoundary>
          <ToastProvider>
            <PWAProvider>
              {children}
            </PWAProvider>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
