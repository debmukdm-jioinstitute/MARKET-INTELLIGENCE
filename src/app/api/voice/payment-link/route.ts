import Razorpay from "razorpay";
import { voiceAuthorized, unauthorized } from "@/lib/voice/auth";
import { getCustomerByPhone, recentPaymentLink, saveLink } from "@/lib/voice/schema";

export async function POST(req: Request) {
  if (!voiceAuthorized(req)) return unauthorized();
  const { phone, plan } = await req.json();
  const offers = JSON.parse(process.env.VOICE_OFFERS ?? "{}");
  const offer = offers[plan];
  const c = await getCustomerByPhone(phone ?? "");
  if (!offer || !c || !c.callConsent) return Response.json({ sent: false, reason: "invalid" }, { status: 400 });

  const existing = await recentPaymentLink(c.userId, plan);
  if (existing) return Response.json({ sent: true, deduped: true });

  const rzp = new Razorpay({ key_id: process.env.RAZORPAY_KEY_ID!, key_secret: process.env.RAZORPAY_KEY_SECRET! });
  const price = Math.round(offer.priceInr * (1 - (offer.discountPct ?? 0) / 100));
  const link = await rzp.paymentLink.create({
    amount: price * 100,
    currency: "INR",
    description: `Market Intelligence ${plan} plan`,
    customer: { contact: phone },
    notify: { sms: true, email: false },
    reminder_enable: false,
    notes: { source: "voice-agent", plan, user_ref: c.userId },
  });
  await saveLink(c.userId, plan, link.short_url);
  return Response.json({ sent: true, channel: "sms" });
}
