import type { Metadata, Viewport } from "next";
import { Barlow_Condensed, Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const barlow = Barlow_Condensed({
  variable: "--font-barlow",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Khelar · Match Planner",
  description: "Our team's indoor football bookings in one place.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0a1630",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${barlow.variable} antialiased`}>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
