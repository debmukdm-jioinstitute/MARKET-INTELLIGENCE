import { covariance, mean, returnsFromPrices, stdev } from "@/lib/analytics";
import { callLlmJson } from "@/lib/ai/llm";
import { buildResearchDetail } from "@/lib/feeds/research-detail";

/**
 * A safe, native re-implementation of the "LLM invents its own alpha factors"
 * idea (Automate Strategy Finding with LLM in Quant Investment, EMNLP 2025,
 * arXiv:2409.06289, github.com/kouzhizhuo/Automate-Strategy-Finding-with-LLM-in-Quant-investment).
 *
 * The LLM does not generate arbitrary executable code (that would be a prompt-injection /
 * code-injection risk if it ever touched news or other untrusted text). Instead it picks
 * from a small fixed, numeric vocabulary of factor primitives; this module deterministically
 * computes and backtests whatever it picks against real historical prices for the tickers
 * you choose.
 */

const PRIMITIVES = ["mom", "rev", "vol", "invvol", "smaratio"] as const;
type Primitive = (typeof PRIMITIVES)[number];

type RawFactorIdea = {
  name: string;
  primitive: string;
  params: Record<string, number>;
  rationale: string;
  category: string;
};

type ValidFactorIdea =
  | { name: string; primitive: "smaratio"; params: { f: number; s: number }; rationale: string; category: string }
  | {
      name: string;
      primitive: Exclude<Primitive, "smaratio">;
      params: { n: number };
      rationale: string;
      category: string;
    };

export type AlphaFactorResult = {
  name: string;
  formula: string;
  category: string;
  rationale: string;
  status: "ok" | "na";
  note?: string;
  informationCoefficient: number | null;
  backtestSharpe: number | null;
  sampleSize: number;
};

export type AlphaDiscoveryResult = {
  symbols: { symbol: string; name: string; points: number }[];
  factors: AlphaFactorResult[];
  asOf: string;
  disclaimer: string;
};

const DISCLAIMER =
  "Illustrative single-universe backtest over only the tickers and history you selected — a research demo of the idea, not the paper's full cross-sectional, regime-adaptive pipeline. Not investment advice.";

function validate(raw: RawFactorIdea): ValidFactorIdea | null {
  const primitive = raw.primitive as Primitive;
  if (!PRIMITIVES.includes(primitive)) return null;
  const name = String(raw.name ?? primitive).slice(0, 60);
  const rationale = String(raw.rationale ?? "").slice(0, 300);
  const category = String(raw.category ?? "other").slice(0, 30);

  if (primitive === "smaratio") {
    const f = Math.round(Number(raw.params?.f));
    const s = Math.round(Number(raw.params?.s));
    if (!Number.isFinite(f) || !Number.isFinite(s)) return null;
    if (f < 3 || f > 120 || s < 5 || s > 200 || f >= s) return null;
    return { name, primitive, params: { f, s }, rationale, category };
  }
  const n = Math.round(Number(raw.params?.n));
  if (!Number.isFinite(n) || n < 5 || n > 120) return null;
  return { name, primitive, params: { n }, rationale, category };
}

function formula(idea: ValidFactorIdea): string {
  if (idea.primitive === "smaratio") return `smaratio(${idea.params.f},${idea.params.s})`;
  return `${idea.primitive}(${idea.params.n})`;
}

/** Returns a value per index of `closes`, or null where trailing history is insufficient. */
function evalPrimitive(closes: number[], idea: ValidFactorIdea): (number | null)[] {
  const out: (number | null)[] = new Array(closes.length).fill(null);

  if (idea.primitive === "smaratio") {
    const { f, s } = idea.params;
    for (let i = s - 1; i < closes.length; i += 1) {
      const smaFast = mean(closes.slice(i - f + 1, i + 1));
      const smaSlow = mean(closes.slice(i - s + 1, i + 1));
      out[i] = smaSlow === 0 ? null : smaFast / smaSlow - 1;
    }
    return out;
  }

  const { n } = idea.params;
  if (idea.primitive === "mom" || idea.primitive === "rev") {
    for (let i = n; i < closes.length; i += 1) {
      const m = closes[i]! / closes[i - n]! - 1;
      out[i] = idea.primitive === "mom" ? m : -m;
    }
    return out;
  }

  // vol / invvol
  for (let i = n; i < closes.length; i += 1) {
    const window = closes.slice(i - n, i + 1);
    const v = stdev(returnsFromPrices(window));
    out[i] = idea.primitive === "vol" ? v : -v;
  }
  return out;
}

