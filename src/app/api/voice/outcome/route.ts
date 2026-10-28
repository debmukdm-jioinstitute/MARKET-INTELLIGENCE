import { voiceAuthorized, unauthorized } from "@/lib/voice/auth";
import { normalizePhone } from "@/lib/voice/eligibility";
import { addDnd, getCustomerByPhone, logCall } from "@/lib/voice/schema";

const RESULTS = ["interested", "not_interested", "callback", "do_not_call", "purchased", "no_answer"] as const;

export async function POST(req: Request) {
  if (!voiceAuthorized(req)) return unauthorized();
  const b = await req.json();
  const phone = normalizePhone(b.phone ?? "");
  if (!phone || !RESULTS.includes(b.result)) return Response.json({ error: "bad request" }, { status: 400 });
  const c = await getCustomerByPhone(phone);
  if (b.result === "do_not_call") await addDnd(phone); // immediate, before anything else can dial
  await logCall({
    userId: c?.userId ?? "unknown", phone, segment: b.segment ?? "inbound",
    direction: b.direction, result: b.result, churnReason: b.churnReason, callId: b.callId,
  });
  return Response.json({ ok: true });
}
