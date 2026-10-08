/**
 * Plain-language explanations for the "Go deeper" metrics, plus the worked derivation of beta and
 * Jensen's alpha using the user's own numbers. Everything here mirrors metrics-spec-engine.ts
 * (daily returns, A = 252, sample statistics, risk-free from RF_ANNUAL) and invents no inputs:
 * with no `regression` the derivation is simply omitted.
 */

import type { RegressionInputs } from "./metrics-spec-engine";

export type ExplainSymbol = { symbol: string; meaning: string; value?: string };
export type ExplainStep = { title: string; latex: string; note: string };

export type Explanation = {
  id: ExplainId;
  title: string;
  /** The headline number exactly as shown on the card. */
  value: string;
  definition: string;
  /** What it means for the user's money, tailored to the current value when we can. */
  impact: string[];
  formula: string;
  symbols: ExplainSymbol[];
  steps: ExplainStep[];
  caveats: string[];
};

export type ExplainId = "alpha" | "beta" | "sharpe" | "sortino" | "treynor" | "informationRatio" | "var" | "trackingError";

export const EXPLAINABLE: ReadonlySet<string> = new Set<ExplainId>(["alpha", "beta", "sharpe", "sortino", "treynor", "informationRatio", "var", "trackingError"]);

/** Catalog ids that mean the same thing as an explainable id. */
export const EXPLAIN_ALIAS: Record<string, ExplainId> = { jensensAlpha: "alpha", alpha: "alpha", beta: "beta" };

export type ExplainContext = {
  value: string;
  benchmark: string;
  regression?: RegressionInputs | null;
};

const f = (x: number, d = 2) => (Number.isFinite(x) ? x.toFixed(d) : "—");
const pct = (x: number, d = 2) => `${f(x * 100, d)}\\%`;
/** Plain-text percent for prose and the symbol table (not LaTeX). */
const ppct = (x: number, d = 2) => `${f(x * 100, d)}%`;
const sci = (x: number, d = 6) => (Number.isFinite(x) ? x.toFixed(d) : "—");

/** t-statistic of the daily alpha intercept from the same regression (OLS standard error). */
export function alphaTStat(r: RegressionInputs): number | null {
  if (r.n < 4 || r.rSquared == null || r.beta == null) return null;
  const resVar = (1 - r.rSquared) * r.sigmaP ** 2 * ((r.n - 1) / (r.n - 2));
  const sxx = (r.n - 1) * r.varB;
  if (sxx <= 0 || resVar <= 0) return null;
  const se = Math.sqrt(resVar * (1 / r.n + r.meanExcessBenchmark ** 2 / sxx));
  return se > 0 ? r.alphaDaily / se : null;
}

function betaBand(b: number) {
  if (b < 0) return "negative: it has tended to move opposite to the benchmark";
  if (b < 0.8) return "defensive: it has swung less than the benchmark";
  if (b <= 1.2) return "market-like: it has moved roughly in step with the benchmark";
  return "aggressive: it has swung more than the benchmark";
}

