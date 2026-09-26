import type { AnalyticsDashboardPayload } from "@/lib/admin/analytics-catalog";
import type { NeonQueryFunction } from "@neondatabase/serverless";

function n(row: { n?: number | string | null } | undefined): number {
  const v = row?.n;
  if (v == null) return 0;
  return typeof v === "number" ? v : Number(v) || 0;
}

function f(row: { v?: number | string | null } | undefined): number | null {
  const v = row?.v;
  if (v == null) return null;
  const num = typeof v === "number" ? v : Number(v);
  return Number.isFinite(num) ? num : null;
}

function pct(part: number, whole: number): number | null {
  if (whole <= 0) return null;
  return Math.round((part / whole) * 1000) / 10;
}

function classifyReferrer(referrer: string | null): "organic" | "direct" | "referral" | "social" | "paid" {
  if (!referrer || referrer.trim() === "") return "direct";
  const r = referrer.toLowerCase();
  if (r.includes("google.") || r.includes("bing.") || r.includes("duckduckgo") || r.includes("yahoo.")) return "organic";
  if (
    r.includes("facebook") ||
    r.includes("twitter") ||
    r.includes("t.co") ||
    r.includes("linkedin") ||
    r.includes("instagram") ||
    r.includes("reddit")
  ) {
    return "social";
  }
  if (r.includes("utm_medium=cpc") || r.includes("utm_medium=paid") || r.includes("gclid=")) return "paid";
  return "referral";
}

function parseUa(ua: string | null): { browser: string; os: string; mobile: boolean } {
  if (!ua) return { browser: "Unknown", os: "Unknown", mobile: false };
  const mobile = /Mobile|Android|iPhone|iPad/i.test(ua);
  let browser = "Other";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Edg\//.test(ua)) browser = "Chrome";
  else if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) browser = "Safari";
  else if (/Firefox\//.test(ua)) browser = "Firefox";

  let os = "Other";
  if (/Windows NT/.test(ua)) os = "Windows";
  else if (/Mac OS X/.test(ua) && !/iPhone|iPad/.test(ua)) os = "macOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Linux/.test(ua)) os = "Linux";
  return { browser, os, mobile };
}

