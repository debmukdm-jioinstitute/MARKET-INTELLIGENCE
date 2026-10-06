"use client";
import useSWR from "swr";
import { Clock3, ExternalLink, Newspaper } from "lucide-react";
import type { BriefResponse } from "@/lib/homedashboard/brief";
import { briefHeadlines, mentions } from "@/lib/homedashboard/brief";
import { cardClass, fetchOptions, HomeLink, SectionHeading } from "./shared";
import { homeActions } from "./useHomeProgress";

type Sentiment = { label: "positive" | "negative" | "neutral" };
async function loadSentiment(key: string): Promise<Sentiment[]> {
  const response = await fetch("/api/hf/sentiment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ texts: JSON.parse(key) }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error("Sentiment unavailable");
  const result = await response.json();
  return Array.isArray(result.results) ? result.results : [];
}
export function BriefTeaser({
  data,
  watched,
}: {
  data?: BriefResponse;
  watched: { symbol: string; name?: string }[];
}) {
  const headlines = briefHeadlines(data).slice(0, 5);
  const key = headlines.length
    ? JSON.stringify(headlines.map((h) => h.title.slice(0, 2000)))
    : null;
  const { data: sentiment } = useSWR<Sentiment[]>(
    key,
    loadSentiment,
    fetchOptions,
  );
  return (
    <section aria-label="Today's Brief">
      <SectionHeading
        title="Today’s 2-minute brief"
        detail="What happened — and why it deserves a place on your radar."
        action={
          <HomeLink
            href="/intelligence/brief"
            onClick={() => homeActions.mission("read-brief")}
          >
            Read the full brief
          </HomeLink>
        }
      />
      <div className={cardClass}>
        {headlines.length ? (
          <div className="divide-y divide-stone-100">
            {headlines.map((h, i) => {
              const label = sentiment?.[i]?.label;
              const onWatchlist = watched.some((stock) =>
                mentions(h.title, stock.symbol, stock.name),
              );
              const safeHref =
                /^(https?:\/\/|\/)/.test(h.href) && !h.href.startsWith("//")
                  ? h.href
                  : "/intelligence/brief";
              return (
                <article key={h.title} className="py-4 first:pt-0 last:pb-0">
                  <div className="mb-2 flex flex-wrap items-center gap-2 text-[11px] text-stone-500">
                    <span className="font-medium">{h.source}</span>
                    <span className="flex items-center gap-1">
                      <Clock3 className="size-3" />
                      {h.publishedAt
                        ? `${new Date(h.publishedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })} IST · brief time`
                        : h.time}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 font-medium ${label === "positive" ? "bg-emerald-50 text-emerald-600" : label === "negative" ? "bg-rose-50 text-rose-600" : "bg-stone-100 text-stone-500"}`}
                    >
                      {label
                        ? label[0].toUpperCase() + label.slice(1)
                        : "Sentiment unavailable"}
                    </span>
                  </div>
                  <a
                    href={safeHref}
                    target={safeHref.startsWith("http") ? "_blank" : undefined}
                    rel="noopener noreferrer"
                    className="group flex items-start gap-3 text-base font-semibold leading-snug text-stone-900 hover:text-teal-600"
                  >
                    <span className="flex-1">{h.title}</span>
                    <ExternalLink className="mt-0.5 size-4 shrink-0 text-stone-400" />
                  </a>
                  <p className="mt-2 text-sm leading-relaxed text-stone-500">
                    <span className="font-medium text-stone-700">
                      Why it matters:{" "}
                    </span>
                    {h.why}
                  </p>
                  <span
                    className={`mt-2 inline-block rounded-md px-2 py-1 text-[10px] font-medium ${onWatchlist ? "bg-teal-50 text-teal-600" : "bg-stone-100 text-stone-500"}`}
                  >
                    {onWatchlist ? "On your watchlist" : h.sector}
                  </span>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex items-start gap-3 py-2">
            <Newspaper className="mt-1 size-6 shrink-0 text-teal-600" />
            <div>
              <h3 className="font-semibold text-stone-900">
                Your next market read starts here.
              </h3>
              <p className="mt-1 text-sm text-stone-500">
                Live headlines are unavailable. Open the full brief for the
                latest published market context.
              </p>
              <HomeLink
                href="/intelligence/brief"
                onClick={() => homeActions.mission("read-brief")}
              >
                Open today’s brief
              </HomeLink>
            </div>
          </div>
        )}
        {headlines.length ? (
          <p className="mt-4 border-t border-stone-100 pt-3 text-[10px] text-stone-500">
            Live mix from publishers, Google News, exchanges, and earnings calendar —
            not RBI-only. Sentiment uses FinBERT (rules fallback). Context only, not
            predictions.
          </p>
        ) : null}
      </div>
    </section>
  );
}
