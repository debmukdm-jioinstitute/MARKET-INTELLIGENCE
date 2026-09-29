import type { Metadata } from "next";
import { siteUrl } from "@/lib/seo/site-url";

export const SEO_BRAND_SUFFIX = "Market Intelligence";

export function absoluteUrl(path: string): string {
  const base = siteUrl();
  if (!path || path === "/") return base;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export function pageMetadata(input: {
  /** Leading phrase only — brand suffix appended automatically unless already present. */
  title: string;
  description: string;
  path: string;
  ogImagePath?: string;
  noIndex?: boolean;
}): Metadata {
  const canonical = absoluteUrl(input.path);
  const hasBrand = input.title.includes(SEO_BRAND_SUFFIX);
  const title = hasBrand ? input.title : `${input.title} | ${SEO_BRAND_SUFFIX}`;
  const ogImages = input.ogImagePath
    ? [{ url: absoluteUrl(input.ogImagePath), width: 1200, height: 630, alt: title }]
    : undefined;

  return {
    title,
    description: input.description,
    alternates: { canonical },
    openGraph: {
      title,
      description: input.description,
      url: canonical,
      siteName: SEO_BRAND_SUFFIX,
      type: "website",
      locale: "en_GB",
      ...(ogImages ? { images: ogImages } : {}),
    },
    twitter: {
      card: ogImages ? "summary_large_image" : "summary",
      title,
      description: input.description,
      ...(ogImages ? { images: ogImages.map((i) => i.url) } : {}),
    },
    robots: input.noIndex ? { index: false, follow: false } : { index: true, follow: true },
  };
}

export function formatSeoDate(iso: string | undefined): string {
  if (!iso) return new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return iso.slice(0, 10);
  return new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}
