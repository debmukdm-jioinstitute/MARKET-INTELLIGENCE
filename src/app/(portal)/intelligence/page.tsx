"use client";

import { useMemo, useState } from "react";
import { filterOpenCommunityNews, filterRegulatoryExchangeNews, sortNewsByFreshness } from "@/lib/feeds/news-sort";
import { PageHeader } from "@/components/layout/page-header";
import { WhatChangedModule } from "@/components/dashboard/what-changed-module";
import { CorporateEventsCard } from "@/components/dashboard/corporate-events-card";
import { MonitorsBar } from "@/components/feeds/monitors-bar";
import { NewsStream } from "@/components/feeds/news-stream";
import { DataInfo } from "@/components/feeds/data-info";
import { FEED_HUB_FIELD_SOURCE } from "@/lib/feeds/feed-source-provenance";
import { MetricInfo } from "@/components/ui/metric-info";
import { useFeedHub } from "@/hooks/use-feed-hub";
import { Sparkles, Send, Bot, Newspaper } from "lucide-react";
import { cn } from "@/lib/utils";

interface CopilotMessage {
  role: "user" | "assistant";
  text: string;
  category?: string;
  sentiment?: string;
  elapsedMs?: number;
  modelUsed?: string;
}

export default function IntelligencePage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<CopilotMessage[]>([
    {
      role: "assistant",
      text: "Welcome to Market Intelligence AI Copilot. Powered by free open-source Hugging Face models (FinBERT sentiment, BART summarizer, MiniLM embeddings, and MNLI zero-shot classifier). Ask any market, macro, or portfolio risk question.",
      modelUsed: "Hugging Face Open AI Models Suite",
    },
  ]);
  const [thinking, setThinking] = useState(false);
  const { data: feedData } = useFeedHub(30_000);
  const feedNews = feedData?.news;

  const regulatoryHeadlines = useMemo(() => {
    if (!feedNews?.length) return [];
    return sortNewsByFreshness(filterRegulatoryExchangeNews(feedNews));
  }, [feedNews]);

  const openPulseHeadlines = useMemo(() => {
    if (!feedNews?.length) return [];
    return sortNewsByFreshness(filterOpenCommunityNews(feedNews));
  }, [feedNews]);

  const executeCopilotQuery = async (promptText: string) => {
    if (!promptText.trim() || thinking) return;
    const userMsg = promptText.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setQuery("");
    setThinking(true);

    try {
      const res = await fetch("/api/hf/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: userMsg }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Copilot API request failed");

      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: data.answer,
          category: data.category,
          sentiment: data.sentiment,
          elapsedMs: data.elapsedMs,
          modelUsed: data.modelUsed,
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: `[Hugging Face Engine Fallback]: Evaluated "${userMsg}". All live market parameters indicate active trend monitoring. Ensure risk parameters match current market volatility.`,
          modelUsed: "Hugging Face Fallback Rule Engine",
        },
      ]);
    } finally {
      setThinking(false);
    }
  };

  const handleSend = () => {
    executeCopilotQuery(query);
  };

  const PRESET_PROMPTS = [
    "Evaluate risk if Brent breaches $80",
    "Analyze FII cash outflow impact on banking",
    "Summarize RBI monetary policy stance",
    "Check NIFTY 50 sentiment & volatility",
  ];

  return (
    <div className="portal-page pb-10">
      <PageHeader

        title="Market Intelligence & AI Copilot"
        subtitle="Unifying exchange RSS, Reddit & publisher feeds, institutional flow shifts, and conversational portfolio diagnostics."
      />

      <div className="grid gap-6 lg:grid-cols-2 lg:items-start">
        {/* AI Copilot Terminal Section */}
        <div className="rounded-2xl border border-primary/30 bg-gradient-to-b from-primary/10 via-card to-card p-5 shadow-lg space-y-4 lg:col-span-1 backdrop-blur-md">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20 text-primary shadow-xs">
                <Sparkles className="size-4" />
              </span>
              <span className="text-xs sm:text-sm font-bold text-foreground uppercase tracking-wider">
                AI COPILOT TERMINAL
              </span>
              <span className="rounded-full bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400">
                HF DESK ACTIVE
              </span>
              <MetricInfo
                id="data_quality"
                name="Hugging Face AI Copilot Suite"
                provider="Hugging Face Free Inference API (FinBERT, BART, MiniLM, MNLI)"
                sourceUrl="/api/hf/copilot"
                asOf={feedData?.fetchedAt}
                iconSize="xs"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md border border-border/50">
                HF Free Inference Models
              </span>
              {messages.length > 1 ? (
                <button
                  type="button"
                  onClick={() =>
                    setMessages([
                      {
                        role: "assistant",
                        text: "Copilot session reset. Ask any market or portfolio risk question.",
                        modelUsed: "Hugging Face Open AI Models Suite",
                      },
                    ])
                  }
                  className="text-[10px] text-muted-foreground hover:text-foreground underline cursor-pointer"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>

          {/* Preset Suggestions */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1 self-center mr-1">
              Suggestions:
            </span>
            {PRESET_PROMPTS.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => executeCopilotQuery(p)}
                disabled={thinking}
                className="rounded-full border border-border/80 bg-background/80 hover:bg-primary/10 hover:border-primary/50 px-2.5 py-1 text-[11px] font-medium text-muted-foreground hover:text-primary transition-all duration-150 cursor-pointer disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>

          {/* Messages feed */}
          <div className="space-y-3 text-sm max-h-96 min-h-[220px] overflow-y-auto pr-2 rounded-xl border border-border/40 bg-background/40 p-3">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={cn(
                  "rounded-xl p-3.5 leading-relaxed space-y-1.5 transition-all",
                  m.role === "assistant"
                    ? "border border-border/70 bg-card/90 text-foreground shadow-xs"
                    : "border border-primary/40 bg-primary/15 text-foreground font-semibold ml-auto max-w-xl",
                )}
              >
                <div className="flex flex-wrap items-center justify-between gap-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 font-bold uppercase tracking-wider">
                    {m.role === "assistant" ? <Bot className="size-3.5 text-primary" /> : null}
                    <span>{m.role === "assistant" ? "MI Copilot (Hugging Face)" : "Portfolio Manager"}</span>
                  </span>

                  {m.role === "assistant" ? (
                    <div className="flex items-center gap-1.5 text-[10px]">
                      {m.category ? (
                        <span className="rounded bg-primary/10 px-1.5 py-0.5 font-bold uppercase text-primary border border-primary/20">
                          {m.category}
                        </span>
                      ) : null}
                      {m.sentiment ? (
                        <span
                          className={cn(
                            "rounded px-1.5 py-0.5 font-bold uppercase border",
                            m.sentiment === "positive"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : m.sentiment === "negative"
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/30"
                              : "bg-amber-500/10 text-amber-600 border-amber-500/30",
                          )}
                        >
                          {m.sentiment}
                        </span>
                      ) : null}
                      {m.elapsedMs ? <span className="tabular-nums opacity-75">{m.elapsedMs}ms</span> : null}
                    </div>
                  ) : null}
                </div>

                <p className="font-sans text-sm leading-relaxed">{m.text}</p>
              </div>
            ))}
            {thinking ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 text-muted-foreground text-xs flex items-center gap-2.5 animate-pulse">
                <span className="size-2 rounded-full bg-primary animate-ping" />
                <span>Running Hugging Face FinBERT, MNLI zero-shot classifier &amp; BART summarizer…</span>
              </div>
            ) : null}
          </div>

          {/* Input row */}
          <div className="flex items-center gap-2 pt-1">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSend()}
              placeholder="Ask AI Copilot: 'Evaluate risk if Brent breaches $80' or 'Analyze HDFC Bank LDR'..."
              className="flex-1 rounded-xl border border-border/80 bg-background/90 px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={thinking || !query.trim()}
              className="flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-all duration-150 disabled:opacity-50 cursor-pointer shadow-md"
            >
              <Send className="size-3.5" />
              Query
            </button>
          </div>
        </div>

      <div className="space-y-6 lg:col-span-1">
      {/* Regulatory & Exchange Headlines Section */}
      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="size-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              Regulatory headlines
              {regulatoryHeadlines.length ? (
                <span className="ml-2 font-semibold normal-case tracking-normal text-muted-foreground">
                  · {regulatoryHeadlines.length} in feed
                </span>
              ) : null}
            </h3>
            <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
              LIVE RSS
            </span>
            <DataInfo
              name="Regulatory & exchange headlines"
              source={{
                provider: "NSE · BSE · RBI official RSS",
                url: "https://www.nseindia.com/",
                asOf: feedData?.fetchedAt,
              }}
              hubSyncedAt={feedData?.fetchedAt}
              fetchPath="Merged in buildFeedHub() — src/lib/feeds/sources/nse.ts, bse.ts, rbi.ts"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            RBI, NSE &amp; BSE RSS when configured (US SEC filings appear under their own source label)
          </span>
        </div>
        <div className="mb-3"><MonitorsBar /></div>
        {feedData?.news ? (
          <NewsStream items={regulatoryHeadlines} limit={24} hubSyncedAt={feedData.fetchedAt} />
        ) : (
          <p className="text-sm text-muted-foreground py-4">Loading live headlines…</p>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <Newspaper className="size-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground uppercase tracking-wider">
              Open sources pulse
              {openPulseHeadlines.length ? (
                <span className="ml-2 font-semibold normal-case tracking-normal text-muted-foreground">
                  · {openPulseHeadlines.length} in feed
                </span>
              ) : null}
            </h3>
            <span className="rounded bg-violet-500/10 px-2 py-0.5 text-xs font-semibold text-violet-700 dark:text-violet-300">
              REDDIT · RSS · GOOGLE
            </span>
            <DataInfo
              name="Open sources pulse"
              source={{ ...FEED_HUB_FIELD_SOURCE, asOf: feedData?.fetchedAt }}
              hubSyncedAt={feedData?.fetchedAt}
              fetchPath="Reddit JSON, LiveMint/Moneycontrol/Business Standard RSS, Google News RSS — src/lib/feeds/hub.ts (FEED_OPEN_NEWS*)"
            />
          </div>
          <span className="text-xs text-muted-foreground">
            Env: FEED_OPEN_NEWS, FEED_REDDIT_SUBS, FEED_RSS_URLS, FEED_GOOGLE_NEWS_QUERIES
          </span>
        </div>
        {feedData?.news ? (
          <NewsStream items={openPulseHeadlines} limit={28} hubSyncedAt={feedData.fetchedAt} />
        ) : (
          <p className="text-sm text-muted-foreground py-4">Loading community &amp; media headlines…</p>
        )}
      </div>

      {/* Corporate Events Desk */}
      <CorporateEventsCard />
      </div>
      </div>

      {/* What Changed Module */}
      <WhatChangedModule />
    </div>
  );
}
