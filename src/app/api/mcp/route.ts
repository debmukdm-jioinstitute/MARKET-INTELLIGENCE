import { authErrorForTool, resolveMcpCallContext } from "@/lib/mcp/context";
import { TOOLS } from "@/lib/mcp/tools";
import { createHash } from "crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * MCP server (Streamable HTTP). Public market tools need MCP_API_KEYS.
 * Account tools need mi_sign_in + X-MI-Session (or Bearer session token).
 */

const PROTOCOL = "2025-03-26";
const digest = (s: string) => createHash("sha256").update(s).digest();

function isApiKeyConfigured(): boolean {
  return (process.env.MCP_API_KEYS ?? "").split(",").some((k) => k.trim());
}

// Best-effort per-key rate limit (per serverless instance): 60 tool calls / minute.
const hits = new Map<string, number[]>();
function limited(rateKey: string): boolean {
  const now = Date.now();
  const arr = (hits.get(digest(rateKey).toString("hex")) ?? []).filter((t) => now - t < 60_000);
  arr.push(now);
  hits.set(digest(rateKey).toString("hex"), arr);
  return arr.length > 60;
}

function rateLimitKey(ctx: ReturnType<typeof resolveMcpCallContext>): string {
  return ctx.user?.email ?? ctx.apiKey ?? "anon";
}

type Rpc = { jsonrpc?: string; id?: string | number | null; method?: string; params?: { name?: string; arguments?: Record<string, unknown> } };
const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg: Rpc, req: Request): Promise<unknown | null> {
  const { id, method } = msg;
  if (id === undefined) return null;
  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "market-intelligence", version: "2.1.0" },
        instructions:
          "Public tools need MCP API key. Account tools (portfolio, alerts, OptionStrat, algo desk, assistant, admin) need mi_sign_in then X-MI-Session header. Figures are descriptive, not investment advice.",
      });
    case "ping":
      return ok(id, {});
    case "tools/list":
      return ok(id, {
        tools: TOOLS.map(({ name, title, category, description, inputSchema, access }) => ({
          name,
          title,
          description,
          inputSchema,
          annotations: {
            readOnlyHint: access !== "auth",
            title,
            ...(access && access !== "public" ? { destructiveHint: false } : {}),
          },
          _meta: { category, access: access ?? "public" },
        })),
      });
    case "tools/call": {
      const tool = TOOLS.find((t) => t.name === msg.params?.name);
      if (!tool) return err(id, -32602, `Unknown tool: ${msg.params?.name}`);

      const ctx = resolveMcpCallContext(req);
      const access = tool.access ?? "public";
      const authErr = authErrorForTool(access, ctx);
      if (authErr) return err(id, -32001, authErr);

      const rlKey = rateLimitKey(ctx);
      if (limited(rlKey)) return err(id, -32002, "Rate limit exceeded (60 calls/minute)");

      try {
        const out = await tool.run(msg.params?.arguments ?? {}, ctx);
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
  return NextResponse.json({
    name: "market-intelligence MCP",
    transport: "Streamable HTTP (POST JSON-RPC)",
    tools: TOOLS.map((t) => ({ name: t.name, access: t.access ?? "public" })),
    auth: {
      publicTools: "X-API-Key or Authorization: Bearer <MCP_API_KEY>",
      accountTools: "mi_sign_in → X-MI-Session: <sessionToken> (Bearer also accepted if not an API key)",
      apiKeysConfigured: isApiKeyConfigured(),
    },
  });
}
