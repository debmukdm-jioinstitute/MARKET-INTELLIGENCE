import { isWorldMonitorProxiedApiPath } from "@/lib/worldmonitor/api-path-allowlist";
import { NextRequest, NextResponse } from "next/server";

const UPSTREAM =
  process.env.WORLDMONITOR_UPSTREAM_ORIGIN?.trim() || "https://www.worldmonitor.app";

const SKIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "content-length",
  "origin",
  "referer",
  "x-forwarded-for",
  "x-forwarded-host",
  "x-forwarded-proto",
  "x-real-ip",
]);

function upstreamBase(): string {
  return UPSTREAM.replace(/\/$/, "");
}

function forwardRequestHeaders(req: NextRequest): Headers {
  const out = new Headers();
  out.set("User-Agent", "MarketIntelligence-WorldMonitor-Proxy/1.0");
  req.headers.forEach((value, key) => {
    if (SKIP_REQUEST_HEADERS.has(key.toLowerCase())) return;
    out.set(key, value);
  });
  return out;
}

function passthroughResponseHeaders(upstream: Response): Headers {
  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (lower === "content-encoding" || lower === "transfer-encoding") return;
    out.set(key, value);
  });
  return out;
}

export async function proxyWorldMonitorApi(
  req: NextRequest,
  pathSegments: string[],
): Promise<NextResponse> {
  const subPath = pathSegments.join("/");
  if (!isWorldMonitorProxiedApiPath(subPath)) {
    return NextResponse.json({ error: "Not a World Monitor API path" }, { status: 404 });
  }

  const search = req.nextUrl.search;
  const target = `${upstreamBase()}/api/${subPath}${search}`;
  const method = req.method.toUpperCase();
  const hasBody = method !== "GET" && method !== "HEAD";

  let upstream: Response;
  try {
    upstream = await fetch(target, {
      method,
      headers: forwardRequestHeaders(req),
      body: hasBody ? await req.arrayBuffer() : undefined,
      cache: "no-store",
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers: passthroughResponseHeaders(upstream),
  });
}

export function worldMonitorApiOptionsResponse(): NextResponse {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
      "Access-Control-Allow-Headers":
        "Content-Type, Authorization, X-WorldMonitor-Key, X-Api-Key, X-Widget-Key, X-Pro-Key, X-WorldMonitor-Desktop-Timestamp, X-WorldMonitor-Desktop-Signature, Idempotency-Key, Mcp-Session-Id, MCP-Protocol-Version, Last-Event-ID",
      "Access-Control-Max-Age": "3600",
    },
  });
}
