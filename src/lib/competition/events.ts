import { ensureKitTag } from "@/lib/kit";
import { sql } from "@/lib/db";

/** Explicit admin operation. Outbox alone never sends messages. Kit owns sequence fulfillment. */
export async function syncCompetitionEvents() {
  const apiKey = process.env.KIT_API_KEY;
  if (!apiKey) return { ok: false, error: "KIT_API_KEY needs owner input." };
  const rows =
    await sql()`SELECT e.id,e.user_email,e.event FROM competition_events e
    JOIN competition_participants p ON p.competition_id=e.competition_id AND p.user_email=e.user_email
    WHERE NOT e.delivered AND p.email_opt_in AND p.status='active' ORDER BY e.created_at LIMIT 25`;
  let delivered = 0;
  for (const row of rows) {
    const key = `COMPETITION_KIT_${String(row.event).toUpperCase()}_TAG`;
    const name = process.env[key]?.trim();
    if (!name) continue;
    const tag = await ensureKitTag(name);
    if (!tag.ok || !tag.tagId) continue;
    const headers = {
      "Content-Type": "application/json",
      "X-Kit-Api-Key": apiKey,
    };
    const created = await fetch("https://api.convertkit.com/v4/subscribers", {
      method: "POST",
      headers,
      body: JSON.stringify({ email_address: row.user_email }),
    });
    if (![200, 201, 422].includes(created.status)) continue;
    const tagged = await fetch(
      `https://api.convertkit.com/v4/tags/${tag.tagId}/subscribers`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ email_address: row.user_email }),
      },
    );
    if (![200, 201].includes(tagged.status)) continue;
    await sql()`UPDATE competition_events SET delivered=true WHERE id=${row.id}::uuid`;
    delivered++;
  }
  return { ok: true, delivered, pending: rows.length - delivered };
}
