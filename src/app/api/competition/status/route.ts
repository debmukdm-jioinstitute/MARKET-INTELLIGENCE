import { currentCompetition, participant } from "@/lib/competition/store";
import { instituteDomains } from "@/lib/competition/config";
import { dbFailure, json, prepare, realUser } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await prepare();
    const c = await currentCompetition();
    const user = await realUser();
    return json({
      competition: c,
      registration: c && user ? await participant(c.id, user.email) : null,
      signedIn: !!user,
      registrationConfigured: instituteDomains().length > 0,
    });
  } catch {
    return dbFailure();
  }
}
