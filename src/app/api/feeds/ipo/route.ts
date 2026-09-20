import { fetchUpstoxIpoList } from "@/lib/feeds/sources/upstox";
import type { IpoStatus } from "@/lib/feeds/ipo/types";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const VALID_STATUSES: IpoStatus[] = ["open", "closed", "listed", "upcoming"];

export async function GET(req: Request) {
  const status = (new URL(req.url).searchParams.get("status") ?? "open") as IpoStatus;
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: `Invalid status: ${status}` }, { status: 400 });
  }
  try {
    const ipos = await fetchUpstoxIpoList(status);
    return NextResponse.json(
      { status, ipos },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Upstox IPO list failed" },
      { status: 502 },
    );
  }
}
