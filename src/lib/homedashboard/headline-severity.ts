/** Higher = show first on Home brief teaser (market-moving / geopolitical / enforcement). */
export function headlineSeverityScore(title: string): number {
  let score = 0;
  const t = title.toLowerCase();
  if (/\b(war|geopolit|sanction|tariff|invasion|conflict|missile|nuclear|middle east|ukraine|israel|china-us|trade war)\b/.test(t)) {
    score += 45;
  }
  if (/\b(oil|crude|brent|opec|energy crisis|supply chain)\b/.test(t)) score += 28;
  if (/\b(crash|plunge|selloff|meltdown|rout|surge|rally|record high|record low|circuit|halt)\b/.test(t)) score += 32;
  if (/\b(sebi|fraud|scam|penalty|ban|investigation|manipulation|insider|default|bankruptcy)\b/.test(t)) score += 38;
  if (/\b(rbi|rate cut|rate hike|repo|monetary policy|inflation|cpi|gdp|fed|ecb)\b/.test(t)) score += 26;
  if (/\b(nifty|sensex|nse|bse|fii|dii|ipo|earnings|results|guidance)\b/.test(t)) score += 18;
  if (/\b(global|wall street|s&p|nasdaq|dow|europe|asia markets)\b/.test(t)) score += 16;
  return score;
}
