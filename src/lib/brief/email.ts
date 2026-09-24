import { withUnsubscribeFooter } from "@/lib/newsletter";
import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";
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
  const watch = b.watch.length ? `<p style="font-size:13px;color:#202124"><b>Watch:</b> ${b.watch.map(esc).join(" · ")}</p>` : "";
  const body = `<div style="max-width:600px;margin:0 auto;padding:24px;${GOOGLE_SANS_FONT_FAMILY_CSS}">
<p style="font-size:12px;color:#5f6368;margin:0">${b.kind === "pre" ? "PRE-MARKET BRIEF" : "POST-CLOSE BRIEF"} · ${new Date(b.generatedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })} IST</p>
<h2 style="margin:6px 0 12px;font-size:20px;color:#202124">${esc(b.headline)}</h2>
<table style="width:100%;border-collapse:collapse">${items}</table>${watch}
<p style="font-size:12px;color:#5f6368"><a href="${site}/intelligence/brief" style="color:#1a73e8">Sources and full brief</a> · Generated from live data${b.engine === "llm" ? " with AI assistance" : ""}. Research and education only — not investment advice.</p>
</div>`;
  return withUnsubscribeFooter(body, email);
}
