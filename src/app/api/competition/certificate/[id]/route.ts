import { z } from "zod";
import { sql } from "@/lib/db";
import { dbFailure, json, prepare } from "@/lib/competition/http";
export const dynamic = "force-dynamic";
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return json({ error: "Invalid verification ID." }, 400);
  try {
    await prepare();
    const [row] =
      await sql()`SELECT cc.id,cc.display_name,cc.kind,c.name FROM competition_certificates cc JOIN competition c ON c.id=cc.competition_id WHERE cc.id=${id}::uuid AND c.results_verified`;
    return row
      ? json({ certificate: row })
      : json({ error: "Certificate not found." }, 404);
  } catch {
    return dbFailure();
  }
}
