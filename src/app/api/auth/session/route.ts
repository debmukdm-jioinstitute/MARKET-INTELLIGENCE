import { GUEST_EMAIL } from "@/lib/auth";
import { signSessionPayload } from "@/lib/auth-crypto";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  let body: { name?: string; email?: string; guest?: boolean } = {};
  try {
    body = (await request.json()) as { name?: string; email?: string; guest?: boolean };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (body.guest) {
    const payload = { guest: true, name: "Guest", email: GUEST_EMAIL };
    const token = signSessionPayload(payload);
    const res = NextResponse.json({ ok: true, guest: true });
    res.cookies.set("mi_session", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
    return res;
  }

  const email = body.email?.trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required" }, { status: 400 });

  const payload = { email, name: body.name?.trim() || "Investor", guest: false };
  const token = signSessionPayload(payload);
  const res = NextResponse.json({ ok: true });
  res.cookies.set("mi_session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("mi_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
