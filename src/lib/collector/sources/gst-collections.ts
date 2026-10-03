import type { Collector } from "../types";
import { fetchLatestGstFromPib } from "./india-macro/gst-pib";

/**
 * Gross GST collections from the Ministry of Finance monthly PIB release.
 *
 * Honesty notes (live-verified 2026-10-03): PIB's edge returns HTTP 403 to clients that identify
 * themselves as bots and serves browsers only. We do NOT disguise the collector as a browser, so
 * when PIB blocks us this collector records a failure and the UI shows an empty state — it never
 * falls back to seeded or estimated figures. It will start landing rows by itself if/when PIB
 * serves the listing to our honest user agent. Parsing is the already-tested `parseGstFromPressHtml`
 * (headline "Gross GST revenue ... month of <Month> <Year> ... ₹<X> crore").
 */
export const gstCollections: Collector = {
  id: "gst-collections",
  actionsOnly: true,
  async run() {
    const obs = await fetchLatestGstFromPib();
    if (!obs) throw new Error("gst-collections: no parsable GST release found on the PIB Ministry of Finance listing");
    const sourceUrl = typeof obs.meta?.sourceUrl === "string" ? obs.meta.sourceUrl : "https://pib.gov.in/indexd.aspx?reg=3&lang=1";
    return [
      {
        id: "gst_gross_cr",
        label: "Gross GST collections (monthly)",
        unit: "₹ crore",
        category: "macro",
        provider: "Ministry of Finance / PIB",
        url: sourceUrl,
        obs: [obs],
      },
    ];
  },
};
