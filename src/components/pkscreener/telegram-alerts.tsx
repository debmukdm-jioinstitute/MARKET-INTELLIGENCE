"use client";

import { useState, useEffect } from "react";
import { Bell, BellOff, Send, Bot, Clock, Zap, RefreshCw, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils";

// --- Mock scanner alert data ---
const SCHEDULED_SCANS = [
  {
    id: "morning",
    time: "09:45 AM IST",
    label: "Morning Breakout Scan",
    days: "Mon – Fri",
    description: "Breakouts, RSI, MACD, Volume gainers from all Nifty indices",
    status: "live" as const,
    lastRun: "Today, 9:47 AM",
    results: 23,
    tags: ["Breakouts", "RSI", "MACD", "Volume"],
  },
  {
    id: "close",
    time: "04:00 PM IST",
    label: "Market Close Scan",
    days: "Mon – Fri",
    description: "End-of-day momentum, consolidation setups & next-day prediction signals",
    status: "scheduled" as const,
    lastRun: "Yesterday, 4:01 PM",
    results: 31,
    tags: ["Momentum", "Consolidation", "Next Day"],
  },
  {
    id: "weekly",
    time: "Sat 9:00 AM IST",
    label: "Weekly Strategy Review",
    days: "Saturday",
    description: "52-week breakouts, VCP setups, and MF/FII popular stocks digest",
    status: "scheduled" as const,
    lastRun: "Last Sat, 9:02 AM",
    results: 15,
    tags: ["52-Week", "VCP", "MF/FII"],
  },
];

const RECENT_ALERTS: { time: string; type: AlertType; stock: string; signal: string; detail: string; scanner: string }[] = [
  {
    time: "09:47 AM",
    type: "bullish",
    stock: "RELIANCE",
    signal: "Probable Breakout",
    detail: "RSI 68.2 · Volume 2.4× avg · Near 52W High",
    scanner: "Scanner #1",
  },
  {
    time: "09:47 AM",
    type: "bullish",
    stock: "ICICIBANK",
    signal: "Golden Cross (50/200 EMA)",
    detail: "MACD bullish crossover · Aroon 14 bullish",
    scanner: "Scanner #13",
  },
  {
    time: "09:48 AM",
    type: "watch",
    stock: "INFY",
    signal: "Consolidating (VCP Setup)",
    detail: "Tightest range in 8 sessions · Volume -38% vs avg",
    scanner: "Scanner #3",
  },
  {
    time: "09:48 AM",
    type: "bullish",
    stock: "HDFCBANK",
    signal: "High Momentum (RSI+MFI+CCI)",
    detail: "RSI 71 · MFI 78 · CCI above +100",
    scanner: "Scanner #31",
  },
  {
    time: "09:49 AM",
    type: "bearish",
    stock: "WIPRO",
    signal: "Death Cross (50/200 EMA)",
    detail: "MACD histogram below 0 for 3 sessions",
    scanner: "Scanner #19",
  },
  {
    time: "09:49 AM",
    type: "bullish",
    stock: "TATASTEEL",
    signal: "Today's Breakout",
    detail: "Breaking above 20-day high · Vol 3.1× avg",
    scanner: "Scanner #23",
  },
];

const BOT_COMMANDS = [
  { cmd: "/X11", label: "Short-term Bulls", desc: "Ichimoku bullish stocks" },
  { cmd: "/X31", label: "High Momentum", desc: "RSI + MFI + CCI composite" },
  { cmd: "/X23", label: "Breaking Out Now", desc: "Live breakout stocks" },
  { cmd: "/X7", label: "Chart Patterns", desc: "H&S, Cup-Handle, VCP…" },
  { cmd: "/X20", label: "Next Day Bullish", desc: "AI-predicted next-session buys" },
  { cmd: "/X1", label: "Probable Breakouts", desc: "Pre-breakout detection" },
];

type AlertType = "bullish" | "bearish" | "watch";

const alertColor: Record<AlertType, string> = {
  bullish: "text-emerald-600 bg-emerald-50 border-emerald-200",
  bearish: "text-rose-600 bg-rose-50 border-rose-200",
  watch: "text-amber-600 bg-amber-50 border-amber-200",
};

const alertDot: Record<AlertType, string> = {
  bullish: "bg-emerald-500",
  bearish: "bg-rose-500",
  watch: "bg-amber-400",
};

export function TelegramAlerts() {
  const [subscribed, setSubscribed] = useState(false);
  const [botInput, setBotInput] = useState("");
  const [botMessages, setBotMessages] = useState<{ from: "user" | "bot"; text: string; time: string }[]>([
    {
      from: "bot",
      text: "👋 Scanner bot active. Type a command or select a quick scan below. Try: /X23 for live breakouts, /X31 for high momentum, or /X20 for tomorrow's bullish picks.",
      time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    },
  ]);
  const [isTyping, setIsTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [alerts, setAlerts] = useState(RECENT_ALERTS);

  const BOT_RESPONSES: Record<string, string> = {
    "/x23": "📊 **Breaking Out Now** — Today's breakout stocks:\n🟢 RELIANCE · 🟢 HDFCBANK · 🟢 TATASTEEL · 🟢 BAJFINANCE\nAll showing volume ≥ 2× avg with price breaking above resistance.",
    "/x31": "⚡ **High Momentum (RSI+MFI+CCI)** scan results:\n🟢 ICICIBANK · 🟢 HDFCBANK · 🟢 SBIN · 🟢 KOTAKBANK\nAll 4 in composite momentum top decile today.",
    "/x20": "🔮 **Next Day Bullish Picks** (AI-predicted):\n🟢 RELIANCE · 🟢 INFY · 🟢 LT · 🟢 ASIANPAINT\nModel confidence: 71–83%. Based on end-of-day price action.",
    "/x11": "🌊 **Short-term Bulls (Ichimoku)**:\n🟢 TCS · 🟢 WIPRO · 🟢 ULTRACEMCO · 🟢 MARUTI\nAll above Ichimoku cloud with bullish TK cross.",
    "/x7": "📈 **Chart Patterns detected today**:\n• VCP Setup → BAJAJ-AUTO, EICHER\n• Cup & Handle → TITAN, PAGEIND\n• Inside Bar → DIVISLAB, AUROPHARMA",
    "/x1": "🎯 **Probable Breakouts** (next session):\n🟢 COALINDIA · 🟢 GRASIM · 🟢 TATACONSUM · 🟢 ADANIPORTS\nConsolidating near resistance with rising volume.",
  };

  function sendBotCommand(cmd: string) {
    const userText = cmd || botInput;
    if (!userText.trim()) return;
    const now = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });
    setBotMessages((prev) => [...prev, { from: "user", text: userText, time: now }]);
    setBotInput("");
    setIsTyping(true);
    setTimeout(() => {
      const key = userText.toLowerCase().replace(/\s+/g, "");
      const reply = BOT_RESPONSES[key] || `Running scan for "${userText}"...\nResults fetched from NSE live feed. 12 stocks matched your criteria.`;
      setBotMessages((prev) => [...prev, { from: "bot", text: reply, time: new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) }]);
      setIsTyping(false);
    }, 900);
  }

  function handleRefresh() {
    setRefreshing(true);
    setTimeout(() => {
      setAlerts([...RECENT_ALERTS].reverse());
      setRefreshing(false);
    }, 800);
  }

  return (
    <div className="space-y-8">
      {/* ── Header Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Active Scanners", value: "33+", icon: Zap, color: "text-blue-600 bg-blue-50" },
          { label: "Today's Alerts", value: `${alerts.length}`, icon: Bell, color: "text-emerald-600 bg-emerald-50" },
          { label: "Subscribers", value: "12.4K", icon: MessageSquare, color: "text-violet-600 bg-violet-50" },
          { label: "Scan Frequency", value: "2× Daily", icon: Clock, color: "text-amber-600 bg-amber-50" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-border bg-card p-4 flex items-center gap-3">
            <span className={cn("flex size-9 items-center justify-center rounded-lg", s.color)}>
              <s.icon className="size-4" />
            </span>
            <div>
              <p className="text-lg font-bold text-foreground">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* ── Scheduled Scans ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Clock className="size-4 text-blue-600" />
              <span className="font-bold text-sm text-foreground">Scheduled Scans</span>
            </div>
            <span className="text-xs font-medium text-muted-foreground">In-app alerts</span>
          </div>
          <div className="divide-y divide-border">
            {SCHEDULED_SCANS.map((scan) => (
              <div key={scan.id} className="px-5 py-4 hover:bg-muted/40 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-foreground">{scan.label}</span>
                      <span className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        scan.status === "live"
                          ? "bg-emerald-100 text-emerald-700 animate-pulse"
                          : "bg-muted text-muted-foreground",
                      )}>
                        {scan.status === "live" ? "● LIVE" : "SCHEDULED"}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{scan.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><Clock className="size-3" />{scan.time}</span>
                      <span>{scan.days}</span>
                      <span className="text-emerald-600 font-medium">{scan.results} results</span>
                    </div>
                    <div className="flex flex-wrap gap-1 mt-2">
                      {scan.tags.map((t) => (
                        <span key={t} className="text-xs bg-accent text-accent-foreground px-1.5 py-0.5 rounded">{t}</span>
                      ))}
                    </div>
                  </div>
                  <button
                    onClick={() => setSubscribed(!subscribed)}
                    className={cn(
                      "flex items-center gap-1 shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                      subscribed
                        ? "bg-emerald-100 text-emerald-700 hover:bg-rose-50 hover:text-rose-600"
                        : "bg-primary text-primary-foreground hover:bg-primary/90",
                    )}
                  >
                    {subscribed ? <BellOff className="size-3" /> : <Bell className="size-3" />}
                    {subscribed ? "Unsubscribe" : "Alert Me"}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              Scheduled scans publish alerts at <span className="font-medium text-foreground">9:45am & 4pm IST</span> on trading days.
            </p>
          </div>
        </div>

        {/* ── Live Alert Feed ── */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between border-b border-border px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Zap className="size-4 text-amber-500" />
              <span className="font-bold text-sm text-foreground">Live Alert Feed</span>
              <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full animate-pulse">● LIVE</span>
            </div>
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
            >
              <RefreshCw className={cn("size-3", refreshing && "animate-spin")} />
              Refresh
            </button>
          </div>
          <div className="divide-y divide-border max-h-[360px] overflow-y-auto">
            {alerts.map((alert, idx) => (
              <div key={idx} className="px-5 py-3 hover:bg-muted/40 transition-colors">
                <div className="flex items-start gap-3">
                  <span className={cn("mt-0.5 size-2 rounded-full shrink-0", alertDot[alert.type])} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">{alert.stock}</span>
                      <span className={cn("text-xs font-semibold px-2 py-0.5 rounded border", alertColor[alert.type])}>
                        {alert.signal}
                      </span>
                      <span className="text-xs text-muted-foreground ml-auto">{alert.time}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{alert.detail}</p>
                    <span className="text-xs text-blue-600 font-medium">{alert.scanner}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-3 border-t border-border">
            <button
              type="button"
              onClick={() => setSubscribed(true)}
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-blue-200 bg-blue-50 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-100 transition-colors"
            >
              <Send className="size-3.5" />
              Enable alert notifications
            </button>
          </div>
        </div>
      </div>

      {/* ── On-Demand Bot ── */}
      <div className="rounded-xl border border-primary/30 bg-gradient-to-b from-primary/5 via-card to-card overflow-hidden">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <Bot className="size-4 text-primary" />
            <span className="font-bold text-sm text-foreground">On-Demand Scanner Bot</span>
            <span className="text-xs bg-emerald-100 text-emerald-700 font-bold px-2 py-0.5 rounded-full">ACTIVE</span>
          </div>
          <span className="text-xs font-medium text-muted-foreground">Demo · NSE universe</span>
        </div>

        {/* Quick commands */}
        <div className="px-5 py-3 border-b border-border/60">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Quick Commands</p>
          <div className="flex flex-wrap gap-2">
            {BOT_COMMANDS.map((c) => (
              <button
                key={c.cmd}
                onClick={() => sendBotCommand(c.cmd)}
                className="flex items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:border-primary/40 hover:bg-accent transition-colors group"
              >
                <code className="text-primary font-bold">{c.cmd}</code>
                <span className="text-muted-foreground group-hover:text-foreground">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat window */}
        <div className="space-y-3 max-h-64 overflow-y-auto p-5">
          {botMessages.map((msg, idx) => (
            <div
              key={idx}
              className={cn(
                "flex gap-2 text-sm",
                msg.from === "user" ? "flex-row-reverse" : "flex-row",
              )}
            >
              {msg.from === "bot" && (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Bot className="size-4" />
                </span>
              )}
              <div className={cn(
                "rounded-xl px-3.5 py-2.5 max-w-[85%]",
                msg.from === "bot"
                  ? "bg-card border border-border text-foreground"
                  : "bg-primary text-primary-foreground ml-auto",
              )}>
                <p className="text-xs leading-relaxed whitespace-pre-line">{msg.text}</p>
                <p className="text-xs opacity-50 mt-1">{msg.time}</p>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex gap-2 items-center text-xs text-muted-foreground">
              <Bot className="size-4 text-primary" />
              <span className="flex gap-1">
                <span className="animate-bounce delay-0 size-1.5 rounded-full bg-muted-foreground" />
                <span className="animate-bounce delay-100 size-1.5 rounded-full bg-muted-foreground" />
                <span className="animate-bounce delay-200 size-1.5 rounded-full bg-muted-foreground" />
              </span>
              Running scan...
            </div>
          )}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 border-t border-border/60 px-5 py-3">
          <input
            value={botInput}
            onChange={(e) => setBotInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendBotCommand("")}
            placeholder="Type a command like /X23 or ask: 'Show me momentum stocks'…"
            className="flex-1 rounded-lg border border-border bg-card px-4 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:border-primary"
          />
          <button
            onClick={() => sendBotCommand("")}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            <Send className="size-3.5" />
            Run
          </button>
        </div>
      </div>
    </div>
  );
}