function betaExplanation({ value, benchmark, regression: r }: ExplainContext): Explanation {
  const b = r?.beta ?? null;
  const impact: string[] = [
    "Beta is your portfolio's market risk. It is how many percent your portfolio has moved, on average, for each 1% move in the benchmark.",
    "It drives how much you gain when markets rise and lose when they fall, and how many index futures you would sell to hedge the market part of your book.",
  ];
  if (b != null) {
    impact.push(`Your beta is ${f(b)}, so it is ${betaBand(b)}. As a rule of thumb, a 10% fall in ${benchmark} has gone with roughly a ${f(Math.abs(b) * 10, 1)}% ${b >= 0 ? "fall" : "rise"} in your portfolio.`);
    if (r?.rSquared != null) {
      impact.push(`R² is ${f(r.rSquared * 100, 0)}%: ${benchmark} explains that share of your daily ups and downs. The rest comes from the specific stocks you hold, so beta is a better guide when R² is high.`);
    }
  }
  const steps: ExplainStep[] = r && b != null
    ? [
        {
          title: "Daily returns",
          latex: `R_{p,t}=\\frac{V_t}{V_{t-1}}-1,\\qquad R_{m,t}=\\frac{M_t}{M_{t-1}}-1,\\qquad N=${r.n}\\text{ paired days}`,
          note: `V is your portfolio value and M the ${benchmark} level on day t, for the ${r.n} days both series have a price.`,
        },
        {
          title: "Benchmark variance",
          latex: `\\text{Var}(R_m)=\\frac{1}{N-1}\\sum_{t}(R_{m,t}-\\bar R_m)^2=${sci(r.varB, 8)}\\quad(\\sigma_m=${pct(r.sigmaB, 3)}\\text{ per day})`,
          note: "How much the benchmark moves day to day. It is the denominator: beta is measured per unit of benchmark movement.",
        },
        {
          title: "Covariance with the benchmark",
          latex: `\\text{Cov}(R_p,R_m)=\\frac{1}{N-1}\\sum_{t}(R_{p,t}-\\bar R_p)(R_{m,t}-\\bar R_m)=${sci(r.covPB, 8)}`,
          note: "Positive when your portfolio and the benchmark tend to move the same way on the same day, negative when they move opposite.",
        },
        {
          title: "Beta",
          latex: `\\beta=\\frac{\\text{Cov}(R_p,R_m)}{\\text{Var}(R_m)}=\\frac{${sci(r.covPB, 8)}}{${sci(r.varB, 8)}}=${f(b, 4)}`,
          note: `This is exactly the slope of the best-fit line of your daily returns against ${benchmark}'s (ordinary least squares).`,
        },
        ...(r.correlation != null
          ? [
              {
                title: "Cross-check with correlation",
                latex: `\\beta=\\rho_{p,m}\\cdot\\frac{\\sigma_p}{\\sigma_m}=${f(r.correlation, 4)}\\times\\frac{${pct(r.sigmaP, 3)}}{${pct(r.sigmaB, 3)}}=${f(b, 4)}`,
                note: "The same number: how closely you track the benchmark (correlation) times how large your own swings are relative to it.",
              },
            ]
          : []),
      ]
    : [];
  return {
    id: "beta",
    title: "Portfolio Beta",
    value,
    definition: `Beta measures the sensitivity of your portfolio's returns to the benchmark (${benchmark}). Beta 1 means it moves one-for-one with the benchmark, below 1 it moves less, above 1 it moves more.`,
    impact,
    formula: "\\beta=\\frac{\\text{Cov}(R_p,R_m)}{\\text{Var}(R_m)}=\\rho_{p,m}\\,\\frac{\\sigma_p}{\\sigma_m}",
    symbols: [
      { symbol: "\\beta", meaning: "Portfolio beta: change in your return per 1 unit change in the benchmark return", value: b != null ? f(b, 4) : value },
      { symbol: "R_{p,t}", meaning: "Your portfolio's return on day t (change in total value, including price moves of every holding)" },
      { symbol: "R_{m,t}", meaning: `${benchmark} return on day t` },
      { symbol: "\\text{Cov}(R_p,R_m)", meaning: "Sample covariance of the two daily return series (divides by N−1)", value: r ? sci(r.covPB, 8) : undefined },
      { symbol: "\\text{Var}(R_m)", meaning: "Sample variance of the benchmark's daily returns", value: r ? sci(r.varB, 8) : undefined },
      { symbol: "\\rho_{p,m}", meaning: "Correlation between portfolio and benchmark daily returns, from −1 to +1", value: r?.correlation != null ? f(r.correlation, 4) : undefined },
      { symbol: "\\sigma_p,\\ \\sigma_m", meaning: "Standard deviation of daily returns of the portfolio and the benchmark", value: r ? `${ppct(r.sigmaP, 3)}, ${ppct(r.sigmaB, 3)}` : undefined },
      { symbol: "N", meaning: "Number of days with both a portfolio and a benchmark return", value: r ? String(r.n) : undefined },
    ],
    steps,
    caveats: [
      "Beta is backward-looking: it describes the window above, not a promise about the next market move.",
      "It changes with the benchmark you pick and with the window length. A few months of data gives a noisy estimate.",
      "It captures only linear co-movement with one index, not sector, currency or company-specific risk.",
    ],
  };
}

