import { permanentRedirect } from "next/navigation";

/** Legacy /markets URL — India cockpit is the entry point for market data. */
export default function MarketsPage() {
  permanentRedirect("/markets/india");
}
