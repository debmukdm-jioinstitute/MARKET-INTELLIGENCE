"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import {
  Quote,
  TrendingUp,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Copy,
  Check,
  Activity,
  Layers,
  ShieldCheck,
} from "lucide-react";

export interface StockQuote {
  quote: string;
  author: string;
  title: string;
  tag?: string;
}

export const STOCK_MARKET_QUOTES: StockQuote[] = [
  {
    quote: "Price is what you pay. Value is what you get.",
    author: "Warren Buffett",
    title: "Chairman & CEO, Berkshire Hathaway",
    tag: "Value Investing",
  },
  {
    quote: "The big money is not in the buying and the selling, but in the waiting.",
    author: "Charlie Munger",
    title: "Vice Chairman, Berkshire Hathaway",
    tag: "Patience & Compounding",
  },
  {
    quote: "Know what you own, and know why you own it.",
    author: "Peter Lynch",
    title: "Legendary Manager, Fidelity Magellan",
    tag: "Due Diligence",
  },
  {
    quote: "In the short run, the market is a voting machine, but in the long run, it is a weighing machine.",
    author: "Benjamin Graham",
    title: "Father of Value Investing",
    tag: "Market Philosophy",
  },
  {
    quote: "Always invest with the mindset that you are buying a business, not a piece of paper.",
    author: "Rakesh Jhunjhunwala",
    title: "Iconic Indian Investor & Trader",
    tag: "Ownership Mindset",
  },
  {
    quote: "You can't do the same things others do and expect to outperform.",
    author: "Howard Marks",
    title: "Co-Chairman, Oaktree Capital",
    tag: "Second-Level Thinking",
  },
  {
    quote: "It's not whether you're right or wrong, but how much money you make when you're right and how much you lose when you're wrong.",
    author: "George Soros",
    title: "Founder, Soros Fund Management",
    tag: "Risk Asymmetry",
  },
  {
    quote: "The four most dangerous words in investing are: 'This time it's different.'",
    author: "Sir John Templeton",
    title: "Pioneer of Global Mutual Funds",
    tag: "Market Cycles",
  },
  {
    quote: "Time is your friend; impulse is your enemy.",
    author: "John C. Bogle",
    title: "Founder, Vanguard Group",
    tag: "Index Discipline",
  },
  {
    quote: "He who lives by the crystal ball will eat shattered glass.",
    author: "Ray Dalio",
    title: "Founder, Bridgewater Associates",
    tag: "Systematic Macro",
  },
  {
    quote: "The stock market is filled with individuals who know the price of everything, but the value of nothing.",
    author: "Philip Fisher",
    title: "Author, Common Stocks & Uncommon Profits",
    tag: "Intrinsic Value",
  },
  {
    quote: "Markets are never wrong — opinions often are.",
    author: "Jesse Livermore",
    title: "Legendary Pioneer of Market Speculation",
    tag: "Price Action",
  },
  {
    quote: "Long-term conviction and deep business fundamentals always outlast market noise.",
    author: "Radhakishan Damani",
    title: "Founder, DMart & Veteran Investor",
    tag: "Fundamental Conviction",
  },
  {
    quote: "Value investing is the discipline of buying shares at a significant discount from their current underlying value.",
    author: "Seth Klarman",
    title: "Chief Executive, Baupost Group",
    tag: "Margin of Safety",
  },
  {
    quote: "Preserve capital first, and wait until you have high conviction before taking large swings.",
    author: "Stanley Druckenmiller",
    title: "Chairman, Duquesne Family Office",
    tag: "Capital Preservation",
  },
  {
    quote: "Heads I win, tails I don't lose much. Low risk, high uncertainty is the ideal sweet spot.",
    author: "Mohnish Pabrai",
    title: "Managing Partner, Pabrai Investment Funds",
    tag: "Asymmetric Upside",
  },
  {
    quote: "Invest in preparedness, not in prediction.",
    author: "Nassim Nicholas Taleb",
    title: "Author, The Black Swan & Antifragile",
    tag: "Antifragility",
  },
  {
    quote: "The secret to investing is to figure out the value of something – and then pay a lot less.",
    author: "Joel Greenblatt",
    title: "Managing Partner, Gotham Capital",
    tag: "Magic Formula",
  },
];

