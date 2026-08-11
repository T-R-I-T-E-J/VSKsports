import type { Metadata } from "next";
import { Space_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";
import { I18nProvider } from "@/components/i18n/I18nProvider";

// Space Grotesk supports 300–700 (the prototype's 800 headings fall back to 700).
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const splineSansMono = Spline_Sans_Mono({
  variable: "--font-spline-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

// `??` is wrong here: Vercel supplies an unset env var as an EMPTY STRING, which
// ?? happily passes through, and `new URL("")` throws ERR_INVALID_URL at build.
// `||` treats empty as missing. VERCEL_URL covers preview deploys, whose
// hostname is generated per-deployment and so cannot be hardcoded.
const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "") ||
  "http://localhost:3000";
const DESCRIPTION =
  "Precision air rifles, pistols and pro-grade gear — backed by training, events and a nationwide dealer network.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "VSK Sports — Precision Shooting Equipment",
    template: "%s · VSK Sports",
  },
  description: DESCRIPTION,
  applicationName: "VSK Sports",
  openGraph: {
    title: "VSK Sports — Precision Shooting Equipment",
    description: DESCRIPTION,
    type: "website",
    siteName: "VSK Sports",
    locale: "en_IN",
    images: [{ url: "/vsk-logo.png", alt: "VSK Sports" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "VSK Sports — Precision Shooting Equipment",
    description: DESCRIPTION,
    images: ["/vsk-logo.png"],
  },
  icons: { icon: "/vsk-logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${splineSansMono.variable} h-full`}
    >
      <body className="min-h-full">
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