function alphaExplanation({ value, benchmark, regression: r }: ExplainContext): Explanation {
  const a = r?.alphaAnnual ?? null;
  const t = r ? alphaTStat(r) : null;
  const impact: string[] = [
    "Alpha is the return you earned above (or below) what your market risk alone should have paid. It separates stock-picking and timing from simply being invested in a rising or falling market.",
    "Positive alpha means your choices added value after allowing for how much market risk you took. Negative alpha means a benchmark-like index position with the same beta would have done better.",
  ];
  if (a != null && r) {
    impact.push(
      `Your alpha is ${a >= 0 ? "+" : "−"}${f(Math.abs(a) * 100)}% a year. With a beta of ${f(r.beta ?? 0)}, CAPM says a portfolio like yours should earn ${f(r.capmExpectedAnnual * 100)}% a year; yours earned ${f(r.portfolioAnnual * 100)}% on the same annualised basis.`,
    );
    if (t != null) {
      impact.push(
        Math.abs(t) >= 2
          ? `The t-statistic is ${f(t)}: the gap is large relative to its noise, so it is unlikely to be chance alone.`
          : `The t-statistic is ${f(t)} (below 2 in size): over ${r.n} days this alpha cannot be told apart from luck, so read it as indicative, not proof of skill.`,
      );
    }
  }
  const steps: ExplainStep[] = r && a != null && r.beta != null
    ? [
        {
          title: "Risk-free rate per day",
          latex: `R_{f,d}=\\frac{R_f}{A}=\\frac{${pct(r.riskFreeAnnual)}}{${r.periodsPerYear}}=${pct(r.riskFreeDaily, 5)}`,
          note: "The annual risk-free rate spread evenly over trading days (A = 252).",
        },
        {
          title: "Average daily excess returns",
          latex: `\\begin{aligned}\\bar y&=\\bar R_p-R_{f,d}=${pct(r.meanPortfolio, 5)}-${pct(r.riskFreeDaily, 5)}=${pct(r.meanExcessPortfolio, 5)}\\\\ \\bar x&=\\bar R_m-R_{f,d}=${pct(r.meanBenchmark, 5)}-${pct(r.riskFreeDaily, 5)}=${pct(r.meanExcessBenchmark, 5)}\\end{aligned}`,
          note: `y is what you earned over the risk-free rate, x is what ${benchmark} earned over it, averaged across ${r.n} days.`,
        },
        {
          title: "Beta from the same regression",
          latex: `\\beta=\\frac{\\sum_t (x_t-\\bar x)(y_t-\\bar y)}{\\sum_t (x_t-\\bar x)^2}=${f(r.beta, 4)}`,
          note: "The slope of excess portfolio return on excess benchmark return. Subtracting a constant risk-free rate does not change the slope, so it equals the beta shown on the Beta card.",
        },
        {
          title: "Daily alpha (the intercept)",
          latex: `\\alpha_d=\\bar y-\\beta\\,\\bar x=${pct(r.meanExcessPortfolio, 5)}-${f(r.beta, 4)}\\times${pct(r.meanExcessBenchmark, 5)}=${pct(r.alphaDaily, 5)}`,
          note: "The part of your average daily excess return that beta times the benchmark's excess return does not explain.",
        },
        {
          title: "Annualise",
          latex: `\\alpha=A\\cdot\\alpha_d=${r.periodsPerYear}\\times${pct(r.alphaDaily, 5)}=${pct(r.alphaAnnual)}`,
          note: "Jensen's alpha as shown on the card, in percent per year.",
        },
        {
          title: "Cross-check against CAPM",
          latex: `R_p-\\left[R_f+\\beta(R_m-R_f)\\right]=${pct(r.portfolioAnnual)}-\\left[${pct(r.riskFreeAnnual)}+${f(r.beta, 4)}\\times(${pct(r.benchmarkAnnual)}-${pct(r.riskFreeAnnual)})\\right]=${pct(r.alphaAnnual)}`,
          note: "The textbook form gives the same answer, because annualising by × 252 is the same arithmetic on both sides.",
        },
      ]
    : [];
  return {
    id: "alpha",
    title: "Jensen's Alpha",
    value,
    definition: `Jensen's alpha is the annual return your portfolio earned in excess of what the Capital Asset Pricing Model (CAPM) predicts for its level of market risk (beta) against ${benchmark}.`,
    impact,
    formula: "\\alpha=R_p-\\left[R_f+\\beta\\,(R_m-R_f)\\right]\\quad\\Longleftrightarrow\\quad(R_{p,t}-R_{f,d})=\\alpha_d+\\beta\\,(R_{m,t}-R_{f,d})+\\varepsilon_t",
    symbols: [
      { symbol: "\\alpha", meaning: "Jensen's alpha, annualised (A × daily intercept)", value: a != null ? ppct(a) : value },
      { symbol: "R_p", meaning: "Your portfolio's annualised average return (mean daily return × 252)", value: r ? ppct(r.portfolioAnnual) : undefined },
      { symbol: "R_m", meaning: `${benchmark}'s annualised average return (mean daily return × 252)`, value: r ? ppct(r.benchmarkAnnual) : undefined },
      { symbol: "R_f", meaning: "Annual risk-free rate used by the platform (a fixed assumption, not a live yield)", value: r ? ppct(r.riskFreeAnnual) : undefined },
      { symbol: "\\beta", meaning: "Portfolio beta from the same regression (see the Beta card)", value: r?.beta != null ? f(r.beta, 4) : undefined },
      { symbol: "\\alpha_d", meaning: "Daily alpha: the regression intercept", value: r ? ppct(r.alphaDaily, 5) : undefined },
      { symbol: "\\varepsilon_t", meaning: "Day-t residual: movement not explained by the benchmark" },
      { symbol: "A", meaning: "Trading days per year", value: r ? String(r.periodsPerYear) : "252" },
      { symbol: "N", meaning: "Days of paired portfolio and benchmark returns", value: r ? String(r.n) : undefined },
    ],
    steps,
    caveats: [
      "Alpha depends on the benchmark: pick a benchmark that does not fit your holdings (say, large caps for a small-cap book) and alpha mostly reflects that mismatch.",
      "The risk-free rate is a fixed assumption, so alpha shifts slightly if you compare with a different rate.",
      "Short windows are noisy. Judge alpha over a year or more, and prefer it when the t-statistic is above 2 in size.",
    ],
  };
}

