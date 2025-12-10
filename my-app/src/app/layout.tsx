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

export const metadata: Metadata = {
  title: "BOX RAW LABS - Video Labeling Platform",
  description: "Professional boxing video labeling and annotation platform for machine learning and analysis.",
  keywords: ["boxing", "video labeling", "machine learning", "annotation", "BOX RAW LABS"],
  authors: [{ name: "BOX RAW LABS" }],
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
  openGraph: {
    title: "BOX RAW LABS - Video Labeling Platform",
    description: "Professional boxing video labeling and annotation platform for machine learning and analysis.",
    url: "https://boxrawlabs.com",
    siteName: "BOX RAW LABS",
    images: [
      {
        url: "/BoxrawLabs.jpg",
        width: 1200,
        height: 630,
        alt: "BOX RAW LABS Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "BOX RAW LABS - Video Labeling Platform",
    description: "Professional boxing video labeling and annotation platform for machine learning and analysis.",
    images: ["/BoxrawLabs.jpg"],
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
