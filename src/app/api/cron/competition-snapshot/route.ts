import { timingSafeEqual } from "node:crypto";
import { currentCompetition, takeSnapshot } from "@/lib/competition/store";
import { dbFailure, json, prepare } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(req: Request) {
  const expected = process.env.CRON_SECRET
    ? `Bearer ${process.env.CRON_SECRET}`
    : "";
  const actual = req.headers.get("authorization") ?? "";
  if (
    !expected ||
    expected.length !== actual.length ||
    !timingSafeEqual(Buffer.from(expected), Buffer.from(actual))
  )
    return json({ error: "Unauthorized" }, 401);
  try {
    await prepare();
    const c = await currentCompetition();
    if (!c || c.status !== "live") return json({ ok: true, skipped: true });
    const result = await takeSnapshot(c);
    return json(result, result.ok ? 200 : 409);
  } catch {
    return dbFailure();
  }
}
