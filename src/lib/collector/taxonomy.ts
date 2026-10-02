import { hfInfer } from "@/lib/hf/client";

/**
 * Zero-shot filing taxonomy (multi-label) over an announcement headline. Labels
 * feed the "What could go wrong" checklist. Runs inside collectors only. Any HF
 * failure returns null (= not labelled) — never a guessed label.
 */

export const TAXONOMY_LABELS = [
  "results",
  "guidance",
  "rating-action",
  "management-change",
  "related-party",
  "pledge",
  "litigation",
  "regulatory-action",
  "auditor-qualification",
  "default/delay",
  "fraud-allegation",
  "routine",
] as const;
export type TaxonomyLabel = (typeof TAXONOMY_LABELS)[number];

const MODEL = "MoritzLaurer/deberta-v3-base-zeroshot-v1.1-all-33";
const THRESHOLD = 0.5;

type ZeroShot = { label: string; score: number }[];

/** Labels scoring >= 0.5 for one headline, or null when the model is unavailable. */
export async function classifyHeadline(headline: string): Promise<TaxonomyLabel[] | null> {
  try {
    const raw = await hfInfer<{ inputs: string; parameters: { candidate_labels: string[]; multi_label: boolean } }, ZeroShot>(
      MODEL,
      { inputs: headline.slice(0, 600), parameters: { candidate_labels: [...TAXONOMY_LABELS], multi_label: true } },
      { ttlMs: 6 * 3600_000, maxRetries: 2, cacheKey: `taxonomy::${headline}` },
    );
    return raw.filter((r) => r.score >= THRESHOLD && (TAXONOMY_LABELS as readonly string[]).includes(r.label)).map((r) => r.label as TaxonomyLabel);
  } catch {
    return null;
  }
}

/** Label many headlines inside a time budget; rows past the budget (or after an HF failure) stay unlabelled. */
export async function labelHeadlines(headlines: string[], budgetMs = 45_000): Promise<(TaxonomyLabel[] | null)[]> {
  const deadline = Date.now() + budgetMs;
  const out: (TaxonomyLabel[] | null)[] = [];
  let down = false;
  for (const h of headlines) {
    if (down || Date.now() > deadline) {
      out.push(null);
      continue;
    }
    const labels = await classifyHeadline(h);
    if (labels === null) down = true; // HF unavailable: stop burning the run
    out.push(labels);
  }
  return out;
}
