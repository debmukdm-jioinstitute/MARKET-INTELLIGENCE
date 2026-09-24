/** Ordinary least squares with intercept. X: n×k (no intercept column), y: n. Returns betas (excluding alpha), t-stats, R², residual sd. */
export type OlsFit = { alpha: number; betas: number[]; se: number[]; t: number[]; r2: number; residSd: number; n: number };

function solve(a: number[][], b: number[][]): number[][] | null {
  const n = a.length;
  const m = a.map((row, i) => [...row, ...b[i]]);
  for (let c = 0; c < n; c++) {
    let p = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(m[r][c]) > Math.abs(m[p][c])) p = r;
    if (Math.abs(m[p][c]) < 1e-12) return null;
    [m[c], m[p]] = [m[p], m[c]];
    const d = m[c][c];
    for (let j = c; j < m[c].length; j++) m[c][j] /= d;
    for (let r = 0; r < n; r++) {
      if (r === c) continue;
      const f = m[r][c];
      if (f !== 0) for (let j = c; j < m[r].length; j++) m[r][j] -= f * m[c][j];
    }
  }
  return m.map((row) => row.slice(n));
}

export function ols(X: number[][], y: number[]): OlsFit | null {
  const n = y.length;
  const k = X[0]?.length ?? 0;
  if (n < k + 10) return null;
  const A = X.map((r) => [1, ...r]);
  const p = k + 1;
  const xtx = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => A.reduce((s, r) => s + r[i] * r[j], 0)));
  const xty = Array.from({ length: p }, (_, i) => [A.reduce((s, r, idx) => s + r[i] * y[idx], 0)]);
  const identity = Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => (i === j ? 1 : 0)));
  const inv = solve(xtx, identity);
  const sol = solve(xtx, xty);
  if (!inv || !sol) return null;
  const coef = sol.map((r) => r[0]);
  const yhat = A.map((r) => r.reduce((s, v, i) => s + v * coef[i], 0));
  const ybar = y.reduce((s, v) => s + v, 0) / n;
  const sse = y.reduce((s, v, i) => s + (v - yhat[i]) ** 2, 0);
  const sst = y.reduce((s, v) => s + (v - ybar) ** 2, 0);
  const sigma2 = sse / (n - p);
  const se = coef.map((_, i) => Math.sqrt(Math.max(0, sigma2 * inv[i][i])));
  return {
    alpha: coef[0],
    betas: coef.slice(1),
    se: se.slice(1),
    t: coef.slice(1).map((b, i) => (se[i + 1] > 0 ? b / se[i + 1] : 0)),
    r2: sst > 0 ? 1 - sse / sst : 0,
    residSd: Math.sqrt(sigma2),
    n,
  };
}
