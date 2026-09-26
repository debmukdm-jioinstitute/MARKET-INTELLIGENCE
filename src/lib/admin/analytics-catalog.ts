/** Admin analytics dashboard sections and metric keys (labels match product spec). */

export type AnalyticsMetricDef = {
  key: string;
  label: string;
  format?: "number" | "percent" | "duration" | "currency" | "ratio";
  hint?: string;
};

export type AnalyticsSectionDef = {
  id: string;
  title: string;
  metrics: AnalyticsMetricDef[];
};

export const ANALYTICS_SECTIONS: AnalyticsSectionDef[] = [
  {
    id: "user-growth",
    title: "User & Growth",
    metrics: [
      { key: "total_users", label: "Total Users", format: "number" },
      { key: "new_users", label: "New Users", format: "number" },
      { key: "returning_users", label: "Returning Users", format: "number" },
      { key: "registered_users", label: "Registered Users", format: "number" },
      { key: "sign_ups", label: "Sign-ups", format: "number" },
      { key: "sign_up_conversion_rate", label: "Sign-up Conversion Rate", format: "percent" },
      { key: "active_users", label: "Active Users", format: "number" },
      { key: "dau", label: "DAU", format: "number" },
      { key: "wau", label: "WAU", format: "number" },
      { key: "mau", label: "MAU", format: "number" },
      { key: "dau_mau_ratio", label: "DAU/MAU Ratio", format: "ratio" },
      { key: "user_growth_rate", label: "User Growth Rate", format: "percent" },
    ],
  },
  {
    id: "engagement",
    title: "Engagement",
    metrics: [
      { key: "avg_session_duration", label: "Average Session Duration", format: "duration" },
      { key: "avg_sessions_per_user", label: "Average Sessions per User", format: "number" },
      { key: "sessions_per_day", label: "Sessions per Day", format: "number" },
      { key: "pages_per_session", label: "Pages per Session", format: "number" },
      { key: "screens_per_session", label: "Screens per Session", format: "number" },
      { key: "engagement_rate", label: "Engagement Rate", format: "percent" },
      { key: "bounce_rate", label: "Bounce Rate", format: "percent" },
      {
        key: "scroll_depth",
        label: "Scroll Depth",
        format: "percent",
        hint: "Requires scroll beacons (not wired yet).",
      },
      {
        key: "active_time",
        label: "Active Time",
        format: "duration",
        hint: "Estimated from time-on-page beacons when available.",
      },
      { key: "feature_usage", label: "Feature Usage", format: "number", hint: "Distinct feature events (30d)." },
    ],
  },
  {
    id: "acquisition",
    title: "Acquisition",
    metrics: [
      { key: "traffic_sources", label: "Traffic Sources", format: "number", hint: "Distinct referrer classes (30d)." },
      { key: "organic_traffic", label: "Organic Traffic", format: "number" },
      { key: "direct_traffic", label: "Direct Traffic", format: "number" },
      { key: "referral_traffic", label: "Referral Traffic", format: "number" },
      { key: "social_traffic", label: "Social Traffic", format: "number" },
      { key: "paid_traffic", label: "Paid Traffic", format: "number" },
      { key: "landing_page_views", label: "Landing Page Views", format: "number" },
      { key: "visitor_signup_conversion", label: "Visitor → Signup Conversion", format: "percent" },
      {
        key: "cac",
        label: "CAC",
        format: "currency",
        hint: "No ad spend connected.",
      },
      {
        key: "acquisition_cost",
        label: "Acquisition Cost",
        format: "currency",
        hint: "No ad spend connected.",
      },
    ],
  },
  {
    id: "retention",
    title: "Retention",
    metrics: [
      { key: "d1_retention", label: "D1 Retention", format: "percent" },
      { key: "d7_retention", label: "D7 Retention", format: "percent" },
      { key: "d30_retention", label: "D30 Retention", format: "percent" },
      { key: "weekly_retention", label: "Weekly Retention", format: "percent" },
      { key: "monthly_retention", label: "Monthly Retention", format: "percent" },
      { key: "churn_rate", label: "Churn Rate", format: "percent" },
      { key: "returning_user_rate", label: "Returning User Rate", format: "percent" },
      { key: "cohort_retention", label: "Cohort Retention", format: "percent", hint: "Avg D7 for signups 8–37 days ago." },
    ],
  },
  {
    id: "product",
    title: "Product Usage",
    metrics: [
      { key: "search_queries", label: "Search Queries", format: "number" },
      { key: "ai_queries", label: "AI Queries", format: "number" },
      { key: "portfolio_created", label: "Portfolio Created", format: "number" },
      { key: "portfolio_views", label: "Portfolio Views", format: "number" },
      { key: "stock_searches", label: "Stock Searches", format: "number" },
      {
        key: "watchlists_created",
        label: "Watchlists Created",
        format: "number",
        hint: "Watchlists not stored separately yet.",
      },
      { key: "alerts_created", label: "Alerts Created", format: "number" },
      { key: "reports_generated", label: "Reports Generated", format: "number" },
      { key: "dashboard_views", label: "Dashboard Views", format: "number" },
      { key: "analytics_views", label: "Analytics Views", format: "number" },
      { key: "api_usage", label: "API Usage", format: "number", hint: "Rate-limit hits (30d proxy)." },
      { key: "most_used_features", label: "Most Used Features", format: "number", hint: "Top feature event count (30d)." },
      { key: "feature_adoption_rate", label: "Feature Adoption Rate", format: "percent" },
    ],
  },
  {
    id: "monetization",
    title: "Conversion / Monetization",
    metrics: [
      { key: "free_users", label: "Free Users", format: "number" },
      { key: "paid_users", label: "Paid Users", format: "number", hint: "No paid plans in app yet." },
      { key: "trial_users", label: "Trial Users", format: "number", hint: "No trials in app yet." },
      { key: "trial_paid_conversion", label: "Trial → Paid Conversion", format: "percent", hint: "N/A" },
      { key: "free_paid_conversion", label: "Free → Paid Conversion", format: "percent", hint: "N/A" },
      { key: "subscription_conversion_rate", label: "Subscription Conversion Rate", format: "percent", hint: "N/A" },
      { key: "mrr", label: "MRR", format: "currency", hint: "N/A" },
      { key: "arr", label: "ARR", format: "currency", hint: "N/A" },
      { key: "arpu", label: "ARPU", format: "currency", hint: "N/A" },
      { key: "ltv", label: "LTV", format: "currency", hint: "N/A" },
      { key: "churned_customers", label: "Churned Customers", format: "number", hint: "N/A" },
    ],
  },
  {
    id: "funnel",
    title: "Funnel",
    metrics: [
      { key: "funnel_visitors", label: "Visitors", format: "number" },
      { key: "funnel_landing", label: "Landing Page View", format: "number" },
      { key: "funnel_signup_started", label: "Signup Started", format: "number" },
      { key: "funnel_signup_completed", label: "Signup Completed", format: "number" },
      { key: "funnel_onboarding_started", label: "Onboarding Started", format: "number", hint: "Uses first /Home view after signup." },
      { key: "funnel_onboarding_completed", label: "Onboarding Completed", format: "number", hint: "Guided tour completion not tracked yet." },
      { key: "funnel_first_search", label: "First Search", format: "number" },
      { key: "funnel_first_portfolio", label: "First Portfolio", format: "number" },
      { key: "funnel_first_ai", label: "First AI Query", format: "number" },
      { key: "funnel_first_return", label: "First Return Visit", format: "number" },
      { key: "funnel_paid_conversion", label: "Paid Conversion", format: "number", hint: "N/A" },
    ],
  },
  {
    id: "realtime",
    title: "Real-Time",
    metrics: [
      { key: "users_online", label: "Users Online", format: "number", hint: "Sessions active in last 5 minutes." },
      { key: "active_sessions", label: "Active Sessions", format: "number" },
      { key: "current_searches", label: "Current Searches", format: "number" },
      { key: "current_ai_queries", label: "Current AI Queries", format: "number" },
      { key: "current_portfolio_views", label: "Current Portfolio Views", format: "number" },
      { key: "live_traffic", label: "Live Traffic", format: "number", hint: "Pageviews last 5 minutes." },
      { key: "live_signups", label: "Live Sign-ups", format: "number", hint: "Registrations last 24h." },
    ],
  },
  {
    id: "technical",
    title: "Technical / UX",
    metrics: [
      {
        key: "page_load_time",
        label: "Page Load Time",
        format: "duration",
        hint: "RUM not connected; shows median time-on-page proxy.",
      },
      { key: "api_response_time", label: "API Response Time", format: "duration", hint: "Not measured server-side yet." },
      { key: "error_rate", label: "Error Rate", format: "percent", hint: "Client errors not tracked yet." },
      { key: "crash_rate", label: "Crash Rate", format: "percent", hint: "Not tracked yet." },
      { key: "browser", label: "Browser", format: "number", hint: "Top browser (30d sample)." },
      { key: "device", label: "Device", format: "number", hint: "Mobile vs desktop share." },
      { key: "os", label: "OS", format: "number", hint: "Top OS (30d sample)." },
      { key: "screen_size", label: "Screen Size", format: "number", hint: "Not tracked yet." },
      { key: "geographic_distribution", label: "Geographic Distribution", format: "number", hint: "Geo IP not enabled." },
    ],
  },
];

export type AnalyticsDashboardPayload = {
  generatedAt: string;
  metrics: Record<string, number | string | null>;
  metricHints: Record<string, string>;
  daily: { day: string; n: number }[];
  topPaths: { path: string; n: number }[];
  topFeatures: { name: string; n: number }[];
  trafficMix: { source: string; n: number }[];
};
