import { isCallable, normalizePhone } from "@/lib/voice/eligibility";
import { listCandidates } from "@/lib/voice/schema";

/** Vercel cron hits this daily with Authorization: Bearer <CRON_SECRET> */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`)
    return Response.json({ error: "unauthorized" }, { status: 401 });

  const now = new Date();
  const cap = Number(process.env.VOICE_DAILY_CAP ?? 50);
  const eligible = (await listCandidates()).filter((c) => isCallable(c, now)).slice(0, cap);

  // Cohort rows for Sarvam's Scheduling API. Segment still gates
  // eligibility (via isCallable), but it is not a cohort column and is
  // not sent to Sarvam.
  const contacts = eligible.flatMap((c) => {
    const normalized = normalizePhone(c.phone);
    if (!normalized) return [];
    return [{ mobile: normalized.slice(3), customerId: c.userId, name: c.firstName }];
  });

  let pushed = 0;
  const campaignId = process.env.SAMVAAD_CAMPAIGN_ID;
  const orgId = process.env.SAMVAAD_ORG_ID;
  const workspaceId = process.env.SAMVAAD_WORKSPACE_ID;
  const apiKey = process.env.SAMVAAD_API_KEY;
  if (contacts.length && campaignId && orgId && workspaceId && apiKey) {
    const csvField = (value: string) =>
      /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
    const csv = [
      "mobile,customer_id,name",
      ...contacts.map((c) =>
        [c.mobile, c.customerId, c.name].map(csvField).join(","),
      ),
    ].join("\n") + "\n";
    const transform = {
      phone_number: { column_name: "mobile", country_code: "IN" },
      user_identifier: { column_name: "customer_id", required: true },
      app_variables: { customer_name: { column_name: "name" } },
    };
    // Cohort name in IST (the cron runs at 10:00 IST).
    const cohortDate = new Date(now.getTime() + 5.5 * 3600_000)
      .toISOString()
      .slice(0, 10);
    const cohortName = `voice-${cohortDate}`;
    const form = new FormData();
    // Sarvam's cohort upload takes cohort_name; "name" is sent as well
    // for compatibility with the field name used in its docs example.
    form.append("cohort_name", cohortName);
    form.append("name", cohortName);
    form.append("cohort_file", new File([csv], "cohort.csv", { type: "text/csv" }));
    form.append(
      "cohort_transformation_file",
      new File([JSON.stringify(transform)], "transform.json", {
        type: "application/json",
      }),
    );
    const res = await fetch(
      `https://apps.sarvam.ai/api/scheduling/v1/orgs/${orgId}/workspaces/${workspaceId}/campaigns/${campaignId}/cohorts/upload`,
      {
        method: "POST",
        headers: { "X-API-Key": apiKey },
        body: form,
      },
    );
    if (!res.ok)
      return Response.json(
        { error: "samvaad cohort upload failed", status: res.status },
        { status: 502 },
      );
    pushed = contacts.length;
  }
  return Response.json({ eligible: eligible.length, pushed });
}
