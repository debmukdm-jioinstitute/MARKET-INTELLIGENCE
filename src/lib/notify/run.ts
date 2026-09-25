import { detectContent } from "./detect-content";
import { detectMarket } from "./detect-market";
import { publishEvents } from "./publish";
import { claimRun } from "./store";

/** Runs the live detectors (market/macro snapshot, published content). Throttled so concurrent visitors trigger it at most once per window. */
export async function runLiveDetection(minMs = 3 * 60_000): Promise<number> {
  if (!(await claimRun("live", minMs))) return 0;
  // one-time explainer so a first-time visitor sees what the bell is for (deduped by its key)
  let added = await publishEvents([{ key: "welcome:v1", category: "data", severity: "info", title: "New: the notification centre", body: "This bell lists significant changes across markets, macro data, scanners and AI signals — each with a link to the page that shows it — so you don't have to hunt for what moved.", href: "/Home" }]).catch(() => 0);
  for (const detector of [detectMarket, detectContent]) {
    try {
      added += await publishEvents(await detector());
    } catch {
      /* one failing source must not block the others */
    }
  }
  return added;
}
