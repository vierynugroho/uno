import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { FullscreenButton } from "@/components/shared/FullscreenButton";
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
  title: "UNO No Mercy",
  description: "Main UNO No Mercy multiplayer bareng teman lewat room.",
  icons: {
    // Explicit + versioned so browsers (which cache favicons very
    // aggressively) pick up the new icon instead of an old cached one.
    icon: "/favicon.ico?v=2",
    shortcut: "/favicon.ico?v=2",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <FullscreenButton />
        {children}
      </body>
    </html>
  );
}
