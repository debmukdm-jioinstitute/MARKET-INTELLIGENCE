import { authErrorForTool, resolveMcpCallContext } from "@/lib/mcp/context";
import { clientIp, mcpRateLimited, rateLimitCap, rateLimitKey } from "@/lib/mcp/rate-limit";
import { CLAUDE_CONNECTOR } from "@/lib/mcp/connector-public";
import { authorizationServerMetadata } from "@/lib/mcp/oauth/metadata";
import { TOOLS } from "@/lib/mcp/tools";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * MCP server (Streamable HTTP). Public market tools are open (IP rate limit).
 * Account tools need mi_sign_in + X-MI-Session. Optional MCP_API_KEYS raise limits only.
 */

const PROTOCOL = "2025-03-26";

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
        serverInfo: { name: "market-intelligence", version: "2.3.0" },
        instructions:
          "Plug-and-play: public market tools need no API key. For portfolio, OptionStrat, alerts, etc., call mi_sign_in then pass X-MI-Session. Descriptive data only, not investment advice.",
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

      const rlKey = rateLimitKey(req, ctx);
      if (mcpRateLimited(rlKey, rateLimitCap(ctx))) {
        return err(id, -32002, "Rate limit exceeded — wait a minute or sign in with mi_sign_in for a higher cap.");
      }
      if (tool.name === "mi_sign_in" && mcpRateLimited(`signin:${clientIp(req)}`, 8)) {
        return err(id, -32002, "Too many sign-in attempts — try again in a minute.");
      }

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
    claudeConnector: CLAUDE_CONNECTOR,
    oauth: authorizationServerMetadata(),
    tools: TOOLS.map((t) => ({ name: t.name, access: t.access ?? "public" })),
    auth: {
      publicTools: "No API key — Cursor works with URL only; claude.ai uses OAuth DCR + one-time consent.",
      accountTools: "tools/call mi_sign_in → X-MI-Session: <sessionToken>",
      optionalApiKey: "MCP_API_KEYS optional — higher rate limit for automation",
    },
  });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, X-API-Key, X-MI-Session",
    },
  });
}
