import type { Metadata, Viewport } from "next";
import { Fraunces, Work_Sans } from "next/font/google";
import "./globals.css";
import RegisterSW from "./register-sw";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://joinbambanani.co.za";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Bambanani | Free Community Safety App for South African Women",
    template: "%s | Bambanani",
  },
  description:
    "Bambanani is a free community safety app for South Africa. Send an SOS alert with one shake, keep trusted contacts and a community watch list, and get safety check-ins. Built to help stop GBV before it happens.",
  keywords: [
    "GBV safety app South Africa",
    "SOS app for women",
    "community watch app South Africa",
    "free panic button app SA",
    "women's safety app South Africa",
    "gender-based violence app",
    "Bambanani",
  ],
  manifest: "/manifest.json",
  icons: {
    icon: "/icons/favicon-32.png",
    apple: "/icons/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: SITE_URL,
    siteName: "Bambanani",
    title: "Bambanani | Free Community Safety App for South African Women",
    description:
      "A free community safety app for South Africa. Shake your phone to send an SOS to your trusted contacts and community watch list.",
    images: [
      {
        url: "/icons/icon-512.png",
        width: 512,
        height: 512,
        alt: "Bambanani",
      },
    ],
  },
  twitter: {
    card: "summary",
    title: "Bambanani | Free Community Safety App for South African Women",
    description:
      "A free community safety app for South Africa. Shake your phone to send an SOS to your trusted contacts and community watch list.",
    images: ["/icons/icon-512.png"],
  },
};

export const viewport: Viewport = {
  themeColor: "#0E3A3B",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${fraunces.variable} ${workSans.variable} h-full`}>
      <body className="min-h-full flex flex-col antialiased">
        <RegisterSW />
        {children}
      </body>
    </html>
  );
}
