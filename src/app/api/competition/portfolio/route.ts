import { currentCompetition, myPortfolio } from "@/lib/competition/store";
import { dbFailure, json, prepare, realUser } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export async function GET() {
  const user = await realUser();
  if (!user) return json({ error: "Sign in to view your portfolio." }, 401);
  try {
    await prepare();
    const c = await currentCompetition();
    if (!c) return json({ error: "Season not configured." }, 404);
    return json({ competition: c, ...(await myPortfolio(c, user.email)) });
  } catch {
    return dbFailure();
  }
}
