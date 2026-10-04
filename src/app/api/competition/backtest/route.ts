import { backtestInput, sandbox } from "@/lib/competition/backtest";
import { sameOrigin, dbFailure, json, realUser } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export const maxDuration = 30;
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Cross-origin request rejected." }, 403);
  if (!(await realUser()))
    return json({ error: "Sign in to run research backtests." }, 401);
  const input = backtestInput.safeParse(await req.json().catch(() => null));
  if (!input.success)
    return json({ error: "Invalid backtest parameters." }, 400);
  try {
    const result = await sandbox(input.data);
    return json(result, "error" in result ? 422 : 200);
  } catch {
    return dbFailure();
  }
}
