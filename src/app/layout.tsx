import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TerminalLayout } from "@/components/layout/terminal-layout";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Market Intelligence",
  description:
    "The world's best data-backed virtual portfolio management and investment intelligence platform.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`dark ${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <TerminalLayout>{children}</TerminalLayout>
      </body>
    </html>
  );
}
