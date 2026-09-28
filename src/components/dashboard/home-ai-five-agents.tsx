"use client";

import { HOME_AI_AGENTS } from "@/lib/home/ai-agents";
import { openSiteAssistant } from "@/lib/home/open-assistant";
import { cn } from "@/lib/utils";
import { ArrowUpRight, Bot, Sparkles } from "lucide-react";
import Link from "next/link";

function AgentCard({ agent }: { agent: (typeof HOME_AI_AGENTS)[number] }) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-2">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Bot className="size-5" aria-hidden />
        </div>
        {agent.badge ? (
          <span className="rounded bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold uppercase text-primary">{agent.badge}</span>
        ) : null}
      </div>
      <p className="mt-3 text-sm font-bold text-foreground">{agent.name}</p>
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{agent.role}</p>
      <p className="mt-1.5 text-sm leading-snug text-muted-foreground">{agent.desc}</p>
      <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">
        {agent.cta}
        <ArrowUpRight className="size-3.5" />
      </span>
    </>
  );

  const className = cn(
    "bento-card-shell flex h-full flex-col bg-gradient-to-br p-4 text-left transition-[transform,box-shadow] duration-200 touch-manipulation active:scale-[0.99]",
    agent.accent,
  );

  if (agent.opensAssistant) {
    return (
      <button type="button" onClick={() => openSiteAssistant()} className={className}>
        {inner}
      </button>
    );
  }

  return (
    <Link href={agent.href!} className={className}>
      {inner}
    </Link>
  );
}

export function HomeAiFiveAgents() {
  return (
    <section className="bento-card-shell bento-card-stack border-primary/15 bg-gradient-to-b from-card to-accent/20">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border/60 pb-3">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-[0.2em] text-primary">
            <Sparkles className="size-4" aria-hidden />
            Five AI agents
          </p>
          <h2 className="mt-1 text-lg font-bold text-foreground">Specialists across brief, signals, flow & algo</h2>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Each agent owns a lane — copilot navigation, daily narrative, model signals, options pipeline, or the NIFTY ML desk.
          </p>
        </div>
        <Link
          href="/research/ai-desk"
          className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-3 py-1.5 text-sm font-semibold text-foreground hover:bg-accent"
        >
          AI Desk
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        {HOME_AI_AGENTS.map((agent) => (
          <AgentCard key={agent.id} agent={agent} />
        ))}
      </div>
    </section>
  );
}
