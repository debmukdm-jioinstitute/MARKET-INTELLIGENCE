import type { Metadata, Viewport } from "next";
import Script from "next/script";
import { Google_Sans } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { MathInspectorProvider } from "@/components/providers/math-inspector-provider";
import { isFeatureEnabled } from "@/lib/api-guard";
import "katex/dist/katex.min.css";
import "./globals.css";

const CHATWITH_SCRIPT =
  "https://chatwith.tools/chatbot/253293a1-d3c2-4f2a-8542-db10574ada8d.js";

const googleSans = Google_Sans({
  variable: "--font-sans",
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

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const chatwithEnabled = await isFeatureEnabled("chatwith");

  return (
    <html lang="en" className={`${googleSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-background text-foreground selection:bg-blue-600/20 selection:text-blue-700">
        <AuthProvider>
          <MathInspectorProvider>{children}</MathInspectorProvider>
        </AuthProvider>
        {chatwithEnabled ? <Script src={CHATWITH_SCRIPT} strategy="lazyOnload" /> : null}
      </body>
    </html>
  );
}
