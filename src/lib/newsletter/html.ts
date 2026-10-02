import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";

const IMG_STYLE = "display:block;max-width:100%;height:auto;margin:12px 0;border:0;";

export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Plain text or mixed paste → safe HTML with one block per line. */
export function plainTextToHtml(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const lines = trimmed.split(/\r?\n/);
  return lines
    .map((line) => {
      const t = line.trim();
      if (!t) return "<br />";
      if (/^data:image\//i.test(t)) {
        return `<p style="margin:12px 0;"><img src="${t.replace(/"/g, "&quot;")}" alt="" style="${IMG_STYLE}" /></p>`;
      }
      return `<p style="margin:0 0 12px;line-height:1.5;">${escapeHtml(t)}</p>`;
    })
    .join("\n");
}

export function looksLikeHtml(s: string): boolean {
  return /<\s*[a-z][\s\S]*>/i.test(s);
}

export function sanitizeNewsletterHtml(html: string): string {
  let out = html;
  out = out.replace(/<script[\s\S]*?<\/script>/gi, "");
  out = out.replace(/<iframe[\s\S]*?<\/iframe>/gi, "");
  out = out.replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
  out = out.replace(/javascript:/gi, "");
  return out.trim();
}

/** Each <img> on its own row-friendly block; email-safe inline styles. */
export function normalizeNewsletterImages(html: string): string {
  return html.replace(/<img\b([^>]*)>/gi, (_full, attrs: string) => {
    let a = attrs;
    if (!/style\s*=/.test(a)) {
      a += ` style="${IMG_STYLE}"`;
    } else if (!/max-width/i.test(a)) {
      a = a.replace(/style\s*=\s*"([^"]*)"/i, (_m, s: string) => `style="${s};${IMG_STYLE}"`);
    }
    if (!/alt\s*=/.test(a)) a += ' alt=""';
    return `<p style="margin:12px 0;line-height:0;">${`<img${a}>`}</p>`;
  });
}

export function wrapNewsletterDocument(bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /></head>
<body style="${GOOGLE_SANS_FONT_FAMILY_CSS};max-width:640px;margin:0 auto;padding:16px 20px;color:#202124;font-size:15px;line-height:1.5;">
${bodyHtml}
</body></html>`;
}

export function normalizeNewsletterBody(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const base = looksLikeHtml(trimmed) ? trimmed : plainTextToHtml(trimmed);
  return normalizeNewsletterImages(sanitizeNewsletterHtml(base));
}

/** Extract data-URI images for server-side hosting. */
export function extractDataUriImages(html: string): { html: string; payloads: { full: string; contentType: string; base64: string }[] } {
  const payloads: { full: string; contentType: string; base64: string }[] = [];
  const re = /data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g;
  let match: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((match = re.exec(html)) !== null) {
    const full = match[0];
    if (seen.has(full)) continue;
    seen.add(full);
    payloads.push({ full, contentType: match[1], base64: match[2] });
  }
  return { html, payloads };
}
