import { signSessionPayload } from "@/lib/auth-crypto";
import type { SessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

/** Sets the signed httpOnly `mi_session` cookie on a response for a real (non-guest) user. */
export function setSessionCookie(res: NextResponse, user: SessionUser, maxAgeSeconds = 60 * 60 * 24 * 30) {
  const token = signSessionPayload({ email: user.email, name: user.name, guest: false, role: user.role ?? "user" });
  res.cookies.set("mi_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: maxAgeSeconds,
  });
  return res;
}
