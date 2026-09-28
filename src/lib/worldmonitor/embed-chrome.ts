/** Hide upstream World Monitor chrome when embedded on Market Intelligence (same-origin proxy). */
export const WORLDMONITOR_EMBED_HIDE_CSS = `
.site-footer,
.digest-coverage-row,
.status-panel-container {
  display: none !important;
}
`;

function injectHideStyle(doc: Document): void {
  const id = "mi-worldmonitor-embed-chrome";
  if (doc.getElementById(id)) return;
  const style = doc.createElement("style");
  style.id = id;
  style.textContent = WORLDMONITOR_EMBED_HIDE_CSS;
  doc.head.appendChild(style);
}

export function hideWorldMonitorEmbedChrome(iframe: HTMLIFrameElement | null): void {
  if (!iframe) return;
  try {
    const doc = iframe.contentDocument;
    if (!doc?.head) return;
    injectHideStyle(doc);
    const obs = new MutationObserver(() => injectHideStyle(doc));
    obs.observe(doc.documentElement, { childList: true, subtree: true });
    window.setTimeout(() => obs.disconnect(), 120_000);
  } catch {
    /* cross-origin or not ready */
  }
}
