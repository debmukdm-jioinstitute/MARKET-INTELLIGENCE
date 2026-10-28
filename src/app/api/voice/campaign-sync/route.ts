import { isCallable, normalizePhone, segmentOf } from "@/lib/voice/eligibility";
import { listCandidates } from "@/lib/voice/schema";

/** Vercel cron hits this daily with Authorization: Bearer CRON_SECRET. */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const cap = Number(process.env.VOICE_DAILY_CAP ?? 50);
  const eligible = (await listCandidates()).filter((c) => isCallable(c, now)).slice(0, cap);

  const contacts = eligible.map((c) => ({
    phone: normalizePhone(c.phone)!,
    name: c.firstName,
    segment: segmentOf(c, now),
  }));

  // Push to the Samvaad campaign. Endpoint and payload shape come from Samvaad API docs.
  let pushed = 0;
  if (contacts.length && process.env.SAMVAAD_CAMPAIGN_URL) {
    const res = await fetch(process.env.SAMVAAD_CAMPAIGN_URL, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${process.env.SAMVAAD_API_KEY}` },
      body: JSON.stringify({ contacts }),
    });
    if (!res.ok) return Response.json({ error: "samvaad push failed", status: res.status }, { status: 502 });
    pushed = contacts.length;
  }
  return Response.json({ eligible: eligible.length, pushed });
}
