const IMG_STYLE = "display:block;max-width:100%;height:auto;margin:12px 0;border:0;border-radius:4px;";
const A_STYLE = "display:block;text-decoration:none;";

export function isAllowedNewsletterClickUrl(raw: string): boolean {
  const href = raw.trim();
  if (!href) return false;
  try {
    const u = new URL(href);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

export function normalizeNewsletterClickUrl(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  if (/^https?:\/\//i.test(t)) return isAllowedNewsletterClickUrl(t) ? t : "";
  if (/^\/\//.test(t)) return isAllowedNewsletterClickUrl(`https:${t}`) ? `https:${t}` : "";
  if (/^[\w.-]+\.[a-z]{2,}/i.test(t)) return isAllowedNewsletterClickUrl(`https://${t}`) ? `https://${t}` : "";
  return "";
}

/** Strip bad links; keep https/http anchors around images. */
export function sanitizeNewsletterImageLinks(html: string): string {
  return html.replace(/<a\b([^>]*?)>([\s\S]*?)<\/a>/gi, (full, attrs: string, inner: string) => {
    if (!/<img\b/i.test(inner)) return full;
    const href =
      attrs.match(/\bhref\s*=\s*"([^"]*)"/i)?.[1] ?? attrs.match(/\bhref\s*=\s*'([^']*)'/i)?.[1] ?? "";
    const safe = normalizeNewsletterClickUrl(href);
    if (!safe) return inner;
    const cleanAttrs = attrs
      .replace(/\bhref\s*=\s*("[^"]*"|'[^']*')/i, "")
      .replace(/\btarget\s*=\s*("[^"]*"|'[^']*')/i, "")
      .replace(/\brel\s*=\s*("[^"]*"|'[^']*')/i, "")
      .replace(/\bstyle\s*=\s*("[^"]*"|'[^']*')/i, "");
    return `<a href="${safe.replace(/"/g, "&quot;")}" target="_blank" rel="noopener noreferrer" style="${A_STYLE}"${cleanAttrs}>${inner}</a>`;
  });
}

export function extractImageSrcs(html: string): string[] {
  const srcs: string[] = [];
  const re = /<img\b[^>]*\bsrc\s*=\s*("([^"]*)"|'([^']*)')[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const src = m[2] ?? m[3];
    if (src && !srcs.includes(src)) srcs.push(src);
  }
  return srcs;
}

export function readImageClickUrl(html: string, imgSrc: string): string {
  const esc = imgSrc.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const wrapped = new RegExp(`<a\\b[^>]*href\\s*=\\s*"([^"]*)"[^>]*>[\\s\\S]*?<img\\b[^>]*src\\s*=\\s*"${esc}"`, "i");
  const w = html.match(wrapped);
  if (w?.[1]) return w[1];
  const wrappedSq = new RegExp(`<a\\b[^>]*href\\s*=\\s*'([^']*)'[^>]*>[\\s\\S]*?<img\\b[^>]*src\\s*=\\s*'${esc}'`, "i");
  const ws = html.match(wrappedSq);
  return ws?.[1] ?? "";
}

/** Set or remove click-through URL for one image (by src). Browser-only helper uses DOMParser. */
export function applyImageClickUrlInHtml(html: string, imgSrc: string, clickUrlRaw: string): string {
  if (typeof DOMParser === "undefined") return html;
  const wrap = document.createElement("div");
  wrap.innerHTML = html;
  const href = normalizeNewsletterClickUrl(clickUrlRaw);

  for (const img of wrap.querySelectorAll("img")) {
    const src = img.getAttribute("src") ?? "";
    if (src !== imgSrc) continue;

    const parent = img.parentElement;
    if (!href) {
      if (parent?.tagName === "A") {
        parent.replaceWith(img);
      }
      continue;
    }

    if (parent?.tagName === "A") {
      parent.setAttribute("href", href);
      parent.setAttribute("target", "_blank");
      parent.setAttribute("rel", "noopener noreferrer");
      parent.setAttribute("style", A_STYLE);
      continue;
    }

    const a = document.createElement("a");
    a.href = href;
    a.target = "_blank";
    a.rel = "noopener noreferrer";
    a.style.cssText = A_STYLE.replace(/;/g, "");
    img.parentNode?.insertBefore(a, img);
    a.appendChild(img);
  }

  return wrap.innerHTML;
}

export function finalizeNewsletterImageBlocks(html: string): string {
  let out = sanitizeNewsletterImageLinks(html);
  out = out.replace(/<img\b([^>]*)>/gi, (_full, attrs: string, offset: number, whole: string) => {
    const before = whole.slice(Math.max(0, offset - 120), offset);
    if (/<a\b[^>]*>\s*$/i.test(before)) {
      return `<img${ensureImgAttrs(attrs)}>`;
    }
    return `<p style="margin:12px 0;line-height:0;">${`<img${ensureImgAttrs(attrs)}>`}</p>`;
  });
  out = out.replace(
    /<p([^>]*)>\s*(<a\b[^>]*>\s*<img\b[^>]*>\s*<\/a>)\s*<\/p>/gi,
    (_m, pAttrs: string, linkBlock: string) => `<p${pAttrs || ' style="margin:12px 0;line-height:0;"'}>${linkBlock}</p>`,
  );
  return out;
}

function ensureImgAttrs(attrs: string): string {
  let a = attrs;
  if (!/style\s*=/.test(a)) a += ` style="${IMG_STYLE}"`;
  else if (!/max-width/i.test(a)) a = a.replace(/style\s*=\s*"([^"]*)"/i, (_m, s: string) => `style="${s};${IMG_STYLE}"`);
  if (!/alt\s*=/.test(a)) a += ' alt=""';
  return a;
}
