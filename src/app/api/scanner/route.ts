import { NextResponse } from "next/server";
import { checkAndRecordScannerView, type ScannerQuotaView } from "@/lib/payments/scanner-quota";
import { getSessionUser } from "@/lib/session";
import { SCANNERS } from "@/lib/scanner/scanners";
import { loadScan } from "@/lib/scanner/store";

export const dynamic = "force-dynamic";

/** GET → scanner catalogue with match counts and the latest run metadata; ?scanner=<id> adds that scanner's matches; ?symbol=X lists every scanner flagging X. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  const sp = new URL(req.url).searchParams;
  const id = sp.get("scanner");
  const symbol = sp.get("symbol")?.trim().toUpperCase();

  // P1 Guest scanner visibility: allow public lookup for individual symbol radar on the research page
  if (!user && !symbol) {
    return NextResponse.json({ error: "Sign in required", authRequired: true }, { status: 401 });
  }

  const run = await loadScan().catch(() => null);

  let scannerQuota: ScannerQuotaView | undefined;
  let results: NonNullable<typeof run>["scanners"][string] | undefined;

  if (id && user) {
    const gate = await checkAndRecordScannerView(user, id);
    if (!gate.ok) return gate.response;
    scannerQuota = gate.quota;
    results = run?.scanners[id] ?? [];
  }

  return NextResponse.json({
    run: run && { asOf: run.asOf, lastBar: run.lastBar, universe: run.universe, scanned: run.scanned, failed: run.failed },
    scanners: SCANNERS.map((s) => ({
      id: s.id,
      label: s.label,
      description: s.description,
      bias: s.bias,
      matches: run?.scanners[s.id]?.length ?? 0,
      top: (run?.scanners[s.id] ?? []).slice(0, 5).map((r) => ({ symbol: r.symbol, changePct: r.changePct })),
    })),
    symbolHits: symbol
      ? SCANNERS.flatMap((s) =>
          (run?.scanners[s.id] ?? [])
            .filter((r) => r.symbol === symbol)
            .map((r) => ({ scanner: s.id, label: s.label, bias: s.bias, ...r })),
        )
      : undefined,
    results,
    scannerQuota,
    authenticated: Boolean(user),
  });
}
