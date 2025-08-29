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
  metadataBase: new URL('https://www.pickemparty.app'),
  title: "Pick'em Party - NFL Survivor Pool",
  description: "🏈 The ultimate NFL Survivor Pool with retro 8-bit vibes! Pick teams, survive eliminations, and claim victory in your league!",
  keywords: ["NFL", "Survivor Pool", "Football", "Picks", "Elimination", "Fantasy Football", "Sports Betting"],
  authors: [{ name: "Pick'em Party" }],
  creator: "Pick'em Party",
  publisher: "Pick'em Party",
  openGraph: {
    title: "Pick'em Party - NFL Survivor Pool 🏈",
    description: "Join the ultimate NFL Survivor Pool experience! Pick teams, survive eliminations, and dominate your league with retro gaming style!",
    images: [
      {
        url: "/football-pickem-party-app-meta-hero.webp",
        width: 1024,
        height: 1024,
        alt: "Pick'em Party - Get in on the action!",
      }
    ],
    locale: "en_US",
    type: "website",
    siteName: "Pick'em Party",
  },
  twitter: {
    card: "summary_large_image",
    title: "Pick'em Party - NFL Survivor Pool 🏈",
    description: "Join the ultimate NFL Survivor Pool! Pick teams, survive eliminations, claim victory! 🎮⚡",
    images: ["/football-pickem-party-app-meta-hero.webp"],
    creator: "@pickemparty",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "your-google-verification-code",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="icon" type="image/png" href="/favicon.png" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${goldman.variable} antialiased`}
      >
        <div className="min-h-screen flex flex-col">
          <main className="flex-1">
            {children}
          </main>
          <footer className="border-t border-border bg-surface p-4">
            <div className="text-center text-sm text-muted-foreground">
              made with ❤️ & 🥃 by{' '}
              <a 
                href="https://x.com/tgauss" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:text-primary-hover transition-colors"
              >
                @tgauss
              </a>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
