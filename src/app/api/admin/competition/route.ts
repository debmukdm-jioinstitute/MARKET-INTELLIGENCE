import { getAdminUser } from "@/lib/session";
import { adminCommand, adminOverview, runAdmin } from "@/lib/competition/admin";
import { sameOrigin, dbFailure, json, prepare } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export async function GET() {
  if (!(await getAdminUser()))
    return json({ error: "Admin access required." }, 403);
  try {
    await prepare();
    return json(await adminOverview());
  } catch {
    return dbFailure();
  }
}
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Cross-origin request rejected." }, 403);
  if (!(await getAdminUser()))
    return json({ error: "Admin access required." }, 403);
  const input = adminCommand.safeParse(await req.json().catch(() => null));
  if (!input.success)
    return json(
      { error: "Invalid admin command.", issues: input.error.flatten() },
      400,
    );
  try {
    await prepare();
    const result = await runAdmin(input.data);
    return json(result, result.ok ? 200 : 422);
  } catch {
    return dbFailure();
  }
}
