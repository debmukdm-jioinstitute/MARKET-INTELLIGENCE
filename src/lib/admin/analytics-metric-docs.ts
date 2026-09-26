export type AnalyticsMetricDoc = {
  calculation: string;
  insight?: string;
  whyEmpty?: string;
};

/** How each admin analytics tile is computed and why it may show — or 0. */
export const ANALYTICS_METRIC_DOCS: Record<string, AnalyticsMetricDoc> = {
  total_users: {
    calculation: "COUNT(*) FROM users WHERE role = 'user' (excludes admin accounts).",
    insight: "Baseline registered accounts with passwords — not guest terminal sessions.",
    whyEmpty: "No DATABASE_URL or users table empty — signups not persisted yet.",
  },
  new_users: {
    calculation: "Users created in the last 30 days (same role filter).",
    insight: "Compare month-over-month with User Growth Rate for momentum.",
    whyEmpty: "No registrations in 30d or DB unavailable.",
  },
  returning_users: {
    calculation: "Signed-in emails with pageview activity on more than one calendar day in the last 7 days.",
    insight: "Strong signal for habit — macro desks often spike on event days only.",
    whyEmpty: "No multi-day signed-in traffic in 7d yet.",
  },
  registered_users: {
    calculation: "Same as Total Users — all non-admin accounts in users.",
    insight: "Guests who never sign up are tracked only in anonymous analytics_events.",
  },
  sign_ups: {
    calculation: "New user rows in the last 7 days.",
    insight: "Short window — pair with Sign-up Conversion for quality, not just volume.",
    whyEmpty: "No signups this week.",
  },
  sign_up_conversion_rate: {
    calculation: "New users (30d) ÷ max(MAU, funnel visitors, 1) × 100 — proxy until anonymous visitor IDs exist.",
    insight: "Denominator is conservative; real conversion is often lower when many anonymous pageviews exist.",
    whyEmpty: "Need both traffic events and at least one signup to compute.",
  },
  active_users: {
    calculation: "MAU — distinct session_id or signed-in email in analytics_events (30d).",
    insight: "Includes anonymous sessions with mi_sid cookie, not only registered users.",
    whyEmpty: "No analytics_events in 30d — portal pageview beacon not firing.",
  },
  dau: {
    calculation: "Distinct visitors today (UTC day boundary on server) from analytics_events.",
    insight: "Indian market hours may cluster DAU — check time-of-day in daily chart.",
    whyEmpty: "No events recorded today yet.",
  },
  wau: {
    calculation: "Distinct visitors in rolling 7 days.",
    whyEmpty: "No pageviews in 7d.",
  },
  mau: {
    calculation: "Distinct visitors in rolling 30 days.",
    whyEmpty: "No pageviews in 30d.",
  },
  dau_mau_ratio: {
    calculation: "DAU ÷ MAU (stickiness). Healthy consumer apps often target 0.15–0.25+.",
    insight: "Low ratio with high MAU = many occasional users (typical for free macro sites).",
    whyEmpty: "MAU is 0 — cannot divide.",
  },
  user_growth_rate: {
    calculation: "(Signups this calendar month − last month) ÷ last month × 100.",
    insight: "First month with users shows 100% if prior month was zero.",
    whyEmpty: "No user rows to compare months.",
  },
  avg_session_duration: {
    calculation: "Per session (session_id or email+day): max( time span between first/last pageview, sum of duration_sec beacons ) averaged over 30d.",
    insight: "Duration beacons ship on route change — single-page visits may under-report until user navigates.",
    whyEmpty: "No sessions or no duration_sec collected yet (deploy after tracker update).",
  },
  avg_sessions_per_user: {
    calculation: "Session count (30d) ÷ WAU.",
    whyEmpty: "WAU is 0.",
  },
  sessions_per_day: {
    calculation: "Total sessions in 30d ÷ 30.",
    whyEmpty: "No session grouping data.",
  },
  pages_per_session: {
    calculation: "Average pageviews per session (30d pageview events only).",
    insight: "Macro power users often 5+; bounce sessions pull this down.",
    whyEmpty: "No pageviews in 30d.",
  },
  screens_per_session: {
    calculation: "Same as Pages per Session (web has no separate screen API).",
  },
  engagement_rate: {
    calculation: "100% − bounce rate (sessions with exactly one pageview).",
    whyEmpty: "No sessions to measure.",
  },
  bounce_rate: {
    calculation: "Single-pageview sessions ÷ all sessions × 100 (30d).",
    insight: "High bounce on deep links (/macro/currency) can be normal if user got the quote and left.",
    whyEmpty: "No sessions yet.",
  },
  scroll_depth: {
    calculation: "Not implemented — would need scroll % beacons on main content.",
    whyEmpty: "Shows — until scroll tracking is added to AppShell.",
  },
  active_time: {
    calculation: "Proxy: average duration_sec on pageview events when beacon sends time-on-page.",
    whyEmpty: "Old events lack duration_sec — browse portal after deploy to backfill.",
  },
  feature_usage: {
    calculation: "Count of non-pageview analytics events (ai_query, search, etc.) in 30d.",
    insight: "AI assistant usage appears after users chat post-deploy.",
    whyEmpty: "No feature event_type rows yet.",
  },
  traffic_sources: {
    calculation: "Count of distinct referrer buckets (organic, direct, referral, social, paid) seen in 30d.",
    whyEmpty: "No referrer field populated on events.",
  },
  organic_traffic: {
    calculation: "Pageviews whose document.referrer matches Google/Bing/DuckDuckGo/Yahoo.",
    whyEmpty: "No organic referrers — users may use direct or in-app browsers.",
  },
  direct_traffic: {
    calculation: "Pageviews with empty referrer (typed URL, bookmark, new tab).",
  },
  referral_traffic: {
    calculation: "Non-empty referrer that is not classified as organic, social, or paid.",
  },
  social_traffic: {
    calculation: "Referrer contains Facebook, Twitter/X, LinkedIn, Instagram, Reddit.",
  },
  paid_traffic: {
    calculation: "Referrer contains utm_medium=cpc/paid or gclid=.",
    whyEmpty: "No paid campaigns tagged in URLs yet.",
  },
  landing_page_views: {
    calculation: "Pageviews to / or /signup in 30d (funnel proxy).",
  },
  visitor_signup_conversion: {
    calculation: "Same proxy as Sign-up Conversion Rate.",
  },
  cac: {
    calculation: "Customer acquisition cost = ad spend ÷ new customers — requires billing + ads integration.",
    whyEmpty: "No Stripe/ad spend wired — cannot compute CAC.",
  },
  acquisition_cost: {
    calculation: "Total marketing spend in period — not stored in this app.",
    whyEmpty: "No ad spend data source.",
  },
  d1_retention: {
    calculation: "% of users (signup ≥1d ago) with analytics activity on signup_day + 1.",
    insight: "Needs enough cohort size — small samples swing wildly.",
    whyEmpty: "No users old enough for D1 or no post-signup pageviews.",
  },
  d7_retention: {
    calculation: "% of users with any activity between day 1–7 after signup.",
    whyEmpty: "Cohort too new or no returning activity logged.",
  },
  d30_retention: {
    calculation: "% of users with activity between day 1–30 after signup (signup ≥31d ago).",
    whyEmpty: "Need users registered 31+ days with tracked logins.",
  },
  weekly_retention: {
    calculation: "Alias of D7 retention proxy.",
  },
  monthly_retention: {
    calculation: "Alias of D30 retention proxy.",
  },
  churn_rate: {
    calculation: "100% − D30 retention (registered users who stopped returning).",
    whyEmpty: "D30 not available yet.",
  },
  returning_user_rate: {
    calculation: "Returning users (7d) ÷ WAU × 100.",
    whyEmpty: "WAU is 0.",
  },
  cohort_retention: {
    calculation: "Average D7-style return for users who signed up 8–37 days ago.",
    whyEmpty: "Not enough aged cohort users.",
  },
  search_queries: {
    calculation: "analytics_events WHERE event_type = 'search' (30d).",
    whyEmpty: "Search not logged yet — wire instrument search API / command palette.",
  },
  ai_queries: {
    calculation: "analytics_events WHERE event_type = 'ai_query' (logged on /api/site-assistant).",
    insight: "Spikes when OmniRoute assistant is enabled and users are signed in.",
    whyEmpty: "No assistant calls since logging enabled.",
  },
  portfolio_created: {
    calculation: "COUNT(*) FROM portfolio_settings (one row per user who opened portfolio).",
    whyEmpty: "Nobody created a portfolio row yet.",
  },
  portfolio_views: {
    calculation: "Pageviews where path LIKE '/portfolio%' (30d).",
  },
  stock_searches: {
    calculation: "Pageviews under /research% (30d) as research navigation proxy.",
    insight: "Not true symbol search count until search events are instrumented.",
  },
  watchlists_created: {
    calculation: "Not stored — no watchlist table in schema.",
    whyEmpty: "Feature not built — always — until watchlists ship.",
  },
  alerts_created: {
    calculation: "COUNT(*) FROM alert_rules.",
    whyEmpty: "No alert rules in DB.",
  },
  reports_generated: {
    calculation: "COUNT(*) FROM research_reports (scraped broker reports, not user PDFs).",
  },
  dashboard_views: {
    calculation: "Pageviews to /Home (30d).",
  },
  analytics_views: {
    calculation: "Not tracked on portal — admin-only page; shows 0 or —.",
    whyEmpty: "Portal users do not hit /admin/analytics.",
  },
  api_usage: {
    calculation: "Rows in rate_limits table (30d) — proxy for throttled API calls.",
    insight: "Under-counts uncapped routes; over-counts burst traffic on limited endpoints.",
  },
  most_used_features: {
    calculation: "Highest count among non-pageview event_type values (30d).",
    whyEmpty: "Only pageviews recorded so far.",
  },
  feature_adoption_rate: {
    calculation: "min(feature users, total users) ÷ total users × 100 (approximation).",
    whyEmpty: "No feature events or zero users.",
  },
  free_users: {
    calculation: "All registered users — no paid tier in product yet.",
  },
  paid_users: {
    calculation: "Would come from billing subscription status.",
    whyEmpty: "No paid plans — shows 0.",
  },
  trial_users: {
    calculation: "Would come from trial flags in billing.",
    whyEmpty: "No trial product — shows 0 or —.",
  },
  trial_paid_conversion: {
    calculation: "Trials converted ÷ trials started.",
    whyEmpty: "No billing — shows —.",
  },
  free_paid_conversion: {
    calculation: "Paid ÷ free users.",
    whyEmpty: "No billing.",
  },
  subscription_conversion_rate: {
    calculation: "Subscribers ÷ registered users.",
    whyEmpty: "No billing.",
  },
  mrr: { calculation: "Sum of active subscription MRR from payment provider.", whyEmpty: "Not connected." },
  arr: { calculation: "MRR × 12.", whyEmpty: "Not connected." },
  arpu: { calculation: "MRR ÷ paying users.", whyEmpty: "Not connected." },
  ltv: { calculation: "ARPU ÷ churn — needs monetization data.", whyEmpty: "Not connected." },
  churned_customers: {
    calculation: "Canceled subscriptions in period.",
    whyEmpty: "Not connected.",
  },
  funnel_visitors: {
    calculation: "Distinct session_id / email in analytics_events (30d).",
  },
  funnel_landing: {
    calculation: "Views of / and /signup.",
  },
  funnel_signup_started: {
    calculation: "Pageviews to /signup.",
  },
  funnel_signup_completed: {
    calculation: "New users table rows (30d) — proxy for completed signup.",
  },
  funnel_onboarding_started: {
    calculation: "Distinct signed-in users who viewed /Home (30d).",
  },
  funnel_onboarding_completed: {
    calculation: "Guided tour completion event — not instrumented.",
    whyEmpty: "Tour finish not tracked — shows —.",
  },
  funnel_first_search: {
    calculation: "search events (30d).",
    whyEmpty: "Search events not wired.",
  },
  funnel_first_portfolio: {
    calculation: "Total portfolio_settings rows (lifetime).",
  },
  funnel_first_ai: {
    calculation: "Distinct users with ai_query events.",
  },
  funnel_first_return: {
    calculation: "Users with analytics on 2+ distinct days.",
  },
  funnel_paid_conversion: {
    calculation: "Paid conversions.",
    whyEmpty: "No billing.",
  },
  users_online: {
    calculation: "Distinct session_id or email in last 5 minutes.",
    insight: "Refresh dashboard to update — not WebSocket live.",
    whyEmpty: "No traffic in last 5 minutes.",
  },
  active_sessions: {
    calculation: "Distinct session_id in last 5 minutes (falls back to online count).",
  },
  current_searches: {
    calculation: "search events in last 5 minutes.",
    whyEmpty: "Idle or search not instrumented.",
  },
  current_ai_queries: {
    calculation: "ai_query events in last 5 minutes.",
  },
  current_portfolio_views: {
    calculation: "Pageviews matching /portfolio% in last 5 minutes.",
  },
  live_traffic: {
    calculation: "Pageview count in last 5 minutes.",
  },
  live_signups: {
    calculation: "users.created_at in last 24 hours.",
  },
  page_load_time: {
    calculation: "Proxy: avg time-on-page from duration beacons — not true RUM LCP.",
    whyEmpty: "No duration beacons yet.",
  },
  api_response_time: {
    calculation: "Would need APM on API routes.",
    whyEmpty: "Not measured — shows —.",
  },
  error_rate: {
    calculation: "Client error beacons ÷ pageviews.",
    whyEmpty: "Error tracking not wired.",
  },
  crash_rate: {
    calculation: "Native crash reports — N/A for web.",
    whyEmpty: "Not applicable for web app.",
  },
  browser: {
    calculation: "Top browser from last 400 user_agent strings (30d sample).",
    insight: "Chrome-heavy is typical for Indian desktop finance users.",
    whyEmpty: "No user_agent on events — browse after tracker update.",
  },
  device: {
    calculation: "Mobile vs desktop from user_agent regex on same sample.",
  },
  os: {
    calculation: "Top OS from user_agent sample.",
  },
  screen_size: {
    calculation: "Would need viewport beacon.",
    whyEmpty: "Not tracked — shows —.",
  },
  geographic_distribution: {
    calculation: "Would need GeoIP on edge or analytics ingest.",
    whyEmpty: "Privacy + infra not enabled — shows —.",
  },
};

export function isMetricValueEmpty(value: number | string | null | undefined): boolean {
  if (value == null || value === "") return true;
  if (value === "—") return true;
  return false;
}

export function metricDisplayEmptyReason(
  key: string,
  value: number | string | null | undefined,
  doc?: AnalyticsMetricDoc,
): string | null {
  if (!isMetricValueEmpty(value)) {
    if (typeof value === "number" && value === 0 && doc?.whyEmpty) return doc.whyEmpty;
    return null;
  }
  return doc?.whyEmpty ?? "No data in Postgres for this window yet.";
}
