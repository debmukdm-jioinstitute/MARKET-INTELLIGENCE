import { currentCompetition, leaderboard } from "@/lib/competition/store";
import { dbFailure, json, prepare, realUser } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await prepare();
    const c = await currentCompetition();
    if (!c) return json({ competition: null, rows: [] });
    const user = await realUser();
    const board = await leaderboard(c);
    return json({
      competition: c,
      rows: user ? board.rows : board.rows.slice(0, 20),
      preview: !user,
      delayed: board.delayed,
      asOf: new Date(board.at).toISOString(),
    });
  } catch {
    return dbFailure();
  }
}
