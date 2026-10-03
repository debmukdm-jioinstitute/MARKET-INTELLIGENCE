import { z } from "zod";
import { addToWatchlist } from "@/lib/watchlist/store";
import { BACKTEST_UNIVERSE } from "@/lib/competition/backtest";
import {
  sameOrigin,
  dbFailure,
  json,
  prepare,
  realUser,
} from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Cross-origin request rejected." }, 403);
  const user = await realUser();
  if (!user) return json({ error: "Sign in to save your watchlist." }, 401);
  const input = z
    .object({ symbols: z.array(z.string()).min(1).max(5) })
    .safeParse(await req.json().catch(() => null));
  if (
    !input.success ||
    input.data.symbols.some((s) => !BACKTEST_UNIVERSE.includes(s))
  )
    return json({ error: "Invalid research watchlist symbols." }, 400);
  try {
    await prepare();
    for (const symbol of [...new Set(input.data.symbols)])
      await addToWatchlist(user.email, {
        market: "IN",
        symbol,
        name: symbol,
        note: "Alpha League backtest research; not a recommendation.",
      });
    return json({ ok: true });
  } catch {
    return dbFailure();
  }
}
