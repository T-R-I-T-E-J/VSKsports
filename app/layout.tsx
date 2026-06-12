import type { Metadata } from "next";
import { Space_Grotesk, Spline_Sans_Mono } from "next/font/google";
import "./globals.css";

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

export const metadata: Metadata = {
  title: {
    default: "VSK Sports — Precision Shooting Equipment",
    template: "%s · VSK Sports",
  },
  description:
    "Precision air rifles, pistols and pro-grade gear — backed by training, events and a nationwide dealer network.",
  openGraph: {
    title: "VSK Sports",
    description:
      "Precision air rifles, pistols and pro-grade gear — backed by training, events and a nationwide dealer network.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${spaceGrotesk.variable} ${splineSansMono.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
