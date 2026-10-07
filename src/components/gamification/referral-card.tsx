"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/components/providers/auth-provider";
import { cn } from "@/lib/utils";
import { Check, Copy, Gift, Share2, Users } from "lucide-react";

interface ReferralEntry {
  id?: string;
  code?: string;
  display?: string;
  email?: string;
  status?: string;
  joined_at?: string;
}

interface ReferralMe {
  code: string;
  link: string;
  stats: { pending: number; converted: number };
  referrals: ReferralEntry[];
}

async function loadReferrals(): Promise<ReferralMe | null> {
  try {
    const res = await fetch("/api/referrals/me");
    if (!res.ok) return null;
    const json = (await res.json().catch(() => null)) as ReferralMe | null;
    if (!json || typeof json.code !== "string") return null;
    return {
      code: json.code,
      link: typeof json.link === "string" ? json.link : "",
      stats: {
        pending: typeof json.stats?.pending === "number" ? json.stats.pending : 0,
        converted: typeof json.stats?.converted === "number" ? json.stats.converted : 0,
      },
      referrals: Array.isArray(json.referrals) ? json.referrals : [],
    };
  } catch {
    return null;
  }
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  pending: { label: "Joined", className: "bg-stone-100 text-stone-700" },
  converted: { label: "+1 month earned", className: "bg-emerald-100 text-emerald-800" },
};

function referralLabel(r: ReferralEntry, i: number): string {
  return r.display || r.email || r.code || `Friend ${i + 1}`;
}

function referralBadge(status: string): { label: string; className: string } {
  const s = (status || "").toLowerCase();
  return STATUS_BADGE[s] ?? { label: s || "Joined", className: "bg-stone-100 text-stone-700" };
}

export function ReferralCard() {
  const { user, isGuest, ready } = useAuth();
  const [data, setData] = useState<ReferralMe | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!ready || isGuest || !user?.email) {
      setData(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    loadReferrals()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, isGuest, user?.email]);

  const copyLink = async () => {
    if (!data?.link) return;
    try {
      await navigator.clipboard.writeText(data.link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const shareText = data?.link
    ? `I'm using Market Intelligence — free AI stock research for India & US markets, with XP you can turn into a free Plus month. Join with my link:\n${data.link}`
    : "";
  const whatsappHref = shareText ? `https://wa.me/?text=${encodeURIComponent(shareText)}` : "";

  const pending = data?.stats.pending ?? 0;
  const converted = data?.stats.converted ?? 0;
  const referrals = data?.referrals ?? [];

  return (
    <section id="referrals" aria-label="Refer and earn" className="rounded-2xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Refer &amp; earn</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            When a friend joins with your link and buys a plan, you get <span className="font-semibold text-foreground">1 month of Plus free</span>.
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
          <Gift className="size-3.5" aria-hidden />
          1 month per plan bought
        </span>
      </div>

      {loading ? (
        <div className="mt-4 space-y-3" aria-label="Loading your referrals">
          <div className="h-12 w-full max-w-md animate-pulse rounded-xl bg-muted" />
          <div className="h-8 w-48 animate-pulse rounded-full bg-muted" />
        </div>
      ) : !data ? (
        <p className="mt-4 text-sm text-muted-foreground">
          Sign in to get your personal referral link. Share it — every friend who buys a plan earns you a free month of Plus.
        </p>
      ) : (
        <div className="mt-4 space-y-4">
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Your referral code</p>
              <p className="mt-1 truncate text-2xl font-bold tracking-tight text-foreground tabular-nums">{data.code}</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full bg-primary px-4 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
              >
                {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
                {copied ? "Copied" : "Copy link"}
              </button>
              {whatsappHref ? (
                <a
                  href={whatsappHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-full border border-border px-4 text-sm font-medium transition hover:bg-muted"
                >
                  <Share2 className="size-4" aria-hidden />
                  Share on WhatsApp
                </a>
              ) : null}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:max-w-sm">
            <div className="rounded-xl border border-border p-4">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Users className="size-3.5" aria-hidden />
                Friends joined
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{pending}</p>
            </div>
            <div className="rounded-xl border border-border p-4">
              <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-muted-foreground">
                <Gift className="size-3.5" aria-hidden />
                Free months earned
              </p>
              <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{converted}</p>
            </div>
          </div>

          {referrals.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Nothing yet. Share your link — when a friend buys a plan, you get 1 month Plus FREE.
            </p>
          ) : (
            <div>
              <h3 className="text-sm font-semibold text-foreground">Your referrals</h3>
              <ul className="mt-1 divide-y divide-border">
                {referrals.map((r, i) => {
                  const badge = referralBadge(r.status ?? "");
                  return (
                    <li key={r.id ?? r.code ?? `${i}`} className="flex items-center justify-between gap-3 py-2.5">
                      <p className="min-w-0 truncate text-sm text-foreground">{referralLabel(r, i)}</p>
                      <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-semibold", badge.className)}>
                        {badge.label}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
