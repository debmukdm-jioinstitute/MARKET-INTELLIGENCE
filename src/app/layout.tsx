import type { Metadata, Viewport } from "next";
import { Google_Sans, Google_Sans_Code } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { MathInspectorProvider } from "@/components/providers/math-inspector-provider";
import "katex/dist/katex.min.css";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const googleSansCode = Google_Sans_Code({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Market Intelligence | Terminal",
  description:
    "Institutional-grade virtual portfolio management, real-time market data, and quantitative investment intelligence.",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${googleSans.variable} ${googleSansCode.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-background text-foreground selection:bg-blue-600/20 selection:text-blue-700">
        <AuthProvider>
          <MathInspectorProvider>{children}</MathInspectorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
