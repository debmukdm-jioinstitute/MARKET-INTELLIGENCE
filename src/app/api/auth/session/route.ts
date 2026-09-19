import { GUEST_EMAIL } from "@/lib/auth";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const body = (await request.json()) as { name?: string; email?: string; guest?: boolean };

  if (body.guest) {
    const payload = { guest: true, name: "Guest", email: GUEST_EMAIL };
    const res = NextResponse.json({ ok: true, guest: true });
    res.cookies.set("mi_session", JSON.stringify(payload), {
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
  const res = NextResponse.json({ ok: true });
  res.cookies.set(
    "mi_session",
    JSON.stringify({ email, name: body.name?.trim() || "Investor", guest: false }),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    },
  );
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set("mi_session", "", { httpOnly: true, path: "/", maxAge: 0 });
  return res;
}
