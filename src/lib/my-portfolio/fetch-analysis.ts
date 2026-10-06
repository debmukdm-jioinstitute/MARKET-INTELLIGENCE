import type { Holding, PortfolioAnalysis, PortfolioSettings } from "@/lib/my-portfolio/types";

export async function parsePortfolioAnalysisResponse(res: Response): Promise<PortfolioAnalysis & { error?: string }> {
  const text = await res.text();
  const trimmed = text.trim();
  if (trimmed.startsWith("<")) {
    throw new Error(
      res.status >= 500
        ? "Portfolio service temporarily unavailable — showing your last saved view."
        : "Unexpected HTML response from portfolio API — try refreshing.",
    );
  }
  let json: PortfolioAnalysis & { error?: string };
  try {
    json = JSON.parse(text) as PortfolioAnalysis & { error?: string };
  } catch {
    throw new Error("Invalid JSON from portfolio API — try refreshing.");
  }
  if (!res.ok) {
    const msg = typeof json.error === "string" ? json.error : `HTTP ${res.status}`;
    throw new Error(msg.slice(0, 200));
  }
  return json;
}

export async function fetchPortfolioAnalysis(
  url: string,
  holdings: Holding[] | null,
  settings: PortfolioSettings,
): Promise<PortfolioAnalysis> {
  const res =
    holdings && Array.isArray(holdings)
      ? await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "same-origin",
          body: JSON.stringify({ holdings, settings }),
        })
      : await fetch(url, { credentials: "same-origin" });
  return parsePortfolioAnalysisResponse(res);
}