export async function computeAnalyticsDashboard(db: NeonQueryFunction<false, false>): Promise<AnalyticsDashboardPayload> {
  const metrics: Record<string, number | string | null> = {};
  const metricHints: Record<string, string> = {};

  const [
    daily,
    topPaths,
    usersTotal,
    usersNew30,
    usersNew7,
    usersNewPrev30,
    usersNewMonth,
    usersNewPrevMonth,
    dau,
    wau,
    mau,
    returning7,
    sessionStats,
    trafficRows,
    retention,
    productCounts,
    realtime,
    featureRows,
    uaSample,
    rateLimitHits,
    funnel,
  ] = await Promise.all([
    db`
      SELECT to_char(date_trunc('day', created_at), 'YYYY-MM-DD') AS day, count(*)::int AS n
      FROM analytics_events
      WHERE created_at > now() - interval '14 days' AND event_type = 'pageview'
      GROUP BY 1 ORDER BY 1
    `,
    db`
      SELECT path, count(*)::int AS n FROM analytics_events
      WHERE created_at > now() - interval '7 days' AND event_type = 'pageview'
      GROUP BY path ORDER BY n DESC LIMIT 15
    `,
    db`SELECT count(*)::int AS n FROM users WHERE role = 'user'`,
    db`SELECT count(*)::int AS n FROM users WHERE role = 'user' AND created_at > now() - interval '30 days'`,
    db`SELECT count(*)::int AS n FROM users WHERE role = 'user' AND created_at > now() - interval '7 days'`,
    db`SELECT count(*)::int AS n FROM users WHERE role = 'user' AND created_at >= now() - interval '60 days' AND created_at < now() - interval '30 days'`,
    db`SELECT count(*)::int AS n FROM users WHERE role = 'user' AND created_at >= date_trunc('month', now())`,
    db`SELECT count(*)::int AS n FROM users WHERE role = 'user' AND created_at >= date_trunc('month', now()) - interval '1 month' AND created_at < date_trunc('month', now())`,
    db`
      SELECT count(DISTINCT coalesce(user_email, session_id, id::text))::int AS n
      FROM analytics_events WHERE created_at >= date_trunc('day', now())
    `,
    db`
      SELECT count(DISTINCT coalesce(user_email, session_id, id::text))::int AS n
      FROM analytics_events WHERE created_at > now() - interval '7 days'
    `,
    db`
      SELECT count(DISTINCT coalesce(user_email, session_id, id::text))::int AS n
      FROM analytics_events WHERE created_at > now() - interval '30 days'
    `,
    db`
      SELECT count(*)::int AS n FROM (
        SELECT user_email FROM analytics_events
        WHERE created_at > now() - interval '7 days' AND user_email IS NOT NULL
        GROUP BY user_email HAVING count(DISTINCT date_trunc('day', created_at)) > 1
      ) t
    `,
    db`
      WITH ev AS (
        SELECT
          coalesce(
            nullif(session_id, ''),
            coalesce(user_email, 'anon') || ':' || to_char(date_trunc('day', created_at), 'YYYY-MM-DD')
          ) AS sid,
          user_email,
          duration_sec,
          created_at
        FROM analytics_events
        WHERE created_at > now() - interval '30 days' AND event_type = 'pageview'
      ),
      sess AS (
        SELECT sid, user_email, count(*)::int AS pages,
          extract(epoch FROM (max(created_at) - min(created_at))) AS span_sec,
          sum(coalesce(duration_sec, 0)) AS sum_dur
        FROM ev GROUP BY sid, user_email
      )
      SELECT
        count(*)::int AS sessions,
        coalesce(avg(nullif(span_sec, 0)), avg(nullif(sum_dur, 0)), 0)::float AS avg_duration,
        coalesce(avg(pages), 0)::float AS avg_pages,
        count(*) FILTER (WHERE pages = 1)::int AS bounce_sessions
      FROM sess
    `,
    db`
      SELECT referrer, count(*)::int AS n FROM analytics_events
      WHERE created_at > now() - interval '30 days' AND event_type = 'pageview'
      GROUP BY referrer
    `,
    db`
      WITH cohort AS (
        SELECT email, date(created_at) AS signup FROM users WHERE role = 'user' AND created_at < now() - interval '1 day'
      ),
      act AS (
        SELECT user_email, date(created_at) AS d FROM analytics_events WHERE user_email IS NOT NULL
      )
      SELECT
        avg(CASE WHEN EXISTS (SELECT 1 FROM act a WHERE a.user_email = c.email AND a.d = c.signup + 1) THEN 1.0 ELSE 0 END)::float AS d1,
        avg(CASE WHEN EXISTS (SELECT 1 FROM act a WHERE a.user_email = c.email AND a.d BETWEEN c.signup + 1 AND c.signup + 7) THEN 1.0 ELSE 0 END)::float AS d7,
        avg(CASE WHEN EXISTS (SELECT 1 FROM act a WHERE a.user_email = c.email AND a.d BETWEEN c.signup + 8 AND c.signup + 37) THEN 1.0 ELSE 0 END)::float AS cohort_d7,
        avg(CASE WHEN EXISTS (SELECT 1 FROM act a WHERE a.user_email = c.email AND a.d BETWEEN c.signup + 1 AND c.signup + 30) THEN 1.0 ELSE 0 END)::float AS d30
      FROM cohort c
      WHERE c.signup <= current_date - 31
    `,
    db`
      SELECT
        (SELECT count(*)::int FROM portfolio_settings) AS portfolios,
        (SELECT count(*)::int FROM alert_rules) AS alerts,
        (SELECT count(*)::int FROM research_reports) AS reports,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'ai_query' AND created_at > now() - interval '30 days') AS ai_queries,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'search' AND created_at > now() - interval '30 days') AS searches,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'pageview' AND path LIKE '/portfolio%' AND created_at > now() - interval '30 days') AS portfolio_views,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'pageview' AND path = '/Home' AND created_at > now() - interval '30 days') AS dashboard_views,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'pageview' AND path LIKE '/research%' AND created_at > now() - interval '30 days') AS stock_searches
    `,
    db`
      SELECT
        (SELECT count(DISTINCT coalesce(session_id, user_email, id::text))::int FROM analytics_events WHERE created_at > now() - interval '5 minutes') AS online,
        (SELECT count(DISTINCT session_id)::int FROM analytics_events WHERE created_at > now() - interval '5 minutes' AND session_id IS NOT NULL) AS sessions,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'search' AND created_at > now() - interval '5 minutes') AS searches,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'ai_query' AND created_at > now() - interval '5 minutes') AS ai,
        (SELECT count(*)::int FROM analytics_events WHERE path LIKE '/portfolio%' AND created_at > now() - interval '5 minutes') AS port_views,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'pageview' AND created_at > now() - interval '5 minutes') AS live_pv,
        (SELECT count(*)::int FROM users WHERE created_at > now() - interval '24 hours') AS signups_24h
    `,
    db`
      SELECT coalesce(event_type, 'pageview') AS name, count(*)::int AS n
      FROM analytics_events
      WHERE created_at > now() - interval '30 days' AND event_type <> 'pageview'
      GROUP BY 1 ORDER BY n DESC LIMIT 8
    `,
    db`
      SELECT user_agent FROM analytics_events
      WHERE created_at > now() - interval '30 days' AND user_agent IS NOT NULL
      ORDER BY created_at DESC LIMIT 400
    `,
    db`SELECT count(*)::int AS n FROM rate_limits WHERE hit_at > now() - interval '30 days'`,
    db`
      SELECT
        (SELECT count(DISTINCT coalesce(session_id, user_email, id::text))::int FROM analytics_events WHERE created_at > now() - interval '30 days') AS visitors,
        (SELECT count(*)::int FROM analytics_events WHERE path IN ('/', '/signup') AND created_at > now() - interval '30 days') AS landing,
        (SELECT count(*)::int FROM analytics_events WHERE path = '/signup' AND created_at > now() - interval '30 days') AS signup_started,
        (SELECT count(*)::int FROM users WHERE created_at > now() - interval '30 days') AS signup_completed,
        (SELECT count(DISTINCT user_email)::int FROM analytics_events WHERE path = '/Home' AND user_email IS NOT NULL AND created_at > now() - interval '30 days') AS onboarding_started,
        (SELECT count(*)::int FROM analytics_events WHERE event_type = 'search' AND created_at > now() - interval '30 days') AS first_search,
        (SELECT count(*)::int FROM portfolio_settings) AS first_portfolio,
        (SELECT count(DISTINCT user_email)::int FROM analytics_events WHERE event_type = 'ai_query' AND user_email IS NOT NULL) AS first_ai,
        (SELECT count(*)::int FROM (
          SELECT user_email FROM analytics_events WHERE user_email IS NOT NULL
          GROUP BY user_email HAVING count(DISTINCT date_trunc('day', created_at)) > 1
        ) t) AS first_return
    `,
  ]);

  const totalUsers = n(usersTotal[0]);
  const newUsers30 = n(usersNew30[0]);
  const newUsers7 = n(usersNew7[0]);
  const prev30 = n(usersNewPrev30[0]);
  const growth30 = prev30 > 0 ? pct(newUsers30 - prev30, prev30) : newUsers30 > 0 ? 100 : 0;
  const prevMonth = n(usersNewPrevMonth[0]);
  const thisMonth = n(usersNewMonth[0]);
  const userGrowthRate = prevMonth > 0 ? pct(thisMonth - prevMonth, prevMonth) : thisMonth > 0 ? 100 : 0;

  const dauN = n(dau[0]);
  const wauN = n(wau[0]);
  const mauN = n(mau[0]);
  const dauMau = mauN > 0 ? Math.round((dauN / mauN) * 1000) / 1000 : null;

  const sess = sessionStats[0] as {
    sessions?: number;
    avg_duration?: number;
    avg_pages?: number;
    bounce_sessions?: number;
  };
  const sessions30 = n({ n: sess?.sessions });
  const avgDur = f({ v: sess?.avg_duration }) ?? 0;
  const avgPages = f({ v: sess?.avg_pages }) ?? 0;
  const bounceSessions = n({ n: sess?.bounce_sessions });
  const bounceRate = pct(bounceSessions, sessions30);
  const engagementRate = bounceRate != null ? Math.max(0, 100 - bounceRate) : null;
  const sessionsPerDay = Math.round((sessions30 / 30) * 10) / 10;
  const avgSessionsPerUser = wauN > 0 ? Math.round((sessions30 / wauN) * 10) / 10 : null;

  let organic = 0;
  let direct = 0;
  let referral = 0;
  let social = 0;
  let paid = 0;
  const sourceSet = new Set<string>();
  for (const row of trafficRows as { referrer: string | null; n: number }[]) {
    const kind = classifyReferrer(row.referrer);
    sourceSet.add(kind);
    const c = n({ n: row.n });
    if (kind === "organic") organic += c;
    else if (kind === "direct") direct += c;
    else if (kind === "social") social += c;
    else if (kind === "paid") paid += c;
    else referral += c;
  }
  const landingViews = (trafficRows as { referrer: string | null; n: number }[]).reduce((s, r) => s + n({ n: r.n }), 0);

  const ret = retention[0] as { d1?: number; d7?: number; d30?: number; cohort_d7?: number };
  const d1 = ret?.d1 != null ? Math.round(ret.d1 * 1000) / 10 : null;
  const d7 = ret?.d7 != null ? Math.round(ret.d7 * 1000) / 10 : null;
  const d30 = ret?.d30 != null ? Math.round(ret.d30 * 1000) / 10 : null;
  const cohortD7 = ret?.cohort_d7 != null ? Math.round(ret.cohort_d7 * 1000) / 10 : null;

  const prod = productCounts[0] as Record<string, number>;
  const rt = realtime[0] as Record<string, number>;
  const fun = funnel[0] as Record<string, number>;

  const browserCounts = new Map<string, number>();
  const osCounts = new Map<string, number>();
  let mobileN = 0;
  let uaTotal = 0;
  for (const row of uaSample as { user_agent: string | null }[]) {
    const parsed = parseUa(row.user_agent);
    uaTotal += 1;
    browserCounts.set(parsed.browser, (browserCounts.get(parsed.browser) ?? 0) + 1);
    osCounts.set(parsed.os, (osCounts.get(parsed.os) ?? 0) + 1);
    if (parsed.mobile) mobileN += 1;
  }
  const topBrowser = [...browserCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topOs = [...osCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const mobileShare = uaTotal > 0 ? pct(mobileN, uaTotal) : null;

  const topFeatures = (featureRows as { name: string; n: number }[]).map((r) => ({
    name: r.name,
    n: n({ n: r.n }),
  }));
  const featureUsage = topFeatures.reduce((s, r) => s + r.n, 0);
  const featureAdoption =
    totalUsers > 0 && featureUsage > 0 ? pct(Math.min(totalUsers, featureUsage), totalUsers) : null;

  const visitorSignup = pct(newUsers30, Math.max(mauN, fun.visitors ?? 0, 1));

  metrics.total_users = totalUsers;
  metrics.new_users = newUsers30;
  metrics.returning_users = n(returning7[0]);
  metrics.registered_users = totalUsers;
  metrics.sign_ups = newUsers7;
  metrics.sign_up_conversion_rate = visitorSignup;
  metrics.active_users = mauN;
  metrics.dau = dauN;
  metrics.wau = wauN;
  metrics.mau = mauN;
  metrics.dau_mau_ratio = dauMau;
  metrics.user_growth_rate = userGrowthRate ?? growth30;

  metrics.avg_session_duration = Math.round(avgDur);
  metrics.avg_sessions_per_user = avgSessionsPerUser;
  metrics.sessions_per_day = sessionsPerDay;
  metrics.pages_per_session = Math.round(avgPages * 10) / 10;
  metrics.screens_per_session = Math.round(avgPages * 10) / 10;
  metrics.engagement_rate = engagementRate;
  metrics.bounce_rate = bounceRate;
  metrics.scroll_depth = null;
  metrics.active_time = avgDur > 0 ? Math.round(avgDur) : null;
  metrics.feature_usage = featureUsage;

  metrics.traffic_sources = sourceSet.size;
  metrics.organic_traffic = organic;
  metrics.direct_traffic = direct;
  metrics.referral_traffic = referral;
  metrics.social_traffic = social;
  metrics.paid_traffic = paid;
  metrics.landing_page_views = n({ n: fun.landing }) || landingViews;
  metrics.visitor_signup_conversion = visitorSignup;
  metrics.cac = null;
  metrics.acquisition_cost = null;

  metrics.d1_retention = d1;
  metrics.d7_retention = d7;
  metrics.d30_retention = d30;
  metrics.weekly_retention = d7;
  metrics.monthly_retention = d30;
  metrics.churn_rate = d30 != null ? Math.max(0, 100 - d30) : null;
  metrics.returning_user_rate = wauN > 0 ? pct(n(returning7[0]), wauN) : null;
  metrics.cohort_retention = cohortD7;

  metrics.search_queries = n({ n: prod?.searches });
  metrics.ai_queries = n({ n: prod?.ai_queries });
  metrics.portfolio_created = n({ n: prod?.portfolios });
  metrics.portfolio_views = n({ n: prod?.portfolio_views });
  metrics.stock_searches = n({ n: prod?.stock_searches });
  metrics.watchlists_created = null;
  metrics.alerts_created = n({ n: prod?.alerts });
  metrics.reports_generated = n({ n: prod?.reports });
  metrics.dashboard_views = n({ n: prod?.dashboard_views });
  metrics.analytics_views = n({
    n: (topPaths as { path: string; n: number }[]).find((p) => p.path.includes("analytics"))?.n,
  });
  metrics.api_usage = n(rateLimitHits[0]);
  metrics.most_used_features = topFeatures[0]?.n ?? 0;
  metrics.feature_adoption_rate = featureAdoption;

  metrics.free_users = totalUsers;
  metrics.paid_users = 0;
  metrics.trial_users = 0;
  metrics.trial_paid_conversion = null;
  metrics.free_paid_conversion = null;
  metrics.subscription_conversion_rate = null;
  metrics.mrr = null;
  metrics.arr = null;
  metrics.arpu = null;
  metrics.ltv = null;
  metrics.churned_customers = null;

  metrics.funnel_visitors = n({ n: fun?.visitors });
  metrics.funnel_landing = n({ n: fun?.landing });
  metrics.funnel_signup_started = n({ n: fun?.signup_started });
  metrics.funnel_signup_completed = n({ n: fun?.signup_completed });
  metrics.funnel_onboarding_started = n({ n: fun?.onboarding_started });
  metrics.funnel_onboarding_completed = null;
  metrics.funnel_first_search = n({ n: fun?.first_search });
  metrics.funnel_first_portfolio = n({ n: fun?.first_portfolio });
  metrics.funnel_first_ai = n({ n: fun?.first_ai });
  metrics.funnel_first_return = n({ n: fun?.first_return });
  metrics.funnel_paid_conversion = null;

  metrics.users_online = n({ n: rt?.online });
  metrics.active_sessions = n({ n: rt?.sessions }) || n({ n: rt?.online });
  metrics.current_searches = n({ n: rt?.searches });
  metrics.current_ai_queries = n({ n: rt?.ai });
  metrics.current_portfolio_views = n({ n: rt?.port_views });
  metrics.live_traffic = n({ n: rt?.live_pv });
  metrics.live_signups = n({ n: rt?.signups_24h });

  metrics.page_load_time = avgDur > 0 ? Math.round(avgDur) : null;
  metrics.api_response_time = null;
  metrics.error_rate = null;
  metrics.crash_rate = null;
  metrics.browser = topBrowser ? `${topBrowser[0]} (${pct(topBrowser[1], uaTotal) ?? 0}%)` : "—";
  metrics.device = mobileShare != null ? `Mobile ${mobileShare}% · Desktop ${100 - mobileShare}%` : "—";
  metrics.os = topOs ? `${topOs[0]} (${pct(topOs[1], uaTotal) ?? 0}%)` : "—";
  metrics.screen_size = null;
  metrics.geographic_distribution = null;

  const trafficMix = [
    { source: "Organic", n: organic },
    { source: "Direct", n: direct },
    { source: "Referral", n: referral },
    { source: "Social", n: social },
    { source: "Paid", n: paid },
  ].filter((t) => t.n > 0);

  return {
    generatedAt: new Date().toISOString(),
    metrics,
    metricHints,
    daily: daily as { day: string; n: number }[],
    topPaths: topPaths as { path: string; n: number }[],
    topFeatures,
    trafficMix,
  };
}
