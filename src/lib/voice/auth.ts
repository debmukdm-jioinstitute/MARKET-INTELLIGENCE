import { timingSafeEqual } from "node:crypto";

export function voiceAuthorized(req: Request): boolean {
  const expected = process.env.VOICE_API_SECRET;
  const got = req.headers.get("x-voice-secret");
  if (!expected || !got) return false;
  const a = Buffer.from(expected), b = Buffer.from(got);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const unauthorized = () => Response.json({ error: "unauthorized" }, { status: 401 });
