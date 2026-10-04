import { z } from "zod";
import { currentCompetition, placeOrder } from "@/lib/competition/store";
import {
  sameOrigin,
  dbFailure,
  json,
  prepare,
  realUser,
} from "@/lib/competition/http";
export const dynamic = "force-dynamic";
const schema = z.object({
  symbol: z
    .string()
    .trim()
    .regex(/^[A-Za-z0-9&.\-]{1,24}$/),
  side: z.enum(["BUY", "SELL"]),
  shares: z.number().int().positive().max(1_000_000),
  requestId: z.string().uuid(),
});
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Cross-origin request rejected." }, 403);
  const user = await realUser();
  if (!user) return json({ error: "Sign in to trade." }, 401);
  const input = schema.safeParse(await req.json().catch(() => null));
  if (!input.success) return json({ error: "Invalid order." }, 400);
  try {
    await prepare();
    const c = await currentCompetition();
    if (!c) return json({ error: "Season not configured." }, 404);
    const result = await placeOrder(c, user.email, input.data);
    return json(result, result.ok ? 200 : result.status);
  } catch {
    return dbFailure();
  }
}
