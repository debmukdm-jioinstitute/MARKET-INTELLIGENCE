import webpush from "web-push";

export function hasPushConfigured(): boolean {
  return Boolean(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

let configured = false;
function configure() {
  if (configured) return;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) throw new Error("VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY are not configured.");
  webpush.setVapidDetails("mailto:admin@getmarketintelligence.vercel.app", publicKey, privateKey);
  configured = true;
}

export type PushSubscriptionRow = { endpoint: string; p256dh: string; auth: string };

/** Sends to one subscription; returns whether it succeeded and whether the subscription is gone (410/404, should be deleted). */
export async function sendPush(
  sub: PushSubscriptionRow,
  payload: { title: string; body: string; url?: string },
): Promise<{ ok: boolean; expired: boolean }> {
  configure();
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
    );
    return { ok: true, expired: false };
  } catch (e) {
    const statusCode = (e as { statusCode?: number })?.statusCode;
    return { ok: false, expired: statusCode === 404 || statusCode === 410 };
  }
}
