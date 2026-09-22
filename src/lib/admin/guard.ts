import { getAdminUser } from "@/lib/session";
import type { SessionUser } from "@/lib/auth";
import { NextResponse } from "next/server";

/** Returns the admin session user, or a 403 NextResponse to return immediately from the route. */
export async function requireAdmin(): Promise<{ user: SessionUser } | { error: NextResponse }> {
  const user = await getAdminUser();
  if (!user) return { error: NextResponse.json({ error: "Admin access required" }, { status: 403 }) };
  return { user };
}
