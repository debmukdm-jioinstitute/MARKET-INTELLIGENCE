import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";

/** Official Market Intelligence HTML email shell (card, logo, footer). */
export const MI_EMAIL = {
  pageBg: "#eef1f5",
  cardBg: "#ffffff",
  cardBorder: "#e8eaed",
  text: "#202124",
  textBody: "#3c4043",
  textMuted: "#5f6368",
  accent: "#1a73e8",
  accentBg: "#e8f0fe",
  divider: "#e8eaed",
} as const;

export function escapeMiEmailHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function miEmailSiteHost(siteUrl?: string): string {
  const raw = siteUrl?.trim() || process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.in";
  try {
    return new URL(raw).host.replace(/^www\./, "");
  } catch {
    return "getmarketintelligence.in";
  }
}

export function miEmailLogoBlock(): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
<tr>
<td valign="middle" style="padding:0 12px 0 0;">
<div style="width:40px;height:40px;border-radius:10px;background:#202124;text-align:center;line-height:40px;">
<span style="font-size:15px;font-weight:700;color:#ffffff;letter-spacing:-0.02em;">Mi</span>
</div>
</td>
<td valign="middle">
<span style="font-size:18px;font-weight:700;color:${MI_EMAIL.text};letter-spacing:-0.02em;">Market intelligence</span>
</td>
</tr>
</table>`;
}

export function miEmailBadge(label: string): string {
  const t = escapeMiEmailHtml(label.trim());
  if (!t) return "";
  return `<div style="display:inline-block;margin:0 0 16px;padding:6px 12px;background:${MI_EMAIL.accentBg};border-radius:999px;">
<span style="font-size:11px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:${MI_EMAIL.accent};">${t}</span>
</div>`;
}

export function miEmailValidUntilBox(label: string): string {
  const t = escapeMiEmailHtml(label.trim());
  if (!t) return "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin:20px 0 16px;">
<tr>
<td style="padding:14px 16px;background:${MI_EMAIL.accentBg};border-radius:10px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="padding-right:10px;font-size:16px;line-height:1;">&#128197;</td>
<td valign="middle" style="font-size:14px;font-weight:600;color:${MI_EMAIL.text};">${t}</td>
</tr></table>
</td>
</tr>
</table>`;
}

export type MiEmailCta = { label: string; href: string };

export type RenderMarketIntelligenceEmailInput = {
  preheader?: string;
  badge?: string;
  title: string;
  greeting?: string;
  /** Paragraphs and inline HTML inside the card (below greeting). */
  bodyHtml?: string;
  /** Trusted composed HTML (newsletters, briefs) — not escaped. */
  contentHtml?: string;
  validUntilLabel?: string;
  footnote?: string;
  primaryCta?: MiEmailCta;
  secondaryCta?: MiEmailCta;
  extraHtml?: string;
  siteUrl?: string;
  /** Extra footer line (e.g. unsubscribe) inside the card above signature. */
  footerNoteHtml?: string;
};

function miEmailCtaRow(primary?: MiEmailCta, secondary?: MiEmailCta): string {
  if (!primary && !secondary) return "";
  const btn = primary
    ? `<a href="${escapeMiEmailHtml(primary.href)}" style="display:inline-block;padding:12px 22px;background:${MI_EMAIL.accent};color:#ffffff;font-size:14px;font-weight:600;text-decoration:none;border-radius:8px;">${escapeMiEmailHtml(primary.label)}</a>`
    : "";
  const link = secondary
    ? `<a href="${escapeMiEmailHtml(secondary.href)}" style="font-size:14px;font-weight:500;color:${MI_EMAIL.accent};text-decoration:underline;margin-left:16px;">${escapeMiEmailHtml(secondary.label)}</a>`
    : "";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 0;"><tr>
<td valign="middle">${btn}</td>
${secondary ? `<td valign="middle">${link}</td>` : ""}
</tr></table>`;
}

export function renderMarketIntelligenceEmail(input: RenderMarketIntelligenceEmailInput): string {
  const preheader = escapeMiEmailHtml(input.preheader?.trim() ?? "");
  const title = escapeMiEmailHtml(input.title.trim());
  const greeting = input.greeting?.trim() ? `<p style="margin:0 0 12px;font-size:15px;color:${MI_EMAIL.textBody};">${escapeMiEmailHtml(input.greeting.trim())}</p>` : "";
  const body = input.bodyHtml?.trim() ?? "";
  const footnote = input.footnote?.trim()
    ? `<p style="margin:0 0 4px;font-size:14px;line-height:1.6;color:${MI_EMAIL.textMuted};">${escapeMiEmailHtml(input.footnote.trim())}</p>`
    : "";
  const host = miEmailSiteHost(input.siteUrl);
  const siteLink = input.siteUrl?.replace(/\/$/, "") || `https://${host}`;

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="margin:0;padding:0;background:${MI_EMAIL.pageBg};${GOOGLE_SANS_FONT_FAMILY_CSS};color:${MI_EMAIL.text};-webkit-font-smoothing:antialiased;">
${preheader ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>` : ""}
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:${MI_EMAIL.pageBg};padding:32px 16px;">
<tr><td align="center">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="max-width:560px;background:${MI_EMAIL.cardBg};border:1px solid ${MI_EMAIL.cardBorder};border-radius:14px;box-shadow:0 2px 8px rgba(32,33,36,0.06);">
<tr><td style="padding:32px 28px 28px;">
${miEmailLogoBlock()}
${input.badge ? miEmailBadge(input.badge) : ""}
<h1 style="margin:0 0 16px;font-size:24px;font-weight:700;line-height:1.25;color:${MI_EMAIL.text};letter-spacing:-0.02em;">${title}</h1>
${greeting}
${body}
${input.contentHtml ?? ""}
${input.validUntilLabel ? miEmailValidUntilBox(input.validUntilLabel) : ""}
${footnote}
${miEmailCtaRow(input.primaryCta, input.secondaryCta)}
${input.extraHtml ?? ""}
${input.footerNoteHtml ?? ""}
<div style="margin-top:28px;padding-top:20px;border-top:1px solid ${MI_EMAIL.divider};">
<p style="margin:0;font-size:14px;font-weight:700;color:${MI_EMAIL.text};">Debabrata Mukherjee</p>
<p style="margin:4px 0 0;font-size:13px;color:${MI_EMAIL.textMuted};">Founder, Market Intelligence</p>
<p style="margin:12px 0 0;font-size:12px;color:${MI_EMAIL.textMuted};"><a href="${escapeMiEmailHtml(siteLink)}" style="color:${MI_EMAIL.textMuted};text-decoration:none;">${escapeMiEmailHtml(host)}</a></p>
</div>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}

/** Plain-text paragraph (HTML-escaped). Pass `rawHtml: true` only for trusted inline markup. */
export function miEmailParagraph(text: string, opts?: { rawHtml?: boolean }): string {
  const inner = opts?.rawHtml ? text : escapeMiEmailHtml(text);
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.65;color:${MI_EMAIL.textBody};">${inner}</p>`;
}
