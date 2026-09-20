# Market Intelligence Engine: Comprehensive Metrics Specification

This specification provides the mathematical definitions, input schemas, annualization logic, edge-case safeguards, and step-by-step computational algorithms for the full quantitative metrics catalog of the Market Intelligence platform.

---

## 0. Conventions, Notation, and Time Horizons

### 0.1 Time Series Definitions
* Let $T$ denote the total number of observation intervals ($t = 1, 2, \dots, T$).
* Let $P_t$ denote the portfolio value or Net Asset Value (NAV) at time $t$.
* Let $R_{p,t}$ denote the portfolio discrete return at time $t$:
  $$R_{p,t} = \frac{P_t - P_{t-1}}{P_{t-1}}$$
* Let $R_{b,t}$ denote the benchmark return at time $t$.
* Let $R_{f,t}$ denote the risk-free rate at time $t$. If quoted annualized as $r_f$, convert to periodic rate:
  $$R_{f,t} = (1 + r_f)^{\frac{1}{A}} - 1 \quad \text{or} \quad R_{f,t} \approx \frac{r_f}{A}$$
* Annualization factor $A$:
  * Daily data: $A = 252$ (equity trading days) or $A = 365$ (crypto/continuous).
  * Weekly data: $A = 52$.
  * Monthly data: $A = 12$.

---

## 1. Performance Metrics

### 1.1 Absolute Return (Cumulative Return)
* **Definition:** The total percentage change in portfolio value from inception $t=0$ to end $t=T$, ignoring timing of external cash flows.
* **Formula:**
  $$R_{\text{abs}} = \frac{P_T - P_0}{P_0} = \prod_{t=1}^{T} (1 + R_{p,t}) - 1$$
* **Algorithm:**
  1. Extract $P_0$ (initial value) and $P_T$ (terminal value).
  2. Verify $P_0 > 0$. If $P_0 \le 0$, return error/`NaN`.
  3. Compute $(P_T - P_0) / P_0$.
* **Edge Cases:** If $P_t$ hits $0$, cumulative return is $-1.00$ ($-100\%$).

---

### 1.2 Compound Annual Growth Rate (CAGR)
* **Definition:** The constant annual geometric growth rate required for an investment to grow from its initial value to its terminal value.
* **Formula:**
  $$\text{CAGR} = \left( \frac{P_T}{P_0} \right)^{\frac{1}{Y}} - 1$$
  where $Y$ is the total elapsed time in years:
  $$Y = \frac{\Delta \text{days}}{365.25} = \frac{T}{A}$$
* **Algorithm:**
  1. Calculate total period return ratio $M = P_T / P_0 = 1 + R_{\text{abs}}$.
  2. Compute total elapsed years $Y = (\text{Date}_T - \text{Date}_0) / 365.25$.
  3. If $Y < (1/12)$ (less than 1 month), flag as statistically unrepresentative or suppress annualization.
  4. If $M \le 0$, return $-1.00$ (complete loss).
  5. Compute $\text{CAGR} = \exp\left(\frac{1}{Y} \ln(M)\right) - 1$.

---

### 1.3 Time-Weighted Return (TWR)
* **Definition:** Measures the compound rate of growth of a portfolio over a specified time horizon by neutralizing the distorting effects of external cash injections and withdrawals.
* **Formula:**
  Subdivide the total period into $K$ sub-periods broken by each external cash flow $C_k$ occurring at time $t_k$:
  $$R_k = \frac{P_{t_k} - (P_{t_{k-1}} + C_{k-1})}{P_{t_{k-1}} + C_{k-1}}$$
  $$\text{TWR} = \left[ \prod_{k=1}^{K} (1 + R_k) \right] - 1$$
  Annualized TWR (if $Y > 1$):
  $$\text{TWR}_{\text{ann}} = (1 + \text{TWR})^{\frac{1}{Y}} - 1$$
* **Algorithm:**
  1. Record valuation $P_k^{\text{pre}}$ immediately before external cash flow $C_k$.
  2. Sub-period return: $R_k = \frac{P_k^{\text{pre}} - P_{k-1}^{\text{post}}}{P_{k-1}^{\text{post}}}$.
  3. Update new post-flow base: $P_k^{\text{post}} = P_k^{\text{pre}} + C_k$.
  4. Chain link all $R_k$ terms: $\prod_{k} (1 + R_k) - 1$.

---

### 1.4 Money-Weighted Return / Internal Rate of Return (MWR / IRR)
* **Definition:** The discount rate $r_{\text{irr}}$ that equates the present value of all cash inflows and outflows to the present value of the terminal portfolio value.
* **Formula:**
  $$P_0 + \sum_{k=1}^{K} \frac{C_k}{(1 + r_{\text{irr}})^{d_k / 365}} = \frac{P_T}{(1 + r_{\text{irr}})^{d_T / 365}}$$
  Rearranged as net present value objective:
  $$f(r) = -P_0 - \sum_{k=1}^{K} \frac{C_k}{(1 + r)^{d_k / 365}} + \frac{P_T}{(1 + r)^{d_T / 365}} = 0$$
  where $d_k$ is the number of days elapsed between inception and flow $k$.
