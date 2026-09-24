import { feedFetch } from "@/lib/feeds/http";

export async function getText(url: string, init?: RequestInit & { timeoutMs?: number }): Promise<string> {
  const res = await feedFetch(url, { timeoutMs: 25_000, ...init });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return res.text();
}

export async function getBytes(url: string): Promise<Uint8Array> {
  const res = await feedFetch(url, { timeoutMs: 40_000 });
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

/** Reject obviously broken scrapes before they touch the DB. */
export function inRange(name: string, v: number, min: number, max: number): number {
  if (!Number.isFinite(v) || v < min || v > max) throw new Error(`${name}=${v} outside [${min}, ${max}]`);
  return v;
}

export const today = () => new Date().toISOString().slice(0, 10);
