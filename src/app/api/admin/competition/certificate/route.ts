import { z } from "zod";
import { sql } from "@/lib/db";
import { getAdminUser } from "@/lib/session";
import { certificateRecipients } from "@/lib/competition/admin";
import { certificatePdf } from "@/lib/competition/certificates";
import { sameOrigin, dbFailure, json, prepare } from "@/lib/competition/http";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function POST(req: Request) {
  if (!sameOrigin(req))
    return json({ error: "Cross-origin request rejected." }, 403);
  if (!(await getAdminUser()))
    return json({ error: "Admin access required." }, 403);
  const input = z
    .object({ email: z.string().email() })
    .safeParse(await req.json().catch(() => null));
  if (!input.success)
    return json({ error: "Specify a participant email." }, 400);
  if (!process.env.COMPETITION_GOOGLE_SANS_FONT_PATH)
    return json(
      { error: "Configure the Google Sans certificate font first." },
      503,
    );
  try {
    await prepare();
    const eligible = await certificateRecipients();
    const recipient = eligible?.recipients.find(
      (p) => p.email === input.data.email.toLowerCase(),
    );
    if (!eligible || !recipient)
      return json(
        {
          error:
            "Verified final results and an eligible finisher are required.",
        },
        422,
      );
    const [row] =
      await sql()`INSERT INTO competition_certificates(competition_id,user_email,display_name,kind)
      VALUES(${eligible.c.id}::uuid,${recipient.email},${recipient.name},${recipient.kind}) ON CONFLICT(competition_id,user_email) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id`;
    const pdf = await certificatePdf({
      id: String(row.id),
      name: recipient.name,
      kind: recipient.kind,
      season: eligible.c.name,
    });
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="alpha-league-${row.id}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return dbFailure();
  }
}
