import { feedFetch } from "@/lib/feeds/http";

/**
 * Best-effort extraction of readable text from a PDF buffer without a heavy
 * pdf.js dependency. Works for many SEBI/NSE prospectus PDFs that embed
 * literal strings; returns "" when the file is encrypted or image-only.
 */
export function extractPdfText(buf: Buffer, maxChars = 60_000): string {
  const raw = buf.toString("latin1");
  const chunks: string[] = [];

  // Literal strings: (Hello \(world\))
  const literalRe = /\((?:\\.|[^\\)]){2,}\)/g;
  let m: RegExpExecArray | null;
  while ((m = literalRe.exec(raw)) !== null) {
    const inner = m[0].slice(1, -1)
      .replace(/\\n/g, "\n")
      .replace(/\\r/g, "")
      .replace(/\\t/g, " ")
      .replace(/\\\(/g, "(")
      .replace(/\\\)/g, ")")
      .replace(/\\\\/g, "\\")
      .replace(/\\([0-7]{1,3})/g, (_, oct: string) => String.fromCharCode(parseInt(oct, 8)));
    if (/[A-Za-z]{3,}/.test(inner)) chunks.push(inner);
    if (chunks.join(" ").length > maxChars * 1.5) break;
  }

  // Hex strings: <48656c6c6f>
  const hexRe = /<([0-9A-Fa-f\s]{8,})>/g;
  while ((m = hexRe.exec(raw)) !== null) {
    const hex = m[1]!.replace(/\s+/g, "");
    if (hex.length % 2 !== 0) continue;
    try {
      const bytes = Buffer.from(hex, "hex").toString("utf8");
      if (/[A-Za-z]{4,}/.test(bytes)) chunks.push(bytes);
    } catch {
      /* ignore */
    }
    if (chunks.join(" ").length > maxChars * 1.5) break;
  }

  const text = chunks
    .join(" ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxChars);
  return text;
}

export async function fetchProspectusText(url: string): Promise<{ text: string; error?: string }> {
  try {
    const res = await feedFetch(url, {
      timeoutMs: 25_000,
      headers: {
        Accept: "application/pdf,application/octet-stream,text/html,*/*",
      },
    });
    if (!res.ok) return { text: "", error: `Prospectus HTTP ${res.status}` };
    const ctype = res.headers.get("content-type") ?? "";
    const buf = Buffer.from(await res.arrayBuffer());
    if (ctype.includes("html") || buf.slice(0, 15).toString("utf8").toLowerCase().includes("<!doctype")) {
      const html = buf.toString("utf8");
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 60_000);
      return { text, error: text ? undefined : "Empty HTML prospectus" };
    }
    if (buf.slice(0, 5).toString("utf8") !== "%PDF-") {
      return { text: "", error: "Prospectus is not a PDF" };
    }
    const text = extractPdfText(buf);
    return { text, error: text.length < 400 ? "Could not extract enough text from PDF (may be scanned/encrypted)" : undefined };
  } catch (e) {
    return { text: "", error: e instanceof Error ? e.message : "Prospectus fetch failed" };
  }
}
