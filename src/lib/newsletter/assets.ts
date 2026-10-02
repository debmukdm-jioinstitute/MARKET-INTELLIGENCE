import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { extractDataUriImages, normalizeNewsletterBody } from "@/lib/newsletter/html";

const MAX_ASSET_BYTES = 4 * 1024 * 1024;

export function newsletterAssetPublicUrl(id: string): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.in").replace(/\/$/, "");
  return `${base}/api/newsletter/assets/${id}`;
}

export async function storeNewsletterAsset(contentType: string, data: Buffer): Promise<string> {
  if (!hasDatabase()) throw new Error("No database configured");
  if (data.length > MAX_ASSET_BYTES) throw new Error("Image too large (max 4 MB)");
  if (!contentType.startsWith("image/")) throw new Error("Only image uploads are allowed");
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    INSERT INTO newsletter_assets (content_type, data)
    VALUES (${contentType}, ${data})
    RETURNING id
  `) as { id: string }[];
  return newsletterAssetPublicUrl(rows[0]!.id);
}

export async function getNewsletterAsset(id: string): Promise<{ contentType: string; data: Buffer } | null> {
  if (!hasDatabase()) return null;
  await ensureSchema();
  const db = sql();
  const rows = (await db`
    SELECT content_type, data FROM newsletter_assets WHERE id = ${id}::uuid LIMIT 1
  `) as { content_type: string; data: Buffer }[];
  const row = rows[0];
  if (!row) return null;
  return { contentType: row.content_type, data: row.data };
}

/** Host pasted data-URIs and return email-ready HTML. */
export async function prepareNewsletterHtml(raw: string): Promise<string> {
  let html = normalizeNewsletterBody(raw);
  const { payloads } = extractDataUriImages(html);
  for (const p of payloads) {
    const buf = Buffer.from(p.base64, "base64");
    const url = await storeNewsletterAsset(p.contentType, buf);
    html = html.split(p.full).join(url);
  }
  return html;
}
