export type Stance = "Bullish" | "Defensive" | "Neutral";

export type BriefItem = { theme: string; stance: Stance; text: string; sources: string[] };

export type Brief = {
  kind: "pre" | "post";
  generatedAt: string;
  headline: string;
  items: BriefItem[];
  watch: string[];
  /** Facts the brief was allowed to use, by id — every item's `sources` must be a subset of these ids. */
  facts: { id: string; label: string; value: string; provider: string }[];
  headlines: { title: string; link: string; source: string }[];
  engine: "llm" | "rules";
};
