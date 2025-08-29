import type { Metadata } from "next";
import { Geist, Geist_Mono, Goldman } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const goldman = Goldman({
  variable: "--font-goldman",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Pickem Party v2 - NFL Survivor Pool",
  description: "The ultimate NFL Survivor Pool platform with retro gaming vibes",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${goldman.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
