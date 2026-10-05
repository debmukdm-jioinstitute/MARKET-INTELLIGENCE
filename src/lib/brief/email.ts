import { renderMarketIntelligenceEmail } from "@/lib/email/market-intelligence-layout";
import { withUnsubscribeFooter } from "@/lib/newsletter";
import type { Brief } from "./types";

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const COLOR: Record<string, string> = { Bullish: "#137333", Defensive: "#c5221f", Neutral: "#5f6368" };

export function briefSubject(b: Brief): string {
  return `${b.kind === "pre" ? "Pre-market" : "Post-close"} brief — ${b.headline}`.slice(0, 150);
}

export function briefHtml(b: Brief, email: string): string {
  const site = process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.vercel.app";
  const items = b.items
    .map(
      (i) => `<tr><td style="padding:10px 0;border-bottom:1px solid #e8eaed;">
<span style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:${COLOR[i.stance]}">${i.stance} · ${esc(i.theme)}</span>
<div style="font-size:14px;color:#202124;margin-top:2px">${esc(i.text)}</div></td></tr>`,
    )
    .join("");
  const watch = b.watch.length ? `<p style="font-size:13px;color:#202124;margin:12px 0 0"><b>Watch:</b> ${b.watch.map(esc).join(" · ")}</p>` : "";
  const when = new Date(b.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  const contentHtml = `<p style="margin:0 0 8px;font-size:12px;color:#5f6368;">${esc(when)} IST</p>
<table style="width:100%;border-collapse:collapse">${items}</table>${watch}
<p style="margin:16px 0 0;font-size:12px;color:#5f6368;">Generated from live data${b.engine === "llm" ? " with AI assistance" : ""}. Research and education only — not investment advice.</p>`;

  const doc = renderMarketIntelligenceEmail({
    preheader: b.headline,
    badge: b.kind === "pre" ? "PRE-MARKET BRIEF" : "POST-CLOSE BRIEF",
    title: b.headline,
    contentHtml,
    primaryCta: { label: "Read full brief →", href: `${site}/intelligence/brief` },
    siteUrl: site,
  });
  return withUnsubscribeFooter(doc, email);
}