export interface GlassLoaderProps {
  /** Main message to display, e.g. "Loading live NAVs from AMFI..." */
  message?: string;
  /** Secondary explanatory detail */
  detail?: string;
  /** Status badge pill at the top */
  statusBadge?: string;
  /** Visual variant */
  variant?: "fullscreen" | "page" | "card" | "compact" | "inline" | "overlay";
  /** Whether to show transitioning famous investor quotes */
  showQuotes?: boolean;
  /** Custom list of quotes (defaults to STOCK_MARKET_QUOTES) */
  quotes?: StockQuote[];
  /** Auto-transition interval in seconds (default: 4.5s) */
  quoteIntervalSeconds?: number;
  /** Additional wrapper class names */
  className?: string;
  /** Icon shown in the center of the 3D core */
  icon?: "chart" | "sparkles" | "activity" | "layers" | "shield";
}

export function GlassLoader({
  message = "Loading live NAVs from AMFI...",
  detail = "Synchronizing live asset net values, holdings radar and market telemetry",
  statusBadge = "LIVE TELEMETRY INGESTION",
  variant = "page",
  showQuotes = true,
  quotes = STOCK_MARKET_QUOTES,
  quoteIntervalSeconds = 4.5,
  className,
  icon = "chart",
}: GlassLoaderProps) {
  const [currentQuoteIndex, setCurrentQuoteIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);
  const [progress, setProgress] = useState(0);

  const activeQuotes = quotes.length > 0 ? quotes : STOCK_MARKET_QUOTES;
  const currentQuote = activeQuotes[currentQuoteIndex % activeQuotes.length];

  // Auto transition ticker with progress tracking
  useEffect(() => {
    if (!showQuotes || isPaused || activeQuotes.length <= 1) return;

    const intervalMs = quoteIntervalSeconds * 1000;
    const stepMs = 50;
    const progressIncrement = (stepMs / intervalMs) * 100;

    const timer = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          setCurrentQuoteIndex((idx) => (idx + 1) % activeQuotes.length);
          return 0;
        }
        return prev + progressIncrement;
      });
    }, stepMs);

    return () => clearInterval(timer);
  }, [showQuotes, isPaused, activeQuotes.length, quoteIntervalSeconds]);

  const handleNextQuote = useCallback(() => {
    setCurrentQuoteIndex((prev) => (prev + 1) % activeQuotes.length);
    setProgress(0);
  }, [activeQuotes.length]);

  const handlePrevQuote = useCallback(() => {
    setCurrentQuoteIndex((prev) => (prev - 1 + activeQuotes.length) % activeQuotes.length);
    setProgress(0);
  }, [activeQuotes.length]);

  const handleCopyQuote = useCallback(() => {
    if (!currentQuote) return;
    const text = `"${currentQuote.quote}" — ${currentQuote.author} (${currentQuote.title})`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [currentQuote]);

  // Center Icon Render
  const renderIcon = () => {
    switch (icon) {
      case "sparkles":
        return <Sparkles className="w-5 h-5 text-blue-500 animate-pulse" />;
      case "activity":
        return <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />;
      case "layers":
        return <Layers className="w-5 h-5 text-indigo-500 animate-pulse" />;
      case "shield":
        return <ShieldCheck className="w-5 h-5 text-sky-500 animate-pulse" />;
      case "chart":
      default:
        return <TrendingUp className="w-5 h-5 text-blue-500 animate-pulse" />;
    }
  };

  // Compact / Inline variant
  if (variant === "inline") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-3 px-4 py-2 rounded-full",
          "bg-background/80 dark:bg-zinc-900/80 backdrop-blur-md",
          "border border-border/80 shadow-sm text-xs font-medium text-foreground",
          className
        )}
      >
        <span className="relative flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500" />
        </span>
        <span className="truncate">{message}</span>
      </div>
    );
  }

  // Card variant (for bento cards / dialogs)
  if (variant === "card") {
    return (
      <div
        className={cn(
          "relative overflow-hidden rounded-2xl p-6 text-center flex flex-col items-center justify-center min-h-[200px]",
          "bg-white/60 dark:bg-zinc-900/60 backdrop-blur-xl",
          "border border-white/60 dark:border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.4)]",
          className
        )}
      >
        {/* Subtle Ambient Light Orb */}
        <div className="absolute -top-10 left-1/2 -translate-x-1/2 w-48 h-24 bg-blue-500/10 dark:bg-blue-500/20 blur-3xl pointer-events-none rounded-full" />

        {/* 3D Glass Gyro Spinner */}
        <div className="relative w-14 h-14 mb-4 perspective-1000">
          <div className="absolute inset-0 rounded-full border border-blue-500/30 animate-spin [animation-duration:3s]" />
          <div className="absolute inset-1.5 rounded-full border border-emerald-500/30 animate-spin [animation-duration:5s] [animation-direction:reverse]" />
          <div className="absolute inset-3 rounded-full bg-gradient-to-tr from-blue-500/10 to-indigo-500/20 backdrop-blur-sm border border-white/40 dark:border-white/20 flex items-center justify-center shadow-inner">
            {renderIcon()}
          </div>
        </div>

        <p className="text-sm font-semibold text-foreground tracking-tight">{message}</p>
        {detail && <p className="text-xs text-muted-foreground mt-1 max-w-sm line-clamp-1">{detail}</p>}

        {showQuotes && currentQuote && (
          <div className="mt-4 pt-3 border-t border-border/50 w-full max-w-xs">
            <p className="text-[11px] italic text-muted-foreground line-clamp-2">
              &quot;{currentQuote.quote}&quot;
            </p>
            <p className="text-[10px] font-medium text-foreground mt-1">
              — {currentQuote.author}
            </p>
          </div>
        )}
      </div>
    );
  }

  // Full Page / Fullscreen / Overlay variant
  const containerClasses = cn(
    "relative flex flex-col items-center justify-center p-4 sm:p-8 select-none transition-all",
    variant === "fullscreen" && "min-h-screen w-full bg-background/95 backdrop-blur-md",
    variant === "page" && "min-h-[440px] w-full py-12",
    variant === "overlay" && "absolute inset-0 z-50 bg-background/80 backdrop-blur-md rounded-2xl",
    className
  );

  return (
    <div className={containerClasses}>
      {/* Dynamic Ambient Mesh Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        <div className="absolute w-72 sm:w-96 h-72 sm:h-96 rounded-full bg-blue-500/10 dark:bg-blue-500/15 blur-3xl animate-pulse [animation-duration:4s]" />
        <div className="absolute -translate-x-20 translate-y-16 w-60 sm:w-80 h-60 sm:h-80 rounded-full bg-indigo-500/10 dark:bg-indigo-500/15 blur-3xl" />
        <div className="absolute translate-x-24 -translate-y-12 w-56 sm:w-72 h-56 sm:h-72 rounded-full bg-emerald-500/10 dark:bg-emerald-500/10 blur-3xl" />
      </div>

      {/* Main Glassmorphic 3D Card */}
      <div
        className={cn(
          "relative z-10 w-full max-w-xl mx-auto rounded-3xl p-6 sm:p-8",
          // Glass surface & specular highlight
          "bg-white/70 dark:bg-zinc-900/70 backdrop-blur-2xl backdrop-saturate-150",
          "border border-white/80 dark:border-white/10",
          "shadow-[0_20px_60px_-15px_rgba(0,0,0,0.07),0_0_40px_rgba(26,115,232,0.06),inset_0_1px_2px_rgba(255,255,255,0.9)]",
          "dark:shadow-[0_25px_70px_-15px_rgba(0,0,0,0.6),0_0_35px_rgba(26,115,232,0.15),inset_0_1px_1px_rgba(255,255,255,0.12)]"
        )}
      >
        {/* Subtle Diagonal Specular Reflection Sweep */}
        <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none">
          <div className="absolute -inset-full bg-gradient-to-r from-transparent via-white/10 dark:via-white/5 to-transparent rotate-12 animate-[glass-shimmer_6s_ease-in-out_infinite]" />
        </div>

        {/* Status Pill Badge */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-[11px] font-semibold tracking-wider uppercase bg-primary/10 text-primary border border-primary/20 backdrop-blur-md shadow-xs">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <span>{statusBadge}</span>
          </div>
        </div>

        {/* 3D Glass Gyroscopic Core */}
        <div className="flex flex-col items-center justify-center my-2">
          <div className="relative w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center perspective-1000">
            {/* Soft Ambient Ground Shadow that breathes */}
            <div className="absolute -bottom-3 w-16 h-3 bg-black/15 dark:bg-black/40 rounded-full blur-md animate-pulse [animation-duration:3s]" />

            {/* Outer Orbit Ring (Tilted in 3D space) */}
            <div
              className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/40 dark:border-blue-400/40 animate-[glass-orbit-slow_12s_linear_infinite]"
              style={{
                transformStyle: "preserve-3d",
              }}
            />

            {/* Counter Orbit Ring (Reverse 3D Tilt) */}
            <div
              className="absolute inset-2 rounded-full border border-indigo-500/40 dark:border-indigo-400/40 animate-[glass-orbit-reverse_10s_linear_infinite]"
              style={{
                transformStyle: "preserve-3d",
              }}
            />

            {/* Glowing Radial Wave Ring */}
            <div className="absolute inset-4 rounded-full bg-gradient-to-tr from-blue-500/15 via-emerald-500/10 to-purple-500/15 animate-[pulse-ring_3s_ease-in-out_infinite]" />

            {/* Central Floating 3D Frosted Glass Crystal */}
            <div
              className={cn(
                "relative z-10 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl flex items-center justify-center",
                "bg-white/80 dark:bg-zinc-800/80 backdrop-blur-xl",
                "border border-white dark:border-white/20",
                "shadow-[0_10px_25px_-5px_rgba(26,115,232,0.3),inset_0_2px_4px_rgba(255,255,255,0.9)]",
                "dark:shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5),inset_0_1px_2px_rgba(255,255,255,0.2)]",
                "animate-[glass-float_4s_ease-in-out_infinite]"
              )}
            >
              {renderIcon()}
            </div>
          </div>

          {/* Loading Headline */}
          <div className="text-center mt-5 space-y-1.5 max-w-md">
            <h3 className="text-lg sm:text-xl font-bold tracking-tight text-foreground bg-gradient-to-r from-foreground via-foreground/90 to-foreground/70 bg-clip-text">
              {message}
            </h3>
            {detail && (
              <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                {detail}
              </p>
            )}
          </div>

          {/* Continuous Glowing Progress Track */}
          <div className="w-full max-w-xs h-1.5 mt-5 rounded-full bg-muted/60 dark:bg-zinc-800/60 overflow-hidden relative border border-border/40">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary to-transparent w-1/2 rounded-full animate-[shimmer-bar_1.8s_infinite_ease-in-out]" />
          </div>
        </div>

        {/* Transition-wise Stock Market Wisdom Quotes */}
        {showQuotes && currentQuote && (
          <div
            className="mt-6 pt-5 border-t border-border/60 relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
          >
            {/* Card Header for Quotes */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                <Quote className="w-3.5 h-3.5 text-primary" />
                <span>Market Wisdom & Tenets</span>
              </div>

              {currentQuote.tag && (
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-muted text-muted-foreground border border-border/40">
                  {currentQuote.tag}
                </span>
              )}
            </div>

            {/* Animated Quote Card */}
            <div className="relative min-h-[96px] sm:min-h-[88px] flex flex-col justify-between p-3.5 sm:p-4 rounded-xl bg-background/50 dark:bg-zinc-950/40 border border-border/40 backdrop-blur-md">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentQuoteIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                  className="space-y-2"
                >
                  <blockquote className="text-xs sm:text-sm font-medium text-foreground leading-relaxed italic">
                    &ldquo;{currentQuote.quote}&rdquo;
                  </blockquote>

                  <div className="flex items-center justify-between text-xs pt-1">
                    <div className="truncate pr-2">
                      <span className="font-semibold text-foreground">
                        {currentQuote.author}
                      </span>
                      <span className="text-muted-foreground ml-1.5 hidden sm:inline">
                        • {currentQuote.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 text-muted-foreground">
                      <button
                        onClick={handleCopyQuote}
                        aria-label="Copy Quote"
                        title="Copy quote"
                        className="p-1 rounded-md hover:bg-muted/80 hover:text-foreground transition-colors"
                      >
                        {copied ? (
                          <Check className="w-3.5 h-3.5 text-emerald-500" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={handlePrevQuote}
                        aria-label="Previous Quote"
                        title="Previous quote"
                        className="p-1 rounded-md hover:bg-muted/80 hover:text-foreground transition-colors"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={handleNextQuote}
                        aria-label="Next Quote"
                        title="Next quote"
                        className="p-1 rounded-md hover:bg-muted/80 hover:text-foreground transition-colors"
                      >
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </AnimatePresence>

              {/* Progress bar to next quote */}
              <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-transparent overflow-hidden rounded-b-xl">
                <div
                  className="h-full bg-primary/40 transition-all duration-75 ease-linear"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Navigation Dots Indicator */}
            <div className="flex items-center justify-center gap-1.5 mt-3">
              {activeQuotes.slice(0, 8).map((_, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setCurrentQuoteIndex(i);
                    setProgress(0);
                  }}
                  className={cn(
                    "h-1 rounded-full transition-all duration-300",
                    currentQuoteIndex % 8 === i
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-muted-foreground/30 hover:bg-muted-foreground/60"
                  )}
                  aria-label={`Go to quote ${i + 1}`}
                />
              ))}
              {activeQuotes.length > 8 && (
                <span className="text-[10px] text-muted-foreground ml-1 font-sans">
                  +{activeQuotes.length - 8}
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
