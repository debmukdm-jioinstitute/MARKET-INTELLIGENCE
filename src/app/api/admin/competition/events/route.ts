import { sameOrigin } from "@/lib/competition/http";
import { getAdminUser } from "@/lib/session";
import { syncCompetitionEvents } from "@/lib/competition/events";
import { dbFailure, json, prepare } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Cross-origin request rejected." }, 403);
  if (!(await getAdminUser()))
    return json({ error: "Admin access required." }, 403);
  try {
    await prepare();
    const result = await syncCompetitionEvents();
    return json(result, result.ok ? 200 : 503);
  } catch {
    return dbFailure();
  }
}
