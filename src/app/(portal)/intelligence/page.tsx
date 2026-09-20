"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { WhatChangedModule } from "@/components/dashboard/what-changed-module";
import { CorporateEventsCard } from "@/components/dashboard/corporate-events-card";
import { MetricInfo } from "@/components/ui/metric-info";
import { Radio, Sparkles, Send, Bot, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export default function IntelligencePage() {
  const [query, setQuery] = useState("");
  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    {
      role: "assistant",
      text: "Welcome to Market Intelligence AI Copilot. You can ask me to analyze portfolio beta sensitivities, evaluate FII flow impact on banking indices, or draft an investment committee memorandum.",
    },
  ]);
  const [thinking, setThinking] = useState(false);

  const handleSend = () => {
    if (!query.trim()) return;
    const userMsg = query;
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setQuery("");
    setThinking(true);

    setTimeout(() => {
      let reply = "Analyzing market feeds...";
      if (userMsg.toLowerCase().includes("risk") || userMsg.toLowerCase().includes("portfolio")) {
        reply =
          "Your current virtual portfolio has a Sharpe ratio of 1.21 with beta at 0.91 vs NIFTY 50. Key vulnerability: 27% Financials concentration gives elevated sensitivity to 10Y G-Sec yield expansion.";
      } else if (userMsg.toLowerCase().includes("fii") || userMsg.toLowerCase().includes("flow")) {
        reply =
          "Over the past 3 sessions, FIIs logged net outflows of -₹4,812 Cr in cash equities, whereas DIIs absorbed +₹5,140 Cr. Frontline private banks (HDFCBANK, ICICIBANK) experienced modest liquidation.";
      } else {
        reply = `Institutional synthesis: Evaluated "${userMsg}". All live market parameters indicate continued trend expansion with India VIX at 14.82 and NIFTY trading +7.2% above its 200-day moving average.`;
      }
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      setThinking(false);
    }, 600);
  };

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-16">
      <PageHeader
        kicker="Intelligence Terminal"
        title="Market Intelligence & AI Copilot"
        subtitle="Unifying continuous RSS exchange feeds, institutional flow shifts, corporate filings, and conversational portfolio diagnostics."
      />

      {/* AI Copilot Terminal Section */}
      <div className="rounded-xl border border-primary/40 bg-gradient-to-b from-primary/5 via-card to-card p-6 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <div className="flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-primary/20 text-primary">
              <Sparkles className="size-3.5" />
            </span>
            <span className="font-mono text-xs font-bold text-foreground uppercase tracking-wider">
              AI COPILOT TERMINAL
            </span>
            <span className="rounded bg-emerald-500/15 px-2 py-0.5 font-mono text-[9px] font-bold text-emerald-400">
              DESK ACTIVE
            </span>
            <MetricInfo
              id="data_quality"
              name="Copilot Grounding & Ingestion Engine"
              provider="NSE / BSE Filings & Market Feed Streams"
              iconSize="xs"
            />
          </div>
          <span className="text-[11px] font-mono text-muted-foreground">
            Model: Deep Institutional Quant Engine
          </span>
        </div>

        {/* Messages feed */}
        <div className="space-y-3 font-mono text-xs max-h-80 overflow-y-auto pr-2">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={cn(
                "rounded-xl p-3.5 leading-relaxed",
                m.role === "assistant"
                  ? "border border-border/80 bg-accent/20 text-foreground"
                  : "border border-primary/40 bg-primary/10 text-primary-foreground font-semibold ml-auto max-w-xl",
              )}
            >
              <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground uppercase font-bold mb-1">
                {m.role === "assistant" ? <Bot className="size-3 text-primary" /> : null}
                <span>{m.role === "assistant" ? "MI Copilot" : "Portfolio Manager"}</span>
              </div>
              <p className="font-sans text-xs">{m.text}</p>
            </div>
          ))}
          {thinking ? (
            <div className="rounded-xl border border-border bg-card p-3 text-muted-foreground text-xs flex items-center gap-2">
              <span className="size-2 rounded-full bg-primary animate-ping" />
              <span>Analyzing order books, factor covariances, and exchange news...</span>
            </div>
          ) : null}
        </div>

        {/* Input row */}
        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask AI Copilot: 'Evaluate risk if Brent breaches $80' or 'Analyze HDFC Bank LDR'..."
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-xs font-mono text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send className="size-3" />
            Query
          </button>
        </div>
      </div>

      {/* Corporate Events Desk */}
      <CorporateEventsCard />

      {/* What Changed Module */}
      <WhatChangedModule />
    </div>
  );
}
