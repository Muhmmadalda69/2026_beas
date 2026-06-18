import type { Metadata } from "next";
import { Playfair_Display, Inter, Noto_Sans_Sundanese } from "next/font/google";
import "./globals.css";

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

// The dedicated Unicode font that actually renders Aksara Sunda glyphs.
const aksara = Noto_Sans_Sundanese({
  variable: "--font-aksara",
  subsets: ["sundanese"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: {
    default: "Béas — Ensiklopedia & Pembelajaran Aksara Sunda",
    template: "%s · Béas",
  },
  description:
    "Pelajari Aksara Sunda: ensiklopedia, alat transliterasi Latin ke Aksara Sunda, dan kuis bertingkat.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="id"
      className={`${playfair.variable} ${inter.variable} ${aksara.variable} h-full`}
    >
      <body className="min-h-full">{children}</body>
    </html>
  );
}
