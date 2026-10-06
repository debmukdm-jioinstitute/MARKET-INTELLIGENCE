/** Bell / push link for an ingested research report — PDF first. */
export function researchReportNotificationHref(row: {
  pdf_url?: string | null;
  url?: string | null;
}): string {
  const pdf = row.pdf_url?.trim();
  if (pdf && /^https?:\/\//i.test(pdf)) return pdf;
  const url = row.url?.trim();
  if (url && /^https?:\/\//i.test(url) && /\.pdf(\?|#|$)/i.test(url)) return url;
  if (url && /^https?:\/\//i.test(url)) return url;
  return "/research";
}

export function isExternalNotificationHref(href: string): boolean {
  return /^https?:\/\//i.test(href);
}
