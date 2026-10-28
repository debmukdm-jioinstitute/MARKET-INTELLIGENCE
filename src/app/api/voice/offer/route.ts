import { voiceAuthorized, unauthorized } from "@/lib/voice/auth";

/**
 * Approved offers live in env VOICE_OFFERS (JSON), e.g.
 * {"daily":{"priceInr":99,"validity":"1 day","discountCode":null},
 *  "plus":{"priceInr":499,"validity":"30 days","discountCode":"WINBACK10","discountPct":10}}
 * Keeps the agent from inventing prices or discounts.
 */
export async function GET(req: Request) {
  if (!voiceAuthorized(req)) return unauthorized();
  const plan = new URL(req.url).searchParams.get("plan") ?? "";
  const offers = JSON.parse(process.env.VOICE_OFFERS ?? "{}");
  const offer = offers[plan];
  return offer ? Response.json({ plan, ...offer }) : Response.json({ error: "unknown plan" }, { status: 404 });
}
