"use client";

import type { BacktestResult, StrategyId } from "@/lib/trade-lab/backtest";
import { useSyncExternalStore } from "react";

export interface PersonalBest {
  strategy: StrategyId;
  symbol: string;
  totalReturnPct: number;
  winRate: number | null;
  trades: number;
  at: number; // epoch ms
}

export interface GameState {
  firstBacktestAt: number | null;
  bests: Partial<Record<StrategyId, PersonalBest>>;
}

const GAME_KEY = "mi-trade-lab-game";
const EMPTY: GameState = { firstBacktestAt: null, bests: {} };

let gameRaw: string | null = null;
let gameParsed: GameState = EMPTY;
const gameListeners = new Set<() => void>();

function sanitize(v: unknown): GameState {
  if (typeof v !== "object" || v === null) return EMPTY;
  const o = v as Record<string, unknown>;
  const bests: Partial<Record<StrategyId, PersonalBest>> = {};
  if (typeof o.bests === "object" && o.bests !== null) {
    for (const [k, b] of Object.entries(o.bests as Record<string, unknown>)) {
      if (typeof b !== "object" || b === null) continue;
      const p = b as Record<string, unknown>;
      if (typeof p.totalReturnPct !== "number" || typeof p.symbol !== "string") continue;
      bests[k as StrategyId] = {
        strategy: k as StrategyId,
        symbol: p.symbol,
        totalReturnPct: p.totalReturnPct,
        winRate: typeof p.winRate === "number" ? p.winRate : null,
        trades: typeof p.trades === "number" ? p.trades : 0,
        at: typeof p.at === "number" ? p.at : 0,
      };
    }
  }
  return {
    firstBacktestAt: typeof o.firstBacktestAt === "number" ? o.firstBacktestAt : null,
    bests,
  };
}

/** Stable snapshot (cached by raw localStorage string) so subscribers never loop. */
export function readGame(): GameState {
  let r: string | null = null;
  try {
    r = localStorage.getItem(GAME_KEY);
  } catch {
    /* private mode */
  }
  if (r === gameRaw) return gameParsed;
  gameRaw = r;
  try {
    gameParsed = r ? sanitize(JSON.parse(r)) : EMPTY;
  } catch {
    gameParsed = EMPTY;
  }
  return gameParsed;
}

function writeGame(next: GameState) {
  try {
    localStorage.setItem(GAME_KEY, JSON.stringify(next));
  } catch {
    /* ignore */
  }
  gameListeners.forEach((l) => l());
}

function subscribeGame(cb: () => void) {
  gameListeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    gameListeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function useTradeLabGame(): GameState {
  return useSyncExternalStore(subscribeGame, readGame, () => EMPTY);
}

/**
 * Record a completed backtest. Compares total return against the stored
 * personal best for that strategy. localStorage only — no backend.
 */
export function recordBacktest(r: BacktestResult): { firstEver: boolean; newBest: boolean } {
  const g = readGame();
  const prev = g.bests[r.strategy];
  const firstEver = g.firstBacktestAt === null;
  const newBest = !prev || r.totalReturnPct > prev.totalReturnPct;
  const best: PersonalBest = {
    strategy: r.strategy,
    symbol: r.symbol,
    totalReturnPct: r.totalReturnPct,
    winRate: r.winRate,
    trades: r.trades,
    at: Date.now(),
  };
  writeGame({
    firstBacktestAt: g.firstBacktestAt ?? Date.now(),
    bests: newBest ? { ...g.bests, [r.strategy]: best } : g.bests,
  });
  return { firstEver, newBest };
}
