import { TOOLS } from "@/lib/mcp/tools";

export type HelpToolRow = { group: string; name: string; returns: string; ask: string };

/** Example prompts — keyed by tool name; everything else gets a generic ask line. */
const ASK: Partial<Record<string, string>> = {
  get_alpha_league_preview: "Show the Alpha League public educational competition standings.",
  get_home_market_insights: "Explain today's market breadth, VIX and institutional buying or selling streaks.",
  get_market_overview: "Give me a complete market overview: snapshot, stress, breadth, and daily brief in one call.",
  get_research_pack: "Give me a complete research pack for RELIANCE (stats, price history, ratios, security risk in one call).",
  get_market_snapshot: "Give me today's market snapshot.",
  get_india_dashboard: "How are Indian markets doing right now?",
  get_what_changed: "What changed in markets since my last visit?",
  get_market_breadth: "What is market breadth today?",
  get_india_equity_quotes: "Show live large-cap quotes.",
  get_world_indices: "How are global markets?",
  get_currency_quotes: "Show USD/INR and major FX pairs with day change.",
  get_commodity_quotes: "How are gold, crude and India commodity proxies trading?",
  get_india_board_quotes: "Show Nifty 50 day range, volume and 52-week range.",
  get_world_monitor: "Where is the World Monitor global dashboard in Market Intelligence?",
  get_market_holidays: "When is the next market holiday?",
  search_symbols: "Find the ticker for JP Power.",
  get_stress_index: "What's the India Macro Stress Index and what is driving it?",
  get_stress_backtest: "How well has the stress index predicted returns?",
  get_rbi_rates: "Show the RBI policy corridor and liquidity.",
  get_india_yield_curve: "What does the India yield curve look like?",
  get_transmission_betas: "Which sectors are most sensitive to Brent?",
  run_scenario: "If Brent +10% and USD/INR +2%, which sectors get hurt?",
  get_macro_tape: "Give me the macro tape.",
  get_india_macro_hub: "Summarise India's macro picture.",
  get_feed_hub: "Show the feed hub.",
  get_source_health: "Which data sources are failing right now?",
  get_market_data_brief: "Send me the latest market data brief from all collectors.",
  get_company_disclosures: "Show the latest NSE company disclosures and concall filings.",
  get_daily_brief: "Summarise the latest daily brief.",
  get_security_risk: "Risk profile for RELIANCE.",
  get_stock_research: "Research summary for TCS.",
  get_stock_drivers: "What regulations or policies move PB Fintech right now?",
  get_research_analytics: "Financial X-Ray, DNA score, red flags and valuation bands for RELIANCE.",
  get_price_history: "TCS price history for 3 months.",
  get_key_ratios: "Key ratios for ISIN INE467B01029.",
  get_earnings_calendar: "Who reports earnings soon?",
  get_ipos: "Which IPOs are open now, and what is their GMP?",
  get_ipo_intelligence: "Build the full IPO intelligence dossier for this issue id (DRHP, risks, GMP, subscription).",
  get_retail_sentiment_engine: "What is Reddit sentiment, mention surge, and bull/bear debate on RELIANCE or SUZLON?",
  get_reddit_investor_problems: "What investor problems and research friction points are trending on Indian finance Reddit?",
  get_credit_risk_intelligence: "Are rating-agency feeds (CRISIL, ICRA, CARE) connected right now?",
  get_promoter_activity_tracker: "Are promoter/insider disclosure feeds connected right now?",
  get_institutional_intelligence: "Who is buying and selling India — FII, DII, MF smart money and ownership signals?",
  get_legal_risk_monitor: "Any NCLT, SEBI, ED, or court risk headlines affecting Indian companies?",
  get_search_trend_attention: "Which topics have the highest Google search Attention Index right now?",
  get_primary_offers: "List open NCD and rights issues from Chittorgarh.",
  get_research_reports: "Latest broker reports on banks.",
  get_analyst_credibility: "Which brokers have the best recent hit rate?",
  get_option_expiries: "NIFTY option expiries.",
  get_option_chain: "NIFTY option chain for the nearest expiry.",
  get_options_flow: "Any recent options-flow flags?",
  get_scanner: "Which scanners flag INFY?",
  get_ai_signals:
    "What are today's AI signals for NIFTY and other F&O indices, including ensemble lean and BTST/STBT names?",
  get_scanner_backtest: "Which scanner has the best backtested edge?",
  get_data_health: "Is any of the data stale?",
  get_latest_update: "What's new on the site?",
  mi_sign_in: "Sign in with my Market Intelligence email and password.",
  mi_session_status: "Who am I signed in as on MCP?",
  get_optionstrat_recommend: "Recommend theta spreads for BANK NIFTY with bullish bias.",
  get_my_portfolio: "Show my portfolio NAV and risk metrics.",
  get_my_alerts: "List my alert rules and recent events.",
  ask_site_assistant: "How do I use AI Signals on the site?",
  get_data_export_info: "How do I download the full data Excel export?",
  get_security_detail: "Full quote and history summary for INFY.",
  list_portal_pages: "What pages exist on Market Intelligence?",
  search_help: "How do I connect Claude to MCP?",
  get_my_watchlist: "What's on my watchlist?",
  add_holding: "Add 10 shares of RELIANCE at 2500 INR to my portfolio.",
  remove_holding: "Remove holding id … from my portfolio.",
  sell_holding: "Sell 5 shares of TCS at 4100.",
  update_portfolio_settings: "Rename my portfolio to Core India book.",
  parse_portfolio_statement: "Parse this broker CSV into holdings.",
  import_portfolio_holdings: "Import these holdings replacing my book.",
  get_my_portfolio_activity: "Show my trade log and realized P&L.",
  get_my_portfolio_tax: "Estimate STCG/LTCG tax on my portfolio.",
  add_to_watchlist: "Add HDFCBANK to my watchlist.",
  remove_from_watchlist: "Remove watchlist item …",
  create_alert: "Alert me when stress index is above 70.",
  delete_alert: "Delete alert rule …",
  set_alert_active: "Pause alert rule …",
};

const GROUP_ORDER = ["Markets", "Macro", "Intelligence", "Research", "Derivatives", "Scanners", "Portfolio", "Watchlist", "Alerts", "System", "Account"] as const;

/** Help table rows — always derived from the live MCP tool registry (`tools/list`). */
export function buildHelpMcpToolRows(): HelpToolRow[] {
  const rows = TOOLS.map((t) => ({
    group: t.category ?? "Other",
    name: t.name,
    returns: t.description,
    ask: ASK[t.name] ?? `Call ${t.name} with the arguments from tools/list.`,
  }));
  rows.sort((a, b) => {
    const ga = GROUP_ORDER.indexOf(a.group as (typeof GROUP_ORDER)[number]);
    const gb = GROUP_ORDER.indexOf(b.group as (typeof GROUP_ORDER)[number]);
    const oa = ga === -1 ? 99 : ga;
    const ob = gb === -1 ? 99 : gb;
    if (oa !== ob) return oa - ob;
    return a.name.localeCompare(b.name);
  });
  return rows;
}
