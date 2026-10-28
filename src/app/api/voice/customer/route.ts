import { voiceAuthorized, unauthorized } from "@/lib/voice/auth";
import { getCustomerByPhone } from "@/lib/voice/schema";

export async function GET(req: Request) {
  if (!voiceAuthorized(req)) return unauthorized();
  const phone = new URL(req.url).searchParams.get("phone") ?? "";
  const c = await getCustomerByPhone(phone);
  if (!c) return Response.json({ found: false });
  // Re-check consent at call time; revoked consent must stop the pitch.
  if (!c.callConsent) return Response.json({ found: true, callConsent: false });
  const { userId, ...safe } = c;
  return Response.json({ found: true, userRef: userId, ...safe });
}
