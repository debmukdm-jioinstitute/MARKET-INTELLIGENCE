import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { SCANNERS } from "@/lib/scanner/scanners";
import { loadScan } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";

/** GET → scanner catalogue with match counts and the latest run metadata; ?scanner=<id> adds that scanner's matches. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const run = await loadScan().catch(() => null);
  const id = new URL(req.url).searchParams.get("scanner");
  return NextResponse.json({
    run: run && { asOf: run.asOf, lastBar: run.lastBar, universe: run.universe, scanned: run.scanned, failed: run.failed },
    scanners: SCANNERS.map((s) => ({ id: s.id, label: s.label, description: s.description, bias: s.bias, matches: run?.scanners[s.id]?.length ?? 0 })),
    results: id ? (run?.scanners[id] ?? []) : undefined,
  });
}
