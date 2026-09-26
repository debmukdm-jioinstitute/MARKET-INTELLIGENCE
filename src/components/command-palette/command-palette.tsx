"use client";

import {
  GlobalQuoteResultView,
  IndiaFundamentalsResultView,
  IndiaQuoteResultView,
  OptionChainResultView,
} from "@/components/command-palette/result-views";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCommandPalette } from "@/components/command-palette/command-palette-provider";
import { usePortalPages } from "@/components/providers/portal-page-provider";
import { METRIC_COMMANDS, PAGE_COMMANDS } from "@/lib/command-registry";
import useSWR from "swr";
import { INDIA_EQUITIES, OPTION_UNDERLYINGS, findIndiaInstrument } from "@/lib/feeds/india/instruments";
import { getInstrument, UNIVERSE } from "@/lib/universe";
import { ArrowLeft, HelpCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

type DataSource = "all" | "india" | "global";

type View =
  | { type: "help" }
  | { type: "india-quote"; symbol: string }
  | { type: "india-fundamentals"; symbol: string }
  | { type: "option-chain"; key: string; label: string }
  | { type: "global-quote"; symbol: string };

export function CommandPalette() {
  const { open, setOpen } = useCommandPalette();
  const { hrefAllowed } = usePortalPages();
  const pageCommands = PAGE_COMMANDS.filter((p) => hrefAllowed(p.href));
  const router = useRouter();
  const [source, setSource] = useState<DataSource>("all");
  const [view, setView] = useState<View | null>(null);
  const [query, setQuery] = useState("");
  // Live metric values, only fetched while the palette is open.
  const { data: metrics } = useSWR<{ catalog: { id: string; label: string; unit: string; current: number | null }[] }>(
    open ? "/api/alerts" : null,
    (u: string) => fetch(u).then((r) => r.json()),
    { revalidateOnFocus: false },
  );
  const tickerQuery = /^[A-Za-z][A-Za-z0-9.&-]{0,19}$/.test(query.trim()) ? query.trim().toUpperCase() : null;

  function close() {
    setOpen(false);
    setView(null);
    setQuery("");
  }

  function goto(href: string) {
    router.push(href);
    close();
  }

  return (
    <CommandDialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setView(null);
      }}
      title="Command palette"
      description="Search symbols, pages, and commands"
    >
      {view ? (
        <div>
          <div className="flex items-center justify-between border-b border-border p-2">
            <button
              type="button"
              onClick={() => setView(null)}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" /> Back to search
            </button>
          </div>
          {view.type === "help" ? <HelpView /> : null}
          {view.type === "india-quote" ? (
            <IndiaQuoteResultView instrument={findIndiaInstrument(view.symbol)!} />
          ) : null}
          {view.type === "india-fundamentals" ? (
            <IndiaFundamentalsResultView instrument={findIndiaInstrument(view.symbol)!} />
          ) : null}
          {view.type === "option-chain" ? (
            <OptionChainResultView underlyingKey={view.key} label={view.label} />
          ) : null}
          {view.type === "global-quote" ? (
            <GlobalQuoteResultView instrument={getInstrument(view.symbol)} />
          ) : null}
        </div>
      ) : (
        <Command shouldFilter>
          <div className="flex items-center gap-2 border-b border-border px-1">
            <div className="flex-1">
              <CommandInput value={query} onValueChange={setQuery} placeholder="Search symbols, pages, live metrics, or type “help”…" />
            </div>
            <Select value={source} onValueChange={(v) => setSource(v as DataSource)}>
              <SelectTrigger className="mr-1 h-7 w-[120px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All sources</SelectItem>
                <SelectItem value="india">India (Upstox)</SelectItem>
                <SelectItem value="global">Global (Yahoo)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <CommandList>
            <CommandEmpty>No results.</CommandEmpty>

            {tickerQuery ? (
              <CommandGroup heading="Open">
                <CommandItem forceMount value={`open research ${tickerQuery}`} onSelect={() => goto(`/research/${encodeURIComponent(tickerQuery)}`)}>
                  <span className="font-medium">Research {tickerQuery}</span>
                  <span className="ml-2 text-sm text-muted-foreground">quote, risk &amp; events, fundamentals</span>
                </CommandItem>
              </CommandGroup>
            ) : null}

            {metrics?.catalog ? (
              <CommandGroup heading="Live metrics">
                {METRIC_COMMANDS.flatMap((m) => {
                  const c = metrics.catalog.find((x) => x.id === m.id);
                  return c ? [{ m, c }] : [];
                }).map(({ m, c }) => (
                  <CommandItem key={m.id} value={`${c.label} ${m.id.replace(/_/g, " ")}`} onSelect={() => goto(m.href)}>
                    <span className="font-medium">{c.label}</span>
                    <span className="ml-2 tabular-nums text-foreground">{c.current == null ? "n/a" : Number(c.current.toFixed(2)).toLocaleString("en-IN")} {c.current == null ? "" : c.unit}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : null}

            <CommandGroup heading="Commands">
              <CommandItem onSelect={() => setView({ type: "help" })}>
                <HelpCircle className="size-4" />
                Help — what can I search?
              </CommandItem>
              <CommandItem onSelect={() => goto("/research/ipo")}>IPOs</CommandItem>
              <CommandItem onSelect={() => goto("/data/feeds")}>Data feeds</CommandItem>
            </CommandGroup>

            {source !== "global" ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Pages">
                  {pageCommands.map((p) => (
                    <CommandItem key={p.href} value={`${p.label} ${p.description}`} onSelect={() => goto(p.href)}>
                      <span className="font-medium">{p.label}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{p.description}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {source === "all" || source === "india" ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="India symbols — Upstox">
                  {INDIA_EQUITIES.map((i) => (
                    <CommandItem
                      key={i.symbol}
                      value={`${i.symbol} ${i.name}`}
                      onSelect={() => setView({ type: "india-quote", symbol: i.symbol })}
                    >
                      <span className="font-medium">{i.symbol}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{i.name} — quote</span>
                    </CommandItem>
                  ))}
                  {INDIA_EQUITIES.map((i) => (
                    <CommandItem
                      key={`${i.symbol}-fund`}
                      value={`${i.symbol} ${i.name} fundamentals ratios`}
                      onSelect={() => setView({ type: "india-fundamentals", symbol: i.symbol })}
                    >
                      <span className="font-medium">{i.symbol}</span>
                      <span className="ml-2 text-sm text-muted-foreground">fundamentals</span>
                    </CommandItem>
                  ))}
                  {OPTION_UNDERLYINGS.filter((u) => u.kind === "index").map((u) => (
                    <CommandItem
                      key={`${u.key}-chain`}
                      value={`${u.label} option chain greeks`}
                      onSelect={() => setView({ type: "option-chain", key: u.key, label: u.label })}
                    >
                      <span className="font-medium">{u.label}</span>
                      <span className="ml-2 text-sm text-muted-foreground">option chain</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}

            {source === "all" || source === "global" ? (
              <>
                <CommandSeparator />
                <CommandGroup heading="Global symbols">
                  {UNIVERSE.map((i) => (
                    <CommandItem
                      key={i.symbol}
                      value={`${i.symbol} ${i.name}`}
                      onSelect={() => setView({ type: "global-quote", symbol: i.symbol })}
                    >
                      <span className="font-medium">{i.symbol}</span>
                      <span className="ml-2 text-sm text-muted-foreground">{i.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            ) : null}
          </CommandList>
        </Command>
      )}
    </CommandDialog>
  );
}

function HelpView() {
  return (
    <div className="space-y-4 p-4 text-sm">
      <div>
        <p className="font-semibold">Command palette</p>
        <p className="text-sm text-muted-foreground">
          Press <kbd className="rounded border border-border px-1">Space</kbd> anywhere (with
          nothing focused) to open this, or click the search pill in the top bar.
        </p>
      </div>
      <dl className="space-y-2 text-sm">
        <Item k="Open" v="Type any ticker (e.g. TCS, AAPL) and pick “Research <ticker>” to open its page." />
        <Item k="Live metrics" v="Current stress score, VIX, USD/INR, Brent, yields, RBI liquidity and FII flow — select one to jump to its page." />
        <Item k="Commands" v="Help, jump to IPOs / Data feeds." />
        <Item k="Pages" v="Jump straight to any page in the app." />
        <Item k="India symbols — Upstox" v="Type a symbol for a live quote or fundamentals; index names (NIFTY, BANKNIFTY, FINNIFTY) for their option chain." />
        <Item k="Global symbols" v="US/global tape names, live quote when available." />
        <Item k="Data source dropdown" v="Filters which of the above groups are searched — All / India (Upstox) / Global (Yahoo)." />
      </dl>
      <div className="space-y-1 text-sm text-muted-foreground">
        <p>
          <kbd className="rounded border border-border px-1">↑</kbd>{" "}
          <kbd className="rounded border border-border px-1">↓</kbd> move ·{" "}
          <kbd className="rounded border border-border px-1">Enter</kbd> select ·{" "}
          <kbd className="rounded border border-border px-1">Esc</kbd> close
        </p>
      </div>
    </div>
  );
}

function Item({ k, v }: { k: string; v: string }) {
  return (
    <div>
      <dt className="font-medium text-foreground">{k}</dt>
      <dd className="text-muted-foreground">{v}</dd>
    </div>
  );
}
