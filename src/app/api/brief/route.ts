import { buildSiteWideExecutiveBrief, type SiteWideExecutiveBrief } from "@/lib/brief/site-wide-brief";
import { cachedSWR } from "@/lib/cache/redis";
import { after, NextResponse } from "next/server";
import { hasDatabase } from "@/lib/db";
import { getSessionUser } from "@/lib/session";
import { getSubscription, latestBriefs, setSubscription } from "@/lib/brief/store";

export const dynamic = "force-dynamic";

/** The site-wide brief is identical for every visitor: memory (60 s) + shared Redis SWR (fresh 5 min, kept 2 h). */
let memo: { at: number; value: SiteWideExecutiveBrief } | null = null;
async function getSiteWideBrief(): Promise<{ brief: SiteWideExecutiveBrief; cache: string }> {
  if (memo && Date.now() - memo.at < 60_000) return { brief: memo.value, cache: "memory" };
  const { value, cache } = await cachedSWR<SiteWideExecutiveBrief>(
    "brief:sitewide:v1",
    { freshMs: 5 * 60_000, ttlSec: 2 * 60 * 60 },
    () => buildSiteWideExecutiveBrief(),
    (task) => after(task),
  );
  const brief = value ?? (await buildSiteWideExecutiveBrief());
  memo = { at: Date.now(), value: brief };
  return { brief, cache };
}

/** GET → latest briefs + the caller's email subscription. POST {pre, post} → set subscription (signed-in, non-guest only). */
export async function GET() {
  // Independent reads run in parallel (was: four sequential awaits).
  const [user, briefs, site] = await Promise.all([getSessionUser(), latestBriefs(6), getSiteWideBrief()]);
  const subscription = hasDatabase() && user && !user.guest ? await getSubscription(user.email).catch(() => null) : null;
  return NextResponse.json(
    { briefs, siteWideBrief: site.brief, subscription, canSubscribe: Boolean(user && !user.guest), dbConfigured: hasDatabase() },
    { headers: { "x-mi-cache": site.cache } },
  );
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) return NextResponse.json({ error: "Sign in to subscribe" }, { status: 401 });
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });
  const body = await req.json().catch(() => ({}));
  await setSubscription(user.email, Boolean(body.pre), Boolean(body.post));
  return NextResponse.json({ ok: true });
}
