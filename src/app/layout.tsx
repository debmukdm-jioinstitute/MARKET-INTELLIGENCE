import type { Metadata, Viewport } from "next";
import { Google_Sans } from "next/font/google";
import { AuthProvider } from "@/components/providers/auth-provider";
import { MathInspectorProvider } from "@/components/providers/math-inspector-provider";
import { JsonLd } from "@/components/seo/json-ld";
import { absoluteUrl, pageMetadata } from "@/lib/seo/metadata";
import "katex/dist/katex.min.css";
import "./globals.css";

const googleSans = Google_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  ...pageMetadata({
    title: "Free Indian Stock Market Research & Portfolio Tools",
    description:
      "Free research terminal for Indian investors — NSE/BSE quotes, charts, fundamentals, screeners and portfolio tools.",
    path: "/",
  }),
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      name: "Market Intelligence",
      url: absoluteUrl("/"),
    },
    {
      "@type": "WebSite",
      name: "Market Intelligence",
      url: absoluteUrl("/"),
      potentialAction: {
        "@type": "SearchAction",
        target: `${absoluteUrl("/research")}?q={search_term_string}`,
        "query-input": "required name=search_term_string",
      },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${googleSans.variable} h-full antialiased`}>
      <body className="min-h-full font-sans bg-background text-foreground selection:bg-blue-600/20 selection:text-blue-700">
        <JsonLd data={orgJsonLd} />
        <AuthProvider>
          <MathInspectorProvider>{children}</MathInspectorProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