function backtest(perSymbolCloses: number[][], idea: ValidFactorIdea): {
  ic: number | null;
  sharpe: number | null;
  n: number;
} {
  const xs: number[] = [];
  const ys: number[] = [];
  const stratRets: number[] = [];

  for (const closes of perSymbolCloses) {
    const values = evalPrimitive(closes, idea);
    for (let i = 0; i < closes.length - 1; i += 1) {
      const x = values[i];
      if (x == null) continue;
      const y = closes[i + 1]! / closes[i]! - 1;
      xs.push(x);
      ys.push(y);
      stratRets.push(Math.sign(x) * y);
    }
  }

  if (xs.length < 30) return { ic: null, sharpe: null, n: xs.length };

  const sx = stdev(xs);
  const sy = stdev(ys);
  const ic = sx > 0 && sy > 0 ? covariance(xs, ys) / (sx * sy) : null;
  const retStdev = stdev(stratRets);
  const sharpe = retStdev > 0 ? (mean(stratRets) / retStdev) * Math.sqrt(252) : null;
  return { ic, sharpe, n: xs.length };
}

export async function runAlphaDiscovery(symbolInputs: string[]): Promise<AlphaDiscoveryResult> {
  const unique = [...new Set(symbolInputs.map((s) => s.trim().toUpperCase()))].filter(Boolean);
  if (unique.length < 1) throw new Error("Select at least one ticker");
  if (unique.length > 8) throw new Error("Select at most 8 tickers");

  const details = await Promise.all(unique.map((s) => buildResearchDetail(s).catch(() => null)));
  const resolved = details
    .map((d, i) => (d ? { symbol: unique[i]!, name: d.name, closes: d.history.map((h) => h.value) } : null))
    .filter((d): d is { symbol: string; name: string; closes: number[] } => d !== null && d.closes.length >= 40);

  if (resolved.length === 0) {
    throw new Error("None of the selected tickers had enough price history to backtest");
  }

  const tickerList = resolved.map((r) => `${r.symbol} (${r.name}, ${r.closes.length} daily closes)`).join(", ");

  const proposal = await callLlmJson<{ factors: RawFactorIdea[] }>({
    system:
      "You are a quant researcher proposing candidate alpha factors. You may ONLY choose from this fixed vocabulary of primitives — you cannot invent new formulas or write code: " +
      "mom(n) = trailing n-day price momentum; rev(n) = -mom(n), mean reversion; vol(n) = trailing n-day realized volatility; invvol(n) = -vol(n), a low-volatility factor; smaratio(f,s) = fast/slow simple-moving-average ratio minus 1, f<s. " +
      "n must be an integer 5-120. f must be 3-120, s must be 5-200, f<s. Propose exactly 5 diverse ideas across different categories (momentum, mean-reversion, volatility, trend).",
    prompt: `Universe: ${tickerList}\n\nReturn JSON: {"factors":[{"name":"short name","primitive":"mom|rev|vol|invvol|smaratio","params":{"n":INT} or {"f":INT,"s":INT},"rationale":"1-2 sentences","category":"momentum|mean-reversion|volatility|trend"}]}`,
    maxTokens: 900,
  });

  const perSymbolCloses = resolved.map((r) => r.closes);
  const factors: AlphaFactorResult[] = [];

  for (const raw of proposal.factors ?? []) {
    const idea = validate(raw);
    if (!idea) {
      factors.push({
        name: String(raw?.name ?? "invalid factor"),
        formula: "n/a",
        category: String(raw?.category ?? "other"),
        rationale: String(raw?.rationale ?? ""),
        status: "na",
        note: "Model proposed a primitive or parameter outside the allowed range — dropped for safety.",
        informationCoefficient: null,
        backtestSharpe: null,
        sampleSize: 0,
      });
      continue;
    }
    const { ic, sharpe, n } = backtest(perSymbolCloses, idea);
    factors.push({
      name: idea.name,
      formula: formula(idea),
      category: idea.category,
      rationale: idea.rationale,
      status: ic != null ? "ok" : "na",
      note: ic == null ? "Insufficient overlapping history across the selected tickers to backtest." : undefined,
      informationCoefficient: ic,
      backtestSharpe: sharpe,
      sampleSize: n,
    });
  }

  factors.sort((a, b) => Math.abs(b.informationCoefficient ?? 0) - Math.abs(a.informationCoefficient ?? 0));

  return {
    symbols: resolved.map((r) => ({ symbol: r.symbol, name: r.name, points: r.closes.length })),
    factors,
    asOf: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}
