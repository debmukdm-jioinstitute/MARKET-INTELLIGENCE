import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { TOOLS } from "@/lib/mcp/tools";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Minimal MCP server (Streamable HTTP, JSON responses) exposing the site's own computed data, read-only.
 * initialize / tools/list are open; tools/call requires a key from MCP_API_KEYS (comma-separated) via
 * `X-API-Key` or `Authorization: Bearer`. With no keys configured, tool calls are disabled.
 */

const PROTOCOL = "2025-03-26";
const digest = (s: string) => createHash("sha256").update(s).digest();

function authorised(req: Request): { ok: true; key: string } | { ok: false } {
  const keys = (process.env.MCP_API_KEYS ?? "").split(",").map((k) => k.trim()).filter(Boolean);
  if (!keys.length) return { ok: false };
  const presented = req.headers.get("x-api-key") ?? req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!presented) return { ok: false };
  const p = digest(presented);
  return keys.some((k) => timingSafeEqual(p, digest(k))) ? { ok: true, key: presented } : { ok: false };
}

// Best-effort per-key rate limit (per serverless instance): 60 tool calls / minute.
const hits = new Map<string, number[]>();
function limited(key: string): boolean {
  const now = Date.now();
  const arr = (hits.get(digest(key).toString("hex")) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(digest(key).toString("hex"), arr);
  return arr.length > 60;
}

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg: Rpc, req: Request): Promise<unknown | null> {
  const { id, method } = msg;
  if (id === undefined) return null; // notification: no response
  switch (method) {
    case "initialize":
      return ok(id, { protocolVersion: PROTOCOL, capabilities: { tools: { listChanged: false } }, serverInfo: { name: "market-intelligence", version: "1.0.0" }, instructions: "Read-only access to Market Intelligence's India macro analytics. Figures are heuristic/descriptive, not investment advice." });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, { tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })) });
    case "tools/call": {
      const auth = authorised(req);
      if (!auth.ok) return err(id, -32001, "Unauthorized: valid API key required for tools/call (X-API-Key header)");
      if (limited(auth.key)) return err(id, -32002, "Rate limit exceeded (60 calls/minute)");
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return err(id, -32602, `Unknown tool: ${msg.params?.name}`);
      try {
        const out = await tool.run(msg.params?.arguments ?? {});
        return ok(id, { content: [{ type: "text", text: JSON.stringify(out) }] });
      } catch (e) {
        return ok(id, { isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : "tool failed" }] });
      }
    }
    default:
      return err(id, -32601, `Method not found: ${method}`);
  }
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(err(null, -32700, "Parse error"), { status: 400 });
  }
  const batch = Array.isArray(body);
  const results = (await Promise.all((batch ? (body as Rpc[]) : [body as Rpc]).map((m) => handle(m, req)))).filter((r) => r !== null);
  if (!results.length) return new NextResponse(null, { status: 202 });
  return NextResponse.json(batch ? results : results[0]);
}

export async function GET() {
  return NextResponse.json({ name: "market-intelligence MCP", transport: "Streamable HTTP (POST JSON-RPC)", tools: TOOLS.map((t) => t.name), auth: "X-API-Key for tools/call" });
}
