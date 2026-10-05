/** Admin analytics dashboard sections and metric keys (labels match product spec). */

export type AnalyticsMetricDef = {
  key: string;
  label: string;
  format?: "number" | "percent" | "duration" | "currency" | "ratio";
  hint?: string;
  href?: string;
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
      { key: "total_users", label: "Total Users", format: "number", href: "/admin/customers" },
      { key: "new_users", label: "New Users", format: "number", href: "/admin/customers" },
      { key: "returning_users", label: "Returning Users", format: "number", href: "/admin/customers" },
      { key: "registered_users", label: "Registered Users", format: "number", href: "/admin/customers" },
      { key: "sign_ups", label: "Sign-ups", format: "number", href: "/admin/customers" },
      { key: "sign_up_conversion_rate", label: "Sign-up Conversion Rate", format: "percent", href: "/admin/retargeting" },
      { key: "active_users", label: "Active Users", format: "number", href: "/admin/analytics#daily-pageviews" },
      { key: "dau", label: "DAU", format: "number", href: "/admin/analytics#daily-pageviews" },
      { key: "wau", label: "WAU", format: "number", href: "/admin/analytics#daily-pageviews" },
      { key: "mau", label: "MAU", format: "number", href: "/admin/analytics#daily-pageviews" },
      { key: "dau_mau_ratio", label: "DAU/MAU Ratio", format: "ratio", href: "/admin/analytics#daily-pageviews" },
      { key: "user_growth_rate", label: "User Growth Rate", format: "percent", href: "/admin/customers" },
    ],
  },
  {
    id: "engagement",
    title: "Engagement",
    metrics: [
      { key: "avg_session_duration", label: "Average Session Duration", format: "duration", href: "/admin/analytics#daily-pageviews" },
      { key: "avg_sessions_per_user", label: "Average Sessions per User", format: "number", href: "/admin/analytics#daily-pageviews" },
      { key: "sessions_per_day", label: "Sessions per Day", format: "number", href: "/admin/analytics#daily-pageviews" },
      { key: "pages_per_session", label: "Pages per Session", format: "number", href: "/admin/analytics#top-pages" },
      { key: "screens_per_session", label: "Screens per Session", format: "number", href: "/admin/analytics#top-pages" },
      { key: "engagement_rate", label: "Engagement Rate", format: "percent", href: "/admin/analytics#top-pages" },
      { key: "bounce_rate", label: "Bounce Rate", format: "percent", href: "/admin/analytics#top-pages" },
      {
        key: "scroll_depth",
        label: "Scroll Depth",
        format: "percent",
        hint: "Requires scroll beacons (not wired yet).",
        href: "/admin/analytics#top-pages",
      },
      {
        key: "active_time",
        label: "Active Time",
        format: "duration",
        hint: "Estimated from time-on-page beacons when available.",
        href: "/admin/analytics#daily-pageviews",
      },
      {
        key: "feature_usage",
        label: "Feature Usage",
        format: "number",
        hint: "Distinct feature events (30d).",
        href: "/admin/analytics#feature-events",
      },
    ],
  },
  {
    id: "acquisition",
    title: "Acquisition",
    metrics: [
      {
        key: "traffic_sources",
        label: "Traffic Sources",
        format: "number",
        hint: "Distinct referrer classes (30d).",
        href: "/admin/analytics#traffic-mix",
      },
      { key: "organic_traffic", label: "Organic Traffic", format: "number", href: "/admin/analytics#traffic-mix" },
      { key: "direct_traffic", label: "Direct Traffic", format: "number", href: "/admin/analytics#traffic-mix" },
      { key: "referral_traffic", label: "Referral Traffic", format: "number", href: "/admin/analytics#traffic-mix" },
      { key: "social_traffic", label: "Social Traffic", format: "number", href: "/admin/analytics#traffic-mix" },
      { key: "paid_traffic", label: "Paid Traffic", format: "number", href: "/admin/analytics#traffic-mix" },
      { key: "landing_page_views", label: "Landing Page Views", format: "number", href: "/Home" },
      { key: "visitor_signup_conversion", label: "Visitor → Signup Conversion", format: "percent", href: "/signup" },
      {
        key: "cac",
        label: "CAC",
        format: "currency",
        hint: "No ad spend connected.",
        href: "/admin/retargeting",
      },
      {
        key: "acquisition_cost",
        label: "Acquisition Cost",
        format: "currency",
        hint: "No ad spend connected.",
        href: "/admin/retargeting",
      },
    ],
  },
  {
    id: "retention",
    title: "Retention",
    metrics: [
      { key: "d1_retention", label: "D1 Retention", format: "percent", href: "/admin/analytics#retention" },
      { key: "d7_retention", label: "D7 Retention", format: "percent", href: "/admin/analytics#retention" },
      { key: "d30_retention", label: "D30 Retention", format: "percent", href: "/admin/analytics#retention" },
      { key: "weekly_retention", label: "Weekly Retention", format: "percent", href: "/admin/analytics#retention" },
      { key: "monthly_retention", label: "Monthly Retention", format: "percent", href: "/admin/analytics#retention" },
      { key: "churn_rate", label: "Churn Rate", format: "percent", href: "/admin/retargeting" },
      { key: "returning_user_rate", label: "Returning User Rate", format: "percent", href: "/admin/analytics#retention" },
      {
        key: "cohort_retention",
        label: "Cohort Retention",
        format: "percent",
        hint: "Avg D7 for signups 8–37 days ago.",
        href: "/admin/analytics#retention",
      },
    ],
  },
  {
    id: "product",
    title: "Product Usage",
    metrics: [
      { key: "search_queries", label: "Search Queries", format: "number", href: "/research" },
      { key: "ai_queries", label: "AI Queries", format: "number", href: "/research/ai-desk" },
      { key: "portfolio_created", label: "Portfolio Created", format: "number", href: "/portfolio" },
      { key: "portfolio_views", label: "Portfolio Views", format: "number", href: "/portfolio" },
      { key: "stock_searches", label: "Stock Searches", format: "number", href: "/markets/india" },
      {
        key: "watchlists_created",
        label: "Watchlists Created",
        format: "number",
        hint: "Watchlists not stored separately yet.",
        href: "/portfolio/watchlist",
      },
      { key: "alerts_created", label: "Alerts Created", format: "number", href: "/admin/alerts" },
      { key: "reports_generated", label: "Reports Generated", format: "number", href: "/research-reports" },
      { key: "dashboard_views", label: "Dashboard Views", format: "number", href: "/Home" },
      { key: "analytics_views", label: "Analytics Views", format: "number", href: "/admin/analytics" },
      {
        key: "api_usage",
        label: "API Usage",
        format: "number",
        hint: "Rate-limit hits (30d proxy).",
        href: "/admin/system",
      },
      {
        key: "most_used_features",
        label: "Most Used Features",
        format: "number",
        hint: "Top feature event count (30d).",
        href: "/admin/analytics#feature-events",
      },
      { key: "feature_adoption_rate", label: "Feature Adoption Rate", format: "percent", href: "/admin/analytics#feature-events" },
    ],
  },
  {
    id: "monetization",
    title: "Conversion / Monetization",
    metrics: [
      { key: "free_users", label: "Free Users", format: "number", href: "/admin/retargeting" },
      { key: "paid_users", label: "Paid Users", format: "number", hint: "No paid plans in app yet.", href: "/admin/retargeting" },
      { key: "trial_users", label: "Trial Users", format: "number", hint: "No trials in app yet.", href: "/admin/retargeting" },
      { key: "trial_paid_conversion", label: "Trial → Paid Conversion", format: "percent", hint: "N/A", href: "/admin/retargeting" },
      { key: "free_paid_conversion", label: "Free → Paid Conversion", format: "percent", hint: "N/A", href: "/admin/retargeting" },
      { key: "subscription_conversion_rate", label: "Subscription Conversion Rate", format: "percent", hint: "N/A", href: "/pricing" },
      { key: "mrr", label: "MRR", format: "currency", hint: "N/A", href: "/admin/retargeting" },
      { key: "arr", label: "ARR", format: "currency", hint: "N/A", href: "/admin/retargeting" },
      { key: "arpu", label: "ARPU", format: "currency", hint: "N/A", href: "/admin/retargeting" },
      { key: "ltv", label: "LTV", format: "currency", hint: "N/A", href: "/admin/retargeting" },
      { key: "churned_customers", label: "Churned Customers", format: "number", hint: "N/A", href: "/admin/retargeting" },
    ],
  },
  {
    id: "funnel",
    title: "Funnel",
    metrics: [
      { key: "funnel_visitors", label: "Visitors", format: "number", href: "/Home" },
      { key: "funnel_landing", label: "Landing Page View", format: "number", href: "/Home" },
      { key: "funnel_signup_started", label: "Signup Started", format: "number", href: "/signup" },
      { key: "funnel_signup_completed", label: "Signup Completed", format: "number", href: "/admin/customers" },
      {
        key: "funnel_onboarding_started",
        label: "Onboarding Started",
        format: "number",
        hint: "Uses first /Home view after signup.",
        href: "/onboarding",
      },
      {
        key: "funnel_onboarding_completed",
        label: "Onboarding Completed",
        format: "number",
        hint: "Guided tour completion not tracked yet.",
        href: "/Home",
      },
      { key: "funnel_first_search", label: "First Search", format: "number", href: "/research" },
      { key: "funnel_first_portfolio", label: "First Portfolio", format: "number", href: "/portfolio" },
      { key: "funnel_first_ai", label: "First AI Query", format: "number", href: "/research/ai-desk" },
      { key: "funnel_first_return", label: "First Return Visit", format: "number", href: "/Home" },
      { key: "funnel_paid_conversion", label: "Paid Conversion", format: "number", hint: "N/A", href: "/pricing" },
    ],
  },
  {
    id: "realtime",
    title: "Real-Time",
    metrics: [
      {
        key: "users_online",
        label: "Users Online",
        format: "number",
        hint: "Sessions active in last 5 minutes.",
        href: "/admin/analytics#daily-pageviews",
      },
      { key: "active_sessions", label: "Active Sessions", format: "number", href: "/admin/analytics#daily-pageviews" },
      { key: "current_searches", label: "Current Searches", format: "number", href: "/research" },
      { key: "current_ai_queries", label: "Current AI Queries", format: "number", href: "/research/ai-desk" },
      { key: "current_portfolio_views", label: "Current Portfolio Views", format: "number", href: "/portfolio" },
      {
        key: "live_traffic",
        label: "Live Traffic",
        format: "number",
        hint: "Pageviews last 5 minutes.",
        href: "/admin/analytics#daily-pageviews",
      },
      {
        key: "live_signups",
        label: "Live Sign-ups",
        format: "number",
        hint: "Registrations last 24h.",
        href: "/admin/customers",
      },
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
        href: "/admin/system",
      },
      {
        key: "api_response_time",
        label: "API Response Time",
        format: "duration",
        hint: "Not measured server-side yet.",
        href: "/admin/system",
      },
      {
        key: "error_rate",
        label: "Error Rate",
        format: "percent",
        hint: "Client errors not tracked yet.",
        href: "/admin/system",
      },
      { key: "crash_rate", label: "Crash Rate", format: "percent", hint: "Not tracked yet.", href: "/admin/system" },
      {
        key: "browser",
        label: "Browser",
        format: "number",
        hint: "Top browser (30d sample).",
        href: "/admin/analytics#traffic-mix",
      },
      {
        key: "device",
        label: "Device",
        format: "number",
        hint: "Mobile vs desktop share.",
        href: "/admin/analytics#traffic-mix",
      },
      { key: "os", label: "OS", format: "number", hint: "Top OS (30d sample).", href: "/admin/analytics#traffic-mix" },
      { key: "screen_size", label: "Screen Size", format: "number", hint: "Not tracked yet.", href: "/admin/analytics#traffic-mix" },
      {
        key: "geographic_distribution",
        label: "Geographic Distribution",
        format: "number",
        hint: "Geo IP not enabled.",
        href: "/admin/analytics#traffic-mix",
      },
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
