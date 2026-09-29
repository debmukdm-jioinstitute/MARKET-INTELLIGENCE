import { feedFetch } from "@/lib/feeds/http";
import type { TrendPoint } from "@/lib/search-trends/types";

const TRENDS_GEO = (process.env.GOOGLE_TRENDS_GEO ?? "IN").toUpperCase();
const TRENDS_WINDOW = process.env.GOOGLE_TRENDS_WINDOW ?? "today 3-m";
const TZ = Number(process.env.GOOGLE_TRENDS_TZ ?? "-330");

function stripGoogleJsonPrefix(raw: string): string {
  return raw.replace(/^\)\]\}'\,\n?/, "").trim();
}

function hashKeyword(keyword: string): number {
  let h = 2166136261;
  for (let i = 0; i < keyword.length; i++) {
    h ^= keyword.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h >>> 0);
}

/** Deterministic weekly series when Trends API is blocked (same keyword → same shape). */
export function fallbackTrendTimeline(keyword: string, weeks = 13): TrendPoint[] {
  const h = hashKeyword(keyword);
  const out: TrendPoint[] = [];
  const now = new Date();
  for (let i = weeks - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setUTCDate(d.getUTCDate() - i * 7);
    const wave = Math.sin((i + (h % 11)) * 0.75) * 14;
    const base = 28 + (h % 45);
    const tailBoost = i === 0 ? (h % 18) - 8 : 0;
    const value = Math.round(Math.min(100, Math.max(5, base + wave + tailBoost)));
    out.push({ date: d.toISOString().slice(0, 10), value });
  }
  return out;
}

type ExploreWidget = {
  id?: string;
  token?: string;
  request?: Record<string, unknown>;
};

function parseTimeline(values: unknown): TrendPoint[] {
  const timeline = values as {
    timelineData?: { time?: string; formattedTime?: string; value?: number[] }[];
  };
  const rows = timeline?.timelineData ?? [];
  return rows
    .map((row) => {
      const v = row.value?.[0];
      if (typeof v !== "number") return null;
      const date =
        row.time && /^\d+$/.test(row.time)
          ? new Date(Number(row.time) * 1000).toISOString().slice(0, 10)
          : (row.formattedTime ?? "").slice(0, 10) || new Date().toISOString().slice(0, 10);
      return { date, value: v };
    })
    .filter((p): p is TrendPoint => p !== null);
}

/** Best-effort Google Trends interest-over-time (India by default). */
export async function fetchGoogleTrendTimeline(keyword: string): Promise<{ timeline: TrendPoint[]; mode: "live" | "fallback" }> {
  const exploreReq = {
    comparisonItem: [{ keyword, geo: TRENDS_GEO, time: TRENDS_WINDOW }],
    category: 0,
    property: "",
  };

  const exploreUrl = `https://trends.google.com/trends/api/explore?hl=en-US&tz=${TZ}&req=${encodeURIComponent(JSON.stringify(exploreReq))}`;

  try {
    const exploreRes = await feedFetch(exploreUrl, {
      timeoutMs: 12_000,
      headers: {
        Referer: "https://trends.google.com/trends/explore",
        Accept: "application/json, text/plain, */*",
      },
    });
    if (!exploreRes.ok) throw new Error(`explore HTTP ${exploreRes.status}`);
    const exploreJson = JSON.parse(stripGoogleJsonPrefix(await exploreRes.text())) as { widgets?: ExploreWidget[] };
    const widget =
      exploreJson.widgets?.find((w) => w.id === "TIMESERIES") ??
      exploreJson.widgets?.find((w) => String(w.id ?? "").includes("TIMESERIES"));
    if (!widget?.token || !widget.request) throw new Error("No TIMESERIES widget");

    const dataReq = { ...widget.request };
    const dataUrl = `https://trends.google.com/trends/api/widgetdata/multiline?hl=en-US&tz=${TZ}&req=${encodeURIComponent(JSON.stringify(dataReq))}&token=${encodeURIComponent(widget.token)}`;
    const dataRes = await feedFetch(dataUrl, {
      timeoutMs: 12_000,
      headers: {
        Referer: "https://trends.google.com/trends/explore",
        Accept: "application/json, text/plain, */*",
      },
    });
    if (!dataRes.ok) throw new Error(`multiline HTTP ${dataRes.status}`);
    const dataJson = JSON.parse(stripGoogleJsonPrefix(await dataRes.text())) as { default?: { timelineData?: unknown } };
    const timeline = parseTimeline(dataJson.default ?? dataJson);
    if (timeline.length < 2) throw new Error("Empty timeline");
    return { timeline, mode: "live" };
  } catch {
    return { timeline: fallbackTrendTimeline(keyword), mode: "fallback" };
  }
}

export function trendsExploreUrl(keyword: string): string {
  const q = encodeURIComponent(keyword);
  return `https://trends.google.com/trends/explore?geo=${TRENDS_GEO}&q=${q}`;
}

export function trendsGeoLabel(): string {
  return TRENDS_GEO === "IN" ? "India" : TRENDS_GEO;
}
