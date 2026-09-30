/**
 * Telegram delivery (free Zapier replacement for owner alerts).
 *
 * Sends via the Telegram Bot API using a bot the site owner creates in BotFather.
 * Required env vars (Vercel project settings; never commit these):
 *   TELEGRAM_BOT_TOKEN — token from @BotFather
 *   TELEGRAM_CHAT_ID   — one chat id, or TELEGRAM_CHAT_IDS for several (comma-separated)
 * To find a chat id: message the bot, then open
 * https://api.telegram.org/bot<TOKEN>/getUpdates and read message.chat.id.
 *
 * Contract: plain-text messages only (no parse_mode, so no entity-escaping bugs),
 * truncated to Telegram's 4096-char limit, sent with Phase-0 feedFetch retry semantics.
 * When unconfigured every send is a no-op that logs once and never throws —
 * Telegram is an enhancement, never a hard dependency.
 */

import { feedFetch } from "../feeds/http";

const TELEGRAM_API = "https://api.telegram.org";
const MAX_MESSAGE_LENGTH = 4096;

export function getTelegramChatIds(): string[] {
  const raw = process.env.TELEGRAM_CHAT_IDS ?? process.env.TELEGRAM_CHAT_ID ?? "";
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function hasTelegramConfigured(): boolean {
  return Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()) && getTelegramChatIds().length > 0;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://getmarketintelligence.in").replace(/\/+$/, "");
}

export interface TelegramEventLike {
  title: string;
  body: string;
  href: string;
  severity: string;
}

/** Compact plain-text rendering of a site event with a deep link. Never invents content — renders what it is given. */
export function formatEventMessage(e: TelegramEventLike): string {
  const icon = e.severity === "high" ? "\u26A0\uFE0F" : e.severity === "medium" ? "\u2139\uFE0F" : "\u{1F514}";
  const text = `${icon} ${e.title}\n${e.body}\n${siteUrl()}${e.href}`;
  return truncate(text);
}

export function truncate(text: string, max = MAX_MESSAGE_LENGTH): string {
  if (text.length <= max) return text;
  return text.slice(0, max - 1) + "\u2026";
}

/** Sends one message to one chat. Returns ok:false (never throws) on any failure. */
export async function sendTelegramMessage(chatId: string, text: string): Promise<{ ok: boolean }> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !chatId || !text.trim()) return { ok: false };
  try {
    const res = await feedFetch(`${TELEGRAM_API}/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: truncate(text), disable_web_page_preview: true }),
      timeoutMs: 10_000,
    });
    if (!res.ok) return { ok: false };
    const data = (await res.json().catch(() => null)) as { ok?: boolean } | null;
    return { ok: data?.ok === true };
  } catch {
    return { ok: false };
  }
}

/** Fans a message out to every configured chat. Empty text or no config → no-op, never throws. */
export async function broadcastTelegram(text: string): Promise<{ sent: number; failed: number }> {
  if (!hasTelegramConfigured() || !text.trim()) return { sent: 0, failed: 0 };
  let sent = 0;
  let failed = 0;
  for (const chatId of getTelegramChatIds()) {
    try {
      const r = await sendTelegramMessage(chatId, text);
      if (r.ok) sent++;
      else failed++;
    } catch {
      failed++;
    }
  }
  return { sent, failed };
}