* **Algorithm:**
  1. Construct tuple stream: $[(-P_0, 0), (-C_1, d_1), \dots, (-C_K, d_K), (P_T, d_T)]$.
  2. Implement Newton-Raphson or Brent-Dekker solver:
     $$r_{n+1} = r_n - \frac{f(r_n)}{f'(r_n)}$$
     where derivative:
     $$f'(r) = \sum_{k=1}^{K} \frac{d_k \cdot C_k}{365 (1 + r)^{(d_k/365) + 1}} - \frac{d_T \cdot P_T}{365 (1 + r)^{(d_T/365) + 1}}$$
  3. Stop when $|f(r)| < 10^{-7}$ or iterations exceed $100$.

---

### 1.5 Rolling Return
* **Definition:** The annualized performance evaluated over overlapping windows of length $W$ (e.g., $W = 252$ trading days for 1 year).
* **Formula:**
  $$\text{RollRet}_t(W) = \left( \prod_{i=0}^{W-1} (1 + R_{p, t-i}) \right)^{\frac{A}{W}} - 1 \quad \text{for } t \ge W$$
* **Algorithm:**
  1. For daily vector of returns $R_p \in \mathbb{R}^T$:
  2. Compute log returns $r_t = \ln(1 + R_{p,t})$.
  3. Compute rolling sum of log returns over window $W$: $S_t = \sum_{i=0}^{W-1} r_{t-i}$.
  4. Compute $\text{RollRet}_t = \exp\left(S_t \cdot \frac{A}{W}\right) - 1$.
  5. Store outputs as a time-series vector: mean, median, min, and max rolling return.

---

### 1.6 Active Return
* **Definition:** The difference between the portfolio's return and the benchmark's return over the same period.
* **Formula:**
  $$\text{Active Return}_{\text{arithmetic}} = R_{p} - R_{b}$$
  $$\text{Active Return}_{\text{geometric}} = \frac{1 + R_{p}}{1 + R_{b}} - 1$$
* **Algorithm:**
  1. Compute total period returns $R_p$ and $R_b$.
  2. If analyzing daily series: compute excess series $R_{\text{excess}, t} = R_{p,t} - R_{b,t}$.
  3. Annualize geometric excess: $(1 + \text{Active Return}_{\text{geometric}})^{A/T} - 1$.

---

## 2. Risk-Adjusted Performance

### 2.1 Sharpe Ratio
* **Definition:** Excess return per unit of total risk (standard deviation).
* **Formula:**
  $$\text{SR} = \frac{\mathbb{E}[R_p - R_f]}{\sigma_p} = \frac{\bar{R}_p - \bar{R}_f}{\sigma_p}$$
  Annualized Sharpe Ratio:
  $$\text{SR}_{\text{ann}} = \frac{\bar{R}_{p,\text{ann}} - R_{f,\text{ann}}}{\sigma_{p,\text{ann}}} = \frac{\bar{R}_p - \bar{R}_f}{\sigma_p} \cdot \sqrt{A}$$
  where:
  $$\sigma_p = \sqrt{\frac{1}{T-1} \sum_{t=1}^{T} (R_{p,t} - \bar{R}_p)^2}, \quad \sigma_{p,\text{ann}} = \sigma_p \sqrt{A}$$
* **Edge Cases:** If $\sigma_p = 0$, return `NaN` or `0.0`.

---

### 2.2 Treynor Ratio
* **Definition:** Excess return per unit of systematic risk ($\beta$).
* **Formula:**
  $$\text{TR} = \frac{\bar{R}_p - \bar{R}_f}{\beta_p}$$
  Annualized:
  $$\text{TR}_{\text{ann}} = \frac{\bar{R}_{p,\text{ann}} - R_{f,\text{ann}}}{\beta_p}$$
* **Edge Cases:** If $\beta_p \le 0$, the metric is mathematically undefined or economically counterintuitive; flag with an edge case tag `NegativeBeta`.

---

### 2.3 Sortino Ratio
* **Definition:** Excess return penalizing only downside volatility below a Minimum Acceptable Return ($MAR$).
* **Formula:**
  $$\text{Sortino} = \frac{\bar{R}_p - MAR}{\sigma_D}$$
  Annualized:
  $$\text{Sortino}_{\text{ann}} = \frac{\bar{R}_{p,\text{ann}} - MAR_{\text{ann}}}{\sigma_D \sqrt{A}}$$
  where Downside Deviation $\sigma_D$ is:
  $$\sigma_D = \sqrt{\frac{1}{T} \sum_{t=1}^{T} \min(0, R_{p,t} - MAR_t)^2}$$
  *(Common default: $MAR_t = R_{f,t}$ or $0$).*

---

### 2.4 Jensen's Alpha
* **Definition:** The abnormal rate of return over that predicted by the Capital Asset Pricing Model (CAPM).
* **Formula:**
  $$\alpha_J = (\bar{R}_p - \bar{R}_f) - \beta_p (\bar{R}_b - \bar{R}_f)$$
  Annualized:
  $$\alpha_{J,\text{ann}} = \alpha_J \cdot A \quad \text{(or geometrically: } (1 + \alpha_J)^A - 1 \text{)}$$
* **Algorithm:** Run Ordinary Least Squares (OLS) regression:
  $$(R_{p,t} - R_{f,t}) = \alpha + \beta (R_{b,t} - R_{f,t}) + \epsilon_t$$
  The intercept is Jensen's Alpha.

---

### 2.5 Information Ratio (IR)
* **Definition:** Active return relative to benchmark divided by the standard deviation of active return (Tracking Error).
* **Formula:**
  $$\text{IR} = \frac{\bar{R}_p - \bar{R}_b}{\text{TE}} = \frac{\frac{1}{T}\sum_{t=1}^T (R_{p,t} - R_{b,t})}{\sqrt{\frac{1}{T-1}\sum_{t=1}^T \left( (R_{p,t} - R_{b,t}) - (\bar{R}_p - \bar{R}_b) \right)^2}}$$
  Annualized:
  $$\text{IR}_{\text{ann}} = \text{IR} \cdot \sqrt{A}$$

---

### 2.6 Calmar Ratio
* **Definition:** Ratio of annualized compound return to Maximum Drawdown over a 36-month rolling window (or entire tenure).
* **Formula:**
  $$\text{Calmar} = \frac{\text{CAGR}}{|\text{MDD}|}$$
* **Edge Cases:** If $|\text{MDD}| = 0$, return `NaN` or positive infinity.

---

### 2.7 Sterling Ratio
* **Definition:** Return divided by the average drawdown over the period, traditionally with an arbitrary buffer (e.g., $10\%$).
* **Formula:**
  $$\text{Sterling Ratio} = \frac{\text{CAGR}}{\frac{1}{N_{\text{dd}}} \sum_{j=1}^{N_{\text{dd}}} |\text{Drawdown}_j| + \text{Drawdown Add-on}}$$
  Standard industry simplified version ($\text{Add-on} = 0$):
  $$\text{Sterling Ratio} = \frac{\text{CAGR}}{\overline{\text{DD}}}$$
  where $\overline{\text{DD}}$ is the average drawdown depth across all drawdown cycles.

---

### 2.8 Burke Ratio
* **Definition:** Compares excess return to the square root of the sum of squared drawdowns, penalizing frequent and severe deep drawdowns.
* **Formula:**
  $$\text{Burke Ratio} = \frac{\bar{R}_p - R_f}{\sqrt{\sum_{k=1}^{D} \text{DD}_k^2}}$$
  where $\text{DD}_k$ is the depth of drawdown episode $k$, or computed continuously over all $t$ where drawdown occurs:
  $$\text{Burke Ratio} = \frac{\bar{R}_{p,\text{ann}} - R_{f,\text{ann}}}{\sqrt{\frac{1}{T}\sum_{t=1}^T \text{DD}_t^2}}$$

---

### 2.9 Omega Ratio
* **Definition:** Probability-weighted ratio of gains versus losses above a threshold target $\tau$ (typically $\tau = 0$ or $R_f$).
* **Formula:**
  $$\Omega(\tau) = \frac{\int_{\tau}^{\infty} (1 - F(r)) \, dr}{\int_{-\infty}^{\tau} F(r) \, dr} = \frac{\sum_{t=1}^{T} \max(0, R_{p,t} - \tau)}{\sum_{t=1}^{T} \max(0, \tau - R_{p,t})}$$
* **Algorithm:**
  1. Calculate gains above threshold: $G_t = \max(0, R_{p,t} - \tau)$.
  2. Calculate losses below threshold: $L_t = \max(0, \tau - R_{p,t})$.
  3. If $\sum L_t = 0$, all periods were gains; return $\infty$.
  4. Compute $\Omega = \frac{\sum G_t}{\sum L_t}$.

---

### 2.10 Kappa Ratio ($\text{Kappa}_n$)
* **Definition:** A generalized risk-adjusted metric utilizing higher-order Lower Partial Moments ($LPM_n$). Sortino is $\text{Kappa}_2$.
* **Formula:**
  $$\text{Kappa}_n(\tau) = \frac{\bar{R}_p - \tau}{\left( LPM_n(\tau) \right)^{1/n}}$$
  where:
  $$LPM_n(\tau) = \frac{1}{T} \sum_{t=1}^{T} \max(0, \tau - R_{p,t})^n$$
  For $n=3$:
  $$\text{Kappa}_3(\tau) = \frac{\bar{R}_p - \tau}{\left( \frac{1}{T} \sum_{t=1}^{T} \max(0, \tau - R_{p,t})^3 \right)^{1/3}}$$

---

### 2.11 Modigliani–Modigliani Measure ($M^2$)
* **Definition:** Leverages or de-leverages the portfolio until its volatility matches that of the benchmark, then evaluates return.
* **Formula:**
  $$M^2 = \bar{R}_f + \left( \frac{\sigma_b}{\sigma_p} \right) (\bar{R}_p - \bar{R}_f) = \text{SR}_p \cdot \sigma_b + \bar{R}_f$$
  Excess $M^2$:
  $$M^2 - \bar{R}_b = \text{SR}_p \cdot \sigma_b - (\bar{R}_b - \bar{R}_f)$$

---

### 2.12 Appraisal Ratio (Treynor–Black)
* **Definition:** Ratio of Jensen's Alpha to idiosyncratic (unsystematic) risk $\sigma_\epsilon$.
* **Formula:**
  $$\text{AR} = \frac{\alpha}{\sigma_\epsilon}$$
  where $\sigma_\epsilon$ is the standard error of the residual in the CAPM regression:
  $$\sigma_\epsilon = \sqrt{\frac{1}{T-2} \sum_{t=1}^{T} \epsilon_t^2}$$
  Annualized:
  $$\text{AR}_{\text{ann}} = \frac{\alpha \cdot A}{\sigma_\epsilon \sqrt{A}} = \text{AR} \cdot \sqrt{A}$$

---

## 3. Market Risk Metrics

### 3.1 Beta ($\beta$)
* **Definition:** Sensitivity of portfolio returns to market benchmark movements.
* **Formula:**
  $$\beta = \frac{\text{Cov}(R_p, R_b)}{\text{Var}(R_b)} = \frac{\sum_{t=1}^T (R_{p,t} - \bar{R}_p)(R_{b,t} - \bar{R}_b)}{\sum_{t=1}^T (R_{b,t} - \bar{R}_b)^2}$$
* **Algorithm:**
  1. Align timestamps of $R_p$ and $R_b$.
  2. Drop pairs where either value is missing.
  3. Ensure $\text{Var}(R_b) > 10^{-12}$; else return `NaN`.

---

### 3.2 Alpha ($\alpha$)
* **Definition:** The regression intercept measuring performance independent of benchmark sensitivity.
* **Formula:**
  $$\alpha = \bar{R}_p - \beta \bar{R}_b$$
  Annualized:
  $$\alpha_{\text{ann}} = (1 + \alpha)^A - 1 \quad \text{or} \quad \alpha_{\text{ann}} = \alpha \cdot A$$

---

### 3.3 Volatility ($\sigma$)
* **Definition:** Sample standard deviation of periodic returns scaled by the annualization constant.
* **Formula:**
  $$\sigma = \sqrt{\frac{1}{T-1} \sum_{t=1}^{T} (R_{p,t} - \bar{R}_p)^2}$$
  $$\sigma_{\text{ann}} = \sigma \cdot \sqrt{A}$$

---

### 3.4 Value at Risk (VaR)
Calculated for confidence level $1 - \alpha$ (typically $95\%$ or $99\%$) over horizon $h$.

#### Method A: Historical VaR
1. Compute array of sorted returns $R_{(1)} \le R_{(2)} \le \dots \le R_{(T)}$.
2. Locate the index $k = \lfloor \alpha \cdot T \rfloor$.
3. $\text{VaR}_{1-\alpha} = -R_{(k)}$.

#### Method B: Parametric (Gaussian) VaR
$$\text{VaR}_{1-\alpha}^{\text{param}} = -(\bar{R}_p + z_{\alpha} \sigma_p) = z_{1-\alpha} \sigma_p - \bar{R}_p$$
*(For $\alpha = 0.05$, $z_{0.95} = 1.64485$; for $\alpha = 0.01$, $z_{0.99} = 2.32635$).*

#### Method C: Cornish-Fisher Modified VaR (Accounts for Skewness $S$ and Kurtosis $K$)
$$z_{CF} = z_\alpha + \frac{S}{6}(z_\alpha^2 - 1) + \frac{K - 3}{24}(z_\alpha^3 - 3z_\alpha) - \frac{S^2}{36}(2z_\alpha^3 - 5z_\alpha)$$
$$\text{VaR}_{1-\alpha}^{CF} = -(\bar{R}_p + z_{CF} \sigma_p)$$

---

### 3.5 Conditional Value at Risk (CVaR / Expected Shortfall)
* **Definition:** The expected loss given that the loss exceeds the VaR threshold.
* **Formula:**
  $$\text{CVaR}_{1-\alpha} = -\mathbb{E}[R_p \mid R_p \le -\text{VaR}_{1-\alpha}]$$
* **Discrete Historical Algorithm:**
  $$\text{CVaR}_{1-\alpha} = -\frac{1}{k} \sum_{i=1}^{k} R_{(i)}$$
  where $R_{(1)}, \dots, R_{(k)}$ are all historical returns below the $\alpha$-quantile.

---

### 3.6 Tracking Error (TE)
* **Definition:** Sample standard deviation of excess returns over benchmark.
* **Formula:**
  $$\text{TE} = \sqrt{\frac{1}{T-1} \sum_{t=1}^{T} (R_{\text{diff}, t} - \bar{R}_{\text{diff}})^2}$$
  where $R_{\text{diff}, t} = R_{p,t} - R_{b,t}$.
  Annualized:
  $$\text{TE}_{\text{ann}} = \text{TE} \cdot \sqrt{A}$$

---

### 3.7 Downside Deviation
* **Formula:**
  $$\sigma_{\text{down}} = \sqrt{\frac{1}{T} \sum_{t=1}^{T} \left[ \min(0, R_{p,t} - \tau) \right]^2}$$
  where $\tau$ is target threshold. Annualized: $\sigma_{\text{down},\text{ann}} = \sigma_{\text{down}} \cdot \sqrt{A}$.

---

## 4. Drawdown Metrics

### Drawdown Series Construction
* Let $V_t$ denote cumulative wealth at time $t$:
  $$V_t = V_0 \prod_{i=1}^{t} (1 + R_{p,i})$$
* Running High-Water Mark (HWM):
  $$M_t = \max_{0 \le s \le t} V_s$$
* Underwater / Drawdown series at time $t$:
  $$\text{DD}_t = \frac{V_t - M_t}{M_t} \le 0$$

```
Wealth (V)
   ^        Peak (M_t)
   |       / \
   |      /   \         Recovery
   |     /     \       /
   |    /       \     /
   |   /         \   /
   |              \ /
   |             Trough
   +------------------------------> Time
   |<- Duration ->|<- Recovery ->|
   |<-------- Drawdown Episode ->|
```

### 4.1 Maximum Drawdown (MDD)
* **Definition:** The maximum peak-to-trough drop observed over the entire series.
* **Formula:**
  $$\text{MDD} = \min_{1 \le t \le T} \text{DD}_t = \min_{1 \le t \le T} \left( \frac{V_t - \max_{0 \le s \le t} V_s}{\max_{0 \le s \le t} V_s} \right)$$
  *(Commonly reported as an absolute percentage $|\text{MDD}| \in [0, 1]$).*

---

### 4.2 Average Drawdown
* **Definition:** The arithmetic mean of either:
  1. The continuous drawdown series: $\overline{\text{DD}} = \frac{1}{T} \sum_{t=1}^{T} \text{DD}_t$.
  2. Or the troughs of distinct drawdown episodes $e = 1, \dots, E$:
     $$\overline{\text{DD}}_{\text{episodes}} = \frac{1}{E} \sum_{e=1}^{E} \min_{t \in \text{Episode}_e} \text{DD}_t$$

---

### 4.3 Drawdown Duration
* **Definition:** The time elapsed from a peak until reaching the subsequent lowest trough (Trough Duration) or until reaching a new peak (Total Underwater Duration).
* **Algorithm:**
  1. Identify peak timestamp $t_{\text{peak}} = \arg \max_{s \le t} V_s$.
  2. Identify trough timestamp $t_{\text{trough}} = \arg \min_{s \in [t_{\text{peak}}, t_{\text{recovery}}]} V_s$.
  3. Peak-to-Trough Duration $= t_{\text{trough}} - t_{\text{peak}}$.
  4. Max Drawdown Duration $= \max_e (\text{Total Duration of Episode } e)$.

---

### 4.4 Recovery Period
* **Definition:** The duration from the trough date $t_{\text{trough}}$ until wealth $V_t \ge V_{t_{\text{peak}}}$.
* **Formula:**
  $$\Delta t_{\text{rec}} = t_{\text{rec}} - t_{\text{trough}}$$
  where $t_{\text{rec}} = \min \{ t > t_{\text{trough}} \mid V_t \ge M_{t_{\text{peak}}} \}$.
  If the portfolio has not recovered by $T$, $t_{\text{rec}}$ is marked `Unrecovered` and current duration is $T - t_{\text{trough}}$.

---

### 4.5 Recovery Factor
* **Definition:** The ability of the portfolio to generate profits relative to its worst drawdown.
* **Formula:**
  $$\text{Recovery Factor} = \frac{P_T - P_0}{|\text{MDD}_{\$}|} = \frac{R_{\text{abs}}}{|\text{MDD}|}$$
  where $|\text{MDD}_{\$}|$ is the maximum dollar loss from peak to trough.

---

## 5. Relative Performance Metrics

### 5.1 Active Share
* **Definition:** The percentage of fund holdings that differs from the benchmark holdings.
* **Formula:**
  $$\text{Active Share} = \frac{1}{2} \sum_{i=1}^{N} |w_{p,i} - w_{b,i}|$$
  where $w_{p,i}$ is weight of asset $i$ in portfolio, and $w_{b,i}$ is weight of asset $i$ in benchmark ($N$ is the union of all assets).
* **Boundaries:** $0 \le \text{Active Share} \le 1.0$ ($0\%$ indicates pure index clone, $100\%$ indicates zero common holdings).

---

### 5.2 Upside & Downside Capture Ratios
* **Definitions:** Percentage of benchmark gains or losses captured during positive and negative benchmark periods.
* **Algorithm:**
  1. Filter subset of dates where $R_{b,t} > 0$: $\mathcal{T}_+ = \{t \mid R_{b,t} > 0\}$.
  2. Filter subset of dates where $R_{b,t} < 0$: $\mathcal{T}_- = \{t \mid R_{b,t} < 0\}$.
  3. Compute geometric compound returns for both sets:
     $$R_{p,+} = \prod_{t \in \mathcal{T}_+} (1 + R_{p,t}) - 1, \quad R_{b,+} = \prod_{t \in \mathcal{T}_+} (1 + R_{b,t}) - 1$$
     $$R_{p,-} = \prod_{t \in \mathcal{T}_-} (1 + R_{p,t}) - 1, \quad R_{b,-} = \prod_{t \in \mathcal{T}_-} (1 + R_{b,t}) - 1$$
  4. Form ratios:
     $$\text{Upside Capture} = \frac{R_{p,+}}{R_{b,+}}$$
     $$\text{Downside Capture} = \frac{R_{p,-}}{R_{b,-}}$$
  5. Overall Capture Ratio: $\text{Capture Ratio} = \frac{\text{Upside Capture}}{\text{Downside Capture}}$.

---

### 5.3 Batting Average (Win Rate)
* **Definition:** Proportion of observation periods in which the portfolio outperforms the benchmark.
* **Formula:**
  $$\text{Batting Average} = \frac{1}{T} \sum_{t=1}^{T} \mathbb{I}(R_{p,t} > R_{b,t})$$
  where $\mathbb{I}(\cdot)$ is the indicator function ($1$ if true, $0$ otherwise).

---

## 6. Portfolio Construction Metrics

Given asset weights $w = [w_1, w_2, \dots, w_N]^T$:

### 6.1 Top-$N$ Concentration
* **Definition:** Sum of weights of the largest $N$ positions in the portfolio.
* **Formula:**
  $$\text{Top-N} = \sum_{j=1}^{N} |w|_{(j)}$$
  where $|w|_{(1)} \ge |w|_{(2)} \dots \ge |w|_{(M)}$ are sorted absolute position weights.

---

### 6.2 Herfindahl-Hirschman Index (HHI)
* **Definition:** Metric of portfolio concentration based on squared position weights.
* **Formula:**
  $$\text{HHI} = \sum_{i=1}^{N} \tilde{w}_i^2 \quad \text{where } \tilde{w}_i = \frac{|w_i|}{\sum_j |w_j|}$$
* **Range:** $[1/N, 1.0]$. For percentage convention: multiply by $10,000$ (range $0$ to $10,000$).

---

### 6.3 Effective Number of Holdings ($N_{\text{eff}}$)
* **Definition:** The reciprocal of HHI, indicating how many equally-weighted independent positions the portfolio represents.
* **Formula:**
  $$N_{\text{eff}} = \frac{1}{\sum_{i=1}^{N} \tilde{w}_i^2} = \frac{1}{\text{HHI}}$$

---

### 6.4 Gross Exposure, Net Exposure, Leverage & Cash %
* Let $V_{\text{equity}}$ denote Total Equity (NAV).
* Let $L = \sum_{i \in \text{Long}} \text{Value}_i$ (Long Value).
* Let $S = \sum_{i \in \text{Short}} |\text{Value}_i|$ (Short Market Value).
* Let $C$ denote unencumbered Cash balance.
1. **Gross Exposure:**
   $$\text{Gross Exposure} = \frac{L + S}{V_{\text{equity}}}$$
2. **Net Exposure:**
   $$\text{Net Exposure} = \frac{L - S}{V_{\text{equity}}}$$
3. **Leverage:**
   $$\text{Leverage} = \frac{\text{Total Assets}}{V_{\text{equity}}} = \frac{L + C}{V_{\text{equity}}} \quad \text{or Gross Leverage} = \frac{L + S}{V_{\text{equity}}}$$
4. **Cash %:**
   $$\text{Cash \%} = \frac{C}{V_{\text{equity}}}$$

---

## 7. Attribution Metrics (Brinson–Fachler Framework)

Let universe be grouped into sectors/segments $j = 1, \dots, J$.
* $w_{p,j}$: Portfolio weight in sector $j$.
* $w_{b,j}$: Benchmark weight in sector $j$.
* $R_{p,j}$: Portfolio return of sector $j$.
* $R_{b,j}$: Benchmark return of sector $j$.
* $R_b = \sum_j w_{b,j} R_{b,j}$: Total benchmark return.

### 7.1 Asset Allocation (Attribution)
* **Formula:**
  $$\text{Alloc}_j = (w_{p,j} - w_{b,j}) \cdot (R_{b,j} - R_b)$$
  $$\text{Total Allocation Effect} = \sum_{j=1}^{J} (w_{p,j} - w_{b,j}) \cdot (R_{b,j} - R_b)$$

---

### 7.2 Security Selection (Attribution)
* **Formula:**
  $$\text{Select}_j = w_{b,j} \cdot (R_{p,j} - R_{b,j})$$
  $$\text{Total Selection Effect} = \sum_{j=1}^{J} w_{b,j} \cdot (R_{p,j} - R_{b,j})$$

---

### 7.3 Interaction Effect
* **Formula:**
  $$\text{Inter}_j = (w_{p,j} - w_{b,j}) \cdot (R_{p,j} - R_{b,j})$$
  *(Note: In the Brinson–Fachler pure formulation, Interaction is frequently combined into Selection).*

---

### 7.4 Sector & Stock Contribution
* **Sector Contribution:**
  $$\text{Contr}_j = w_{p,j} \cdot R_{p,j}$$
* **Individual Stock Contribution:**
  For stock $i$ in portfolio:
  $$\text{Contr}_i = w_{p,i} \cdot R_{p,i}$$

---

### 7.5 Multi-Factor Return Attribution
For a linear factor model $R_{p,t} = \sum_{k=1}^K \beta_{p,k} F_{k,t} + \epsilon_{p,t}$:
$$\text{Factor Contribution}_k = \beta_{p,k} \cdot \bar{F}_k$$
$$\text{Specific (Stock) Contribution} = \bar{\epsilon}_p = \bar{R}_p - \sum_{k=1}^K \beta_{p,k} \bar{F}_k$$

---

### 7.6 Currency Contribution
For multi-currency portfolios, return decomposes into local asset return $R^{\text{loc}}$ and currency move $e_k = \frac{\Delta \text{FX}_k}{\text{FX}_k}$:
$$\text{Currency Contribution} = \sum_{k=1}^K w_k \cdot e_k$$

---

## 8. Factor Exposures (Multi-Factor Linear Regression)

### Estimation Model
Run a multi-variable OLS regression over trailing $H$ periods:
$$R_{p,t} - R_{f,t} = \alpha + \beta_{\text{MKT}} F_{\text{MKT},t} + \beta_{\text{SMB}} F_{\text{SMB},t} + \beta_{\text{HML}} F_{\text{HML},t} + \beta_{\text{MOM}} F_{\text{MOM},t} + \beta_{\text{QMJ}} F_{\text{QMJ},t} + \beta_{\text{BAB}} F_{\text{BAB},t} + \epsilon_t$$

Matrix notation:
$$\mathbf{y} = \mathbf{X}\boldsymbol{\beta} + \boldsymbol{\epsilon} \implies \hat{\boldsymbol{\beta}} = (\mathbf{X}^T \mathbf{X})^{-1} \mathbf{X}^T \mathbf{y}$$

### Specific Factor Standard Definitions
1. **Factor: Market ($\beta_{\text{MKT}}$):** Excess market index return ($R_m - R_f$).
2. **Factor: Size ($\beta_{\text{Size}}$):** SMB (Small Minus Big) market cap factor.
3. **Factor: Value ($\beta_{\text{Value}}$):** HML (High Minus Low book-to-market) factor.
4. **Factor: Momentum ($\beta_{\text{Mom}}$):** WML (Winners Minus Losers 12m-1m prior return).
5. **Factor: Quality ($\beta_{\text{Quality}}$):** QMJ (Quality Minus Junk: ROE, debt-to-equity, accruals).
6. **Factor: Low Volatility ($\beta_{\text{LowVol}}$):** BAB (Betting Against Beta or inverse idiosyncratic volatility).
7. **Factor: Growth:** Inverse of Value or derived from EPS/Sales forward growth basket.

---

## 9. Liquidity & Execution Metrics

### 9.1 Portfolio Turnover
* **Definition:** The lesser of purchases or sales divided by the average portfolio value over the measurement window.
* **Formula:**
  $$\text{Turnover} = \frac{\min\left(\sum \text{Purchases}, \sum \text{Sales}\right)}{\frac{1}{T}\sum_{t=1}^T \text{NAV}_t}$$
  Annualized Turnover:
  $$\text{Turnover}_{\text{ann}} = \text{Turnover} \cdot \frac{A}{T}$$

---

### 9.2 Bid-Ask Spread
* **Formula:**
  $$\text{Spread}_{\text{abs}} = P_{\text{Ask}} - P_{\text{Bid}}$$
  $$\text{Spread}_{\%} = \frac{P_{\text{Ask}} - P_{\text{Bid}}}{P_{\text{Mid}}} \times 10,000 \quad (\text{basis points, bps})$$
  where $P_{\text{Mid}} = \frac{P_{\text{Ask}} + P_{\text{Bid}}}{2}$.
* **Portfolio-Weighted Spread:**
  $$\text{Spread}_{p} = \sum_{i=1}^N w_i \cdot \text{Spread}_{\%, i}$$

---

### 9.3 Slippage
* **Definition:** Deviation between the benchmark arrival price or order submission price ($P_0$) and the actual average execution fill price ($\bar{P}_{\text{fill}}$).
* **Formula:**
  $$\text{Slippage}_{\text{bps}} = \text{Direction} \times \frac{\bar{P}_{\text{fill}} - P_0}{P_0} \times 10,000$$
  where $\text{Direction} = +1$ for BUY orders, and $-1$ for SELL orders.

---

### 9.4 Implementation Shortfall (Perold 1988)
* **Definition:** Total cost of execution including explicit fees, delay, price impact, and unexecuted opportunity cost.
* **Formula:**
  Let $S$ be total order shares desired, $p_0$ be decision price.
  Let $s_j$ shares be filled at $p_j$ with fees $F_j$.
  Unexecuted shares: $S_{\text{unfilled}} = S - \sum_j s_j$. Terminal price: $p_T$.
  $$\text{IS} = \sum_{j} s_j p_j - p_0 \sum_j s_j + \sum_j F_j + S_{\text{unfilled}} (p_T - p_0) \quad (\text{for buys})$$
  Expressed as percentage of total theoretical order value $S \cdot p_0$:
  $$\text{IS}_{\%} = \frac{\text{IS}}{S \cdot p_0}$$

---

### 9.5 Position / ADV (% of Average Daily Volume)
* **Definition:** Size of the portfolio's holding in asset $i$ relative to its trailing $K$-day average daily trading volume ($\text{ADV}_K$).
* **Formula:**
  $$\text{ADV}_K = \frac{1}{K} \sum_{d=1}^{K} \text{Volume}_d$$
  $$\% \text{ of ADV}_i = \frac{Q_i}{\text{ADV}_{K, i}} \times 100\%$$
  where $Q_i$ is total number of shares held in asset $i$.

---

### 9.6 Days to Liquidate
* **Definition:** Estimated trading days required to exit position $i$ without exceeding an allowed market participation rate $\rho$ (typically $\rho = 0.10$ to $0.20$, or $10-20\%$ of daily volume).
* **Formula:**
  $$\text{DTL}_i = \frac{Q_i}{\rho \cdot \text{ADV}_i}$$
  Portfolio Days to Liquidate (Conservative):
  $$\text{DTL}_{p, \text{worst}} = \max_{1 \le i \le N} \text{DTL}_i$$
  Portfolio Days to Liquidate (Weighted):
  $$\text{DTL}_{p, \text{weighted}} = \sum_{i=1}^N w_i \cdot \text{DTL}_i$$

---

### 9.7 Market Impact (Almgren-Chriss Square-Root Law)
* **Definition:** Price impact of executing order $Q$ across time window $\tau$ given daily volatility $\sigma_d$ and volume $V_d$.
* **Formula:**
  $$I = \gamma \cdot \sigma_d \cdot \sqrt{\frac{Q}{V_d}}$$
  where:
  * $\gamma$ is a market-dependent calibration constant (typically $0.5 \le \gamma \le 0.7$).
  * $\sigma_d$ is daily volatility of the asset.
  * $Q$ is position quantity in shares.
  * $V_d$ is total daily market volume in shares.

---

## 10. Computational Pipeline Architecture

The following diagram illustrates how raw ingestion data flows through validation, cleaning, and down to the specific metrics engines:

```
[Raw Ingestion]
  |-- Prices & NAVs
  |-- Cash Flows & Fills
  |-- Benchmark Data
  v
[Data Sanitation & Alignment Layer]
  |-- Reindex to Common Datetime Index
  |-- Missing Value Interpolation / Forward Fill
  |-- Sanity Checks (Divide-by-zero, Infinite checks)
  v
[Core Analytical Modules]
  +---> Performance Engine       (TWR, CAGR, Rolling, IRR)
  +---> Risk & Drawdown Engine   (VaR, CVaR, MDD, Volatility)
  +---> Benchmark & CAPM Engine  (Alpha, Beta, Sharpe, Tracking Error)
  +---> Portfolio Structure      (Concentration, HHI, Leverage)
  +---> Execution & Liquidity    (ADV, DTL, Spread, Slippage)
  v
[JSON / API Metric Store] -> getmarketintelligence.vercel.app UI
```