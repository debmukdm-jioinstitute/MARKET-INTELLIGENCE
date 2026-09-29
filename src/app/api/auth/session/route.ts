import { GUEST_EMAIL } from "@/lib/auth";
import { signSessionPayload } from "@/lib/auth-crypto";
import { isRequireAccountEnabled } from "@/lib/auth/require-account";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function clearGuestCookie(res: NextResponse) {
  res.cookies.set("mi_session", "", { httpOnly: true, path: "/", maxAge: 0 });
}

/** Reads the current signed session (if any) — used to hydrate the client on load, since the cookie is httpOnly. */
export async function GET() {
  const requireAccount = await isRequireAccountEnabled();
  const user = await getSessionUser();
  if (requireAccount && user?.guest) {
    const res = NextResponse.json({ user: null, requireAccount: true });
    clearGuestCookie(res);
    return res;
  }
  return NextResponse.json({ user, requireAccount });
}

/**
 * Guest mode only. Real accounts are issued a session by /api/auth/signup or
 * /api/auth/login, which verify a password server-side first — this route
 * must never accept an arbitrary client-claimed email for a non-guest session.
 */
export async function POST(request: Request) {
  let body: { guest?: boolean } = {};
  try {
    body = (await request.json()) as { guest?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.guest) {
    return NextResponse.json({ error: "Use /api/auth/signup or /api/auth/login to start a real session." }, { status: 400 });
  }

  if (await isRequireAccountEnabled()) {
    return NextResponse.json({ error: "Guest access is disabled. Create a free account." }, { status: 403 });
  }

  const payload = { guest: true, name: "Guest", email: GUEST_EMAIL };
  const token = signSessionPayload(payload);
  const res = NextResponse.json({ ok: true, guest: true, user: payload });
  res.cookies.set("mi_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("mi_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
