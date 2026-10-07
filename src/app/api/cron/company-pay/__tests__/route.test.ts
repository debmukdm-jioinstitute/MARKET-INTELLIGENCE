import { beforeEach, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";
const m = vi.hoisted(() => ({ auth: vi.fn(), configured: vi.fn(() => true), save: vi.fn() }));
vi.mock("@/lib/api-guard", () => ({ cronUnauthorized: m.auth }));
vi.mock("@/lib/db", () => ({ hasDatabase: m.configured, ensureSchema: vi.fn(), sql: vi.fn() }));
vi.mock("@/lib/research/company-pay", async (original) => ({ ...await original<typeof import("@/lib/research/company-pay")>(), upsertCompanyPay: m.save }));
import { POST } from "../route";
beforeEach(() => { m.auth.mockReset().mockReturnValue(null); m.save.mockReset().mockResolvedValue([]); m.configured.mockReturnValue(true); });
const request = (body: unknown) => new Request("https://example.com/api/cron/company-pay", { method: "POST", body: JSON.stringify(body) });
it("denies unauthorised writes before parsing or saving", async () => { m.auth.mockReturnValue(NextResponse.json({ error: "Unauthorized" }, { status: 401 })); expect((await POST(request({}))).status).toBe(401); expect(m.save).not.toHaveBeenCalled(); });
it("rejects malformed and oversized input without writes", async () => {
  expect((await POST(request({ rows: [] }))).status).toBe(400);
  expect((await POST(new Request("https://example.com/api", { method: "POST", body: "x".repeat(512001) }))).status).toBe(413);
  expect(m.save).not.toHaveBeenCalled();
});
it("accepts unavailable statuses with null values and reports atomic ingest counts", async () => {
  const response = await POST(request({ rows: [{ symbol: "ACME", fy: "FY26", sourceUrl: null, rows: [], status: "unreadable", reason: "Filing list unavailable", extractedBy: "rules", filingDate: null }] }));
  expect(response.status).toBe(200); expect(await response.json()).toMatchObject({ ok: true, received: 1, unchanged: 1 }); expect(m.save).toHaveBeenCalledOnce();
});
it("fails closed when storage is unavailable", async () => { m.configured.mockReturnValue(false); expect((await POST(request({}))).status).toBe(503); expect(m.save).not.toHaveBeenCalled(); });
