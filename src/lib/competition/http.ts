import { NextResponse } from "next/server";
import { ensureSchema, hasDatabase } from "@/lib/db";
import { GUEST_EMAIL } from "@/lib/auth";
import { getSessionUser } from "@/lib/session";
import { DISCLAIMER } from "./config";
export const json = (value: object, status = 200) =>
  NextResponse.json(
    { ...value, disclaimer: DISCLAIMER },
    { status, headers: { "Cache-Control": "no-store" } },
  );
export const dbFailure = () =>
  json(
    { error: "Competition data is temporarily unavailable. Please retry." },
    502,
  );
export async function prepare() {
  if (!hasDatabase()) throw new Error("Database unavailable");
  await ensureSchema();
}
export async function realUser() {
  const user = await getSessionUser();
  return user && !user.guest && user.email !== GUEST_EMAIL ? user : null;
}

export function sameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  return !origin || origin === new URL(req.url).origin;
}