type Static = Omit<Explanation, "id" | "value" | "steps"> & { id: ExplainId };

const STATIC: Record<Exclude<ExplainId, "alpha" | "beta">, Static> = {
  sharpe: {
    id: "sharpe",
    title: "Sharpe Ratio",
    definition: "Excess return earned per unit of total risk (volatility).",
    impact: ["Higher is better. Below 0 means you earned less than the risk-free rate; about 1 is decent; above 2 is rare and usually short-lived.", "It lets you compare a calm portfolio with a volatile one on equal terms."],
    formula: "\\text{Sharpe}=\\frac{\\bar R_p-R_{f,d}}{\\sigma_p}\\sqrt{A}",
    symbols: [
      { symbol: "\\bar R_p", meaning: "Mean daily portfolio return" },
      { symbol: "R_{f,d}", meaning: "Daily risk-free rate (annual rate ÷ 252)" },
      { symbol: "\\sigma_p", meaning: "Sample standard deviation of daily portfolio returns" },
      { symbol: "A", meaning: "252 trading days; √A annualises the daily ratio" },
    ],
    caveats: ["Treats upside and downside swings as equally bad.", "Noisy over short windows."],
  },
  sortino: {
    id: "sortino",
    title: "Sortino Ratio",
    definition: "Like Sharpe, but only penalises downside volatility: days below the risk-free hurdle.",
    impact: ["Useful when your gains are lumpy: big up-days do not count as risk, so it rewards portfolios that rise sharply without matching falls.", "Higher is better; negative means returns trailed the risk-free rate."],
    formula: "\\text{Sortino}=\\frac{\\bar R_p-\\text{MAR}}{\\sigma_{down}}\\sqrt{A},\\quad \\sigma_{down}=\\sqrt{\\tfrac{1}{N}\\sum_t \\min(0,R_{p,t}-\\text{MAR})^2}",
    symbols: [
      { symbol: "\\text{MAR}", meaning: "Minimum acceptable return: the daily risk-free rate" },
      { symbol: "\\sigma_{down}", meaning: "Downside deviation over all N days (days above MAR count as zero)" },
      { symbol: "A", meaning: "252 trading days" },
    ],
    caveats: ["Needs enough down-days to be stable."],
  },
  treynor: {
    id: "treynor",
    title: "Treynor Ratio",
    definition: "Excess return per unit of market risk (beta) instead of total risk.",
    impact: ["Shows how well you are paid for the market risk you carry. It suits a portfolio that is one slice of a larger, diversified holding.", "With a low beta, small excess returns get divided by a small number, so the ratio can look extreme. It is undefined if beta is zero or negative."],
    formula: "\\text{Treynor}=\\frac{A\\,(\\bar R_p-R_{f,d})}{\\beta}",
    symbols: [
      { symbol: "\\bar R_p-R_{f,d}", meaning: "Mean daily excess return" },
      { symbol: "A", meaning: "252, to annualise" },
      { symbol: "\\beta", meaning: "Portfolio beta vs the benchmark" },
    ],
    caveats: ["Unstable when beta is close to zero."],
  },
  informationRatio: {
    id: "informationRatio",
    title: "Information Ratio",
    definition: "Active return versus the benchmark earned per unit of tracking error.",
    impact: ["Measures how consistently you beat or lag the benchmark. Above 0.5 is good; negative means you lagged it.", "A high value from a few lucky days is less meaningful than a steady one."],
    formula: "\\text{IR}=\\frac{\\overline{(R_p-R_m)}}{\\sigma(R_p-R_m)}\\sqrt{A}",
    symbols: [
      { symbol: "R_p-R_m", meaning: "Daily active return versus the benchmark" },
      { symbol: "\\sigma(R_p-R_m)", meaning: "Standard deviation of daily active return" },
      { symbol: "A", meaning: "252" },
    ],
    caveats: ["Depends on the chosen benchmark."],
  },
  var: {
    id: "var",
    title: "VaR (95%, 1-day)",
    definition: "The loss your portfolio exceeded on only 5% of past days, converted to rupees at today's portfolio value.",
    impact: ["On about 1 trading day in 20 you should expect to lose at least this much; it is a floor on a bad day, not a worst case.", "It is historical: it uses your actual past daily returns, with no normal-distribution assumption."],
    formula: "\\text{VaR}_{95\\%}=-\\,Q_{5\\%}(R_{p,t})\\times \\text{NAV}",
    symbols: [
      { symbol: "Q_{5\\%}", meaning: "5th percentile of daily portfolio returns (the 'bad day' cut-off)" },
      { symbol: "\\text{NAV}", meaning: "Current portfolio value including cash" },
    ],
    caveats: ["Says nothing about how bad the worst 5% of days are (see CVaR).", "Understates risk if the window had no market stress."],
  },
  trackingError: {
    id: "trackingError",
    title: "Tracking Error",
    definition: "How much your returns differ from the benchmark's, measured as the annualised standard deviation of active return.",
    impact: ["Low means you behave like the index; high means your results can diverge widely from it, up or down.", "It is the risk side of the Information Ratio."],
    formula: "\\text{TE}=\\sigma(R_p-R_m)\\sqrt{A}",
    symbols: [
      { symbol: "R_p-R_m", meaning: "Daily active return" },
      { symbol: "A", meaning: "252" },
    ],
    caveats: ["Says nothing about direction: a high tracking error can be good or bad."],
  },
};

/** Returns null for ids we have no explanation for. */
export function explainMetric(idIn: string, ctx: ExplainContext): Explanation | null {
  const id = EXPLAIN_ALIAS[idIn] ?? (idIn as ExplainId);
  if (id === "alpha") return alphaExplanation(ctx);
  if (id === "beta") return betaExplanation(ctx);
  const s = STATIC[id as Exclude<ExplainId, "alpha" | "beta">];
  return s ? { ...s, value: ctx.value, steps: [] } : null;
}
