import { authErrorForTool, resolveMcpCallContext } from "@/lib/mcp/context";
import { clientIp, mcpRateLimited, rateLimitCap, rateLimitKey } from "@/lib/mcp/rate-limit";
import { CLAUDE_CONNECTOR } from "@/lib/mcp/connector-public";
import { authorizationServerMetadata } from "@/lib/mcp/oauth/metadata";
import { TOOLS } from "@/lib/mcp/tools";
import { MCP_PROMPTS, getMcpPrompt } from "@/lib/mcp/prompts";
import { MCP_RESOURCES, readMcpResource } from "@/lib/mcp/resources";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/**
 * MCP server (Streamable HTTP). Public market tools are open (IP rate limit).
 * Account tools need mi_sign_in + X-MI-Session. Optional MCP_API_KEYS raise limits only.
 * Upgraded to protocol 2025-06-18, version 2.4.0 with prompts, resources, outputSchema, and cursor pagination.
 */

const PROTOCOL = "2025-06-18";
const SERVER_VERSION = "2.4.0";
const TOOL_TIMEOUT_MS = 25_000;

type Rpc = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: {
    name?: string;
    uri?: string;
    arguments?: Record<string, unknown>;
    cursor?: string;
  };
};

const ok = (id: Rpc["id"], result: unknown) => ({ jsonrpc: "2.0", id: id ?? null, result });
const err = (id: Rpc["id"], code: number, message: string) => ({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });

async function handle(msg: Rpc, req: Request): Promise<unknown | null> {
  const { id, method } = msg;
  if (id === undefined) return null;
  switch (method) {
    case "initialize":
      return ok(id, {
        protocolVersion: PROTOCOL,
        capabilities: {
          tools: { listChanged: true },
          prompts: { listChanged: false },
          resources: { listChanged: false, subscribe: false },
        },
        serverInfo: { name: "market-intelligence", version: SERVER_VERSION },
        instructions:
          "Plug-and-play: public market tools need no API key. Composite tools (get_market_overview, get_research_pack) combine multi-step queries into a single call. For portfolio, OptionStrat, alerts, etc., call mi_sign_in then pass X-MI-Session. Descriptive data only, not investment advice.",
      });
    case "ping":
      return ok(id, {});
    case "tools/list": {
      const cursorStr = msg.params?.cursor;
      const cursorOffset = cursorStr ? Math.max(0, parseInt(cursorStr, 10) || 0) : 0;
      const limit = 100;
      const paged = TOOLS.slice(cursorOffset, cursorOffset + limit);
      const nextOffset = cursorOffset + limit;
      const nextCursor = nextOffset < TOOLS.length ? String(nextOffset) : undefined;

      return ok(id, {
        tools: paged.map(({ name, title, category, description, inputSchema, outputSchema, access }) => ({
          name,
          title,
          description,
          inputSchema,
          ...(outputSchema ? { outputSchema } : {}),
          annotations: {
            readOnlyHint: access !== "auth",
            title,
            ...(access && access !== "public" ? { destructiveHint: false } : {}),
          },
          _meta: { category, access: access ?? "public" },
        })),
        ...(nextCursor ? { nextCursor } : {}),
      });
    }
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

      const t0 = Date.now();
      const caller = ctx.user ? `user:${ctx.user.email}` : ctx.apiKey ? "api-key" : ctx.oauthAccess ? "oauth" : `ip:${clientIp(req)}`;

      const timeoutPromise = new Promise<{ status: string; reason: string; source: string }>((resolve) => {
        setTimeout(() => {
          resolve({
            status: "unavailable",
            reason: `Tool execution deadline exceeded (${TOOL_TIMEOUT_MS / 1000}s limit)`,
            source: tool.name,
          });
        }, TOOL_TIMEOUT_MS);
      });

      try {
        const out = await Promise.race([
          tool.run(msg.params?.arguments ?? {}, ctx),
          timeoutPromise,
        ]);
        const durationMs = Date.now() - t0;
        console.log(
          JSON.stringify({
            mcp: {
              tool: tool.name,
              durationMs,
              ok: true,
              access,
              caller,
            },
          }),
        );
        return ok(id, { content: [{ type: "text", text: JSON.stringify(out) }] });
      } catch (e) {
        const durationMs = Date.now() - t0;
        console.log(
          JSON.stringify({
            mcp: {
              tool: tool.name,
              durationMs,
              ok: false,
              access,
              caller,
              error: e instanceof Error ? e.message : String(e),
            },
          }),
        );
        return ok(id, { isError: true, content: [{ type: "text", text: e instanceof Error ? e.message : "tool failed" }] });
      }
    }
    case "prompts/list":
      return ok(id, {
        prompts: MCP_PROMPTS.map((p) => ({
          name: p.name,
          description: p.description,
          arguments: p.arguments,
        })),
      });
    case "prompts/get": {
      const name = msg.params?.name;
      if (!name) return err(id, -32602, "Prompt name is required");
      const prompt = getMcpPrompt(name, msg.params?.arguments);
      if (!prompt) return err(id, -32602, `Unknown prompt: ${name}`);
      return ok(id, prompt);
    }
    case "resources/list":
      return ok(id, {
        resources: MCP_RESOURCES.map((r) => ({
          uri: r.uri,
          name: r.name,
          description: r.description,
          mimeType: r.mimeType,
        })),
      });
    case "resources/read": {
      const uri = msg.params?.uri;
      if (!uri) return err(id, -32602, "Resource uri is required");
      const resource = readMcpResource(uri);
      if (!resource) return err(id, -32602, `Resource not found: ${uri}`);
      return ok(id, { contents: [resource] });
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
    protocolVersion: PROTOCOL,
    version: SERVER_VERSION,
    transport: "Streamable HTTP (POST JSON-RPC)",
    claudeConnector: CLAUDE_CONNECTOR,
    oauth: authorizationServerMetadata(),
    toolsCount: TOOLS.length,
    tools: TOOLS.map((t) => ({ name: t.name, access: t.access ?? "public" })),
    prompts: MCP_PROMPTS.map((p) => ({ name: p.name, description: p.description })),
    resources: MCP_RESOURCES.map((r) => ({ uri: r.uri, name: r.name })),
    auth: {
      publicTools: "No API key — Cursor works with URL only; claude.ai uses OAuth DCR + one-time consent.",
      accountTools: "tools/call mi_sign_in → X-MI-Session: <sessionToken>",
      optionalApiKey: "MCP_API_KEYS optional — higher rate limit for automation",
    },
    changelog:
      "v2.4.0: Protocol 2025-06-18, outputSchema support, composite tools (get_market_overview, get_research_pack), MCP prompts & resources, 25s timeouts, DB snapshot caching, slimmed payloads.",
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
