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

  if (!eligible.length) return Response.json({ eligible: 0, pushed: 0 });

  // Cohort rows for Sarvam's Scheduling API. Segment still gates
  // eligibility (via isCallable), but it is not a cohort column and is
  // not sent to Sarvam.
  const contacts = eligible.flatMap((c) => {
    const normalized = normalizePhone(c.phone);
    if (!normalized) return [];
    return [{ mobile: normalized.slice(3), customerId: c.userId, name: c.firstName }];
  });

  if (!contacts.length) return Response.json({ eligible: eligible.length, pushed: 0 });

  // Fully automated: create a fresh campaign for this run instead of
  // uploading to one fixed campaign. A fixed campaign has a finite
  // window (the old one ended 27 Nov 2026), so reusing it would need a
  // human to rotate it every ~28 days. A per-run campaign has a
  // 7-day window, and the next cron run creates its own.
  const orgId = process.env.SAMVAAD_ORG_ID;
  const workspaceId = process.env.SAMVAAD_WORKSPACE_ID;
  const apiKey = process.env.SAMVAAD_API_KEY;
  const agentId = process.env.SAMVAAD_AGENT_ID;
  const connectionId = process.env.SAMVAAD_CONNECTION_ID;
  const phoneNumber = process.env.SAMVAAD_PHONE_NUMBER;
  if (!orgId || !workspaceId || !apiKey || !agentId || !connectionId || !phoneNumber)
    return Response.json({ eligible: eligible.length, pushed: 0 });

  // Cohort name in IST (the cron runs at 10:00 IST).
  const cohortDate = new Date(now.getTime() + 5.5 * 3600_000)
    .toISOString()
    .slice(0, 10);
  const cohortName = `voice-${cohortDate}`;

  // Campaign window: start 10 minutes from now so Sarvam's
  // "start must be at least 120 seconds from now" rule is met even if
  // the cron or the upload takes a few minutes, and end 7 days later.
  // Calling hours are enforced by allowed_schedule, not by this window.
  const start = new Date(now.getTime() + 10 * 60_000);
  const end = new Date(start.getTime() + 7 * 24 * 3600_000);
  const createRes = await fetch(
    `https://apps.sarvam.ai/api/scheduling/v1/orgs/${orgId}/workspaces/${workspaceId}/campaigns`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": apiKey },
      body: JSON.stringify({
        name: cohortName,
        app_config: {
          app_id: agentId,
          app_version: 5,
          app_type: "agent",
          attempts_per_second: 2,
          connection_configs: [
            { connection_id: connectionId, phone_numbers: [phoneNumber] },
          ],
          retry_config: {
            retry_interval_minutes: 30,
            max_retries: 2,
            retry_on: {
              busy: { enabled: true },
              no_answer: { enabled: true },
              short_duration: { enabled: true, threshold_seconds: 10 },
            },
          },
        },
        start_timestamp: start.toISOString(),
        end_timestamp: end.toISOString(),
        allowed_schedule: {
          timezone: "Asia/Kolkata",
          allowed_start_time: "10:00",
          allowed_end_time: "18:00",
          allowed_days: [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ],
        },
      }),
    },
  );
  if (!createRes.ok)
    return Response.json(
      { error: "samvaad campaign creation failed", status: createRes.status },
      { status: 502 },
    );
  const created = (await createRes.json()) as { campaign_id?: string };
  const campaignId = created.campaign_id;
  if (!campaignId)
    return Response.json(
      { error: "samvaad campaign creation failed", status: createRes.status },
      { status: 502 },
    );

  const csvField = (value: string) =>
    /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
  const csv = [
    "mobile,customer_id,name",
    ...contacts.map((c) =>
      [c.mobile, c.customerId, c.name].map(csvField).join(","),
    ),
  ].join("\n") + "\n";
  // No app_variables: Indus v4 defines no customer_name variable, and
  // Sarvam rejects the cohort upload with 422 if the transform references
  // an app variable the agent does not define. The name column stays in
  // the CSV; the agent looks the customer up by phone via Get Customer
  // during the call.
  const transform = {
    phone_number: { column_name: "mobile", country_code: "IN" },
    user_identifier: { column_name: "customer_id", required: true },
  };
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
  return Response.json({ eligible: eligible.length, pushed: contacts.length, campaignId });
}
