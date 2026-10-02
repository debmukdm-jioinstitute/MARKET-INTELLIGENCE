"use client";

import { BookOpen, Eye, ListChecks, Shuffle } from "lucide-react";

const CARDS = [
  {
    icon: Eye,
    title: "What is “unusual options activity”?",
    body: "Most days, options trading in a stock follows a routine. Some days it doesn’t — far more calls or puts changing hands than the 30-day baseline. Big investors sometimes use options before news lands. Unusual activity is a spotlight: it tells you where to look, not what will happen.",
  },
  {
    icon: Shuffle,
    title: "Volume vs open interest",
    body: "Volume is how many contracts traded today. Open interest is how many positions are still open. Rising volume with rising open interest means new positions are being opened — someone is expressing a view. Volume alone, without open interest rising, is often just churn.",
  },
  {
    icon: ListChecks,
    title: "How to read this page",
    body: "Pick tickers, run the screener, then read the three stages in order. Stage 1 shows the raw figures with sources. Stage 2 describes where the options activity and the price disagree. Stage 3 is the shortlist: at most 5 tickers the flagging agent thinks are worth your research time.",
  },
  {
    icon: BookOpen,
    title: "What to do with a flag",
    body: "Open the company’s research page and ask: is there news, an event, or earnings coming? Check the “boring explanation” on the flag card first — most unusual activity has one. Paste the ticker into the AI Desk to hear five analysts debate it. A flag is never a reason to buy or sell.",
  },
];

/** Plain-words explainer for first-timers: what unusual options activity means and how to use this page. */
export function Playbook() {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {CARDS.map((c) => (
        <article key={c.title} className="rounded-xl border border-border bg-white p-4">
          <h3 className="flex items-center gap-2 text-sm font-bold">
            <span className="flex size-8 items-center justify-center rounded-lg bg-blue-600/10 text-blue-700">
              <c.icon className="size-4" />
            </span>
            {c.title}
          </h3>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">{c.body}</p>
        </article>
      ))}
    </div>
  );
}
