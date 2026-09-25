import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const UPSTREAM = (process.env.AI_TRADER_API_URL || "http://127.0.0.1:5050").replace(/\/$/, "");

function unauthorized() {
  return NextResponse.json({ error: "Sign in required" }, { status: 401 });
}

async function proxy(req: Request, pathSegments: string[]) {
  const user = await getSessionUser();
  if (!user) return unauthorized();

  const subpath = pathSegments.join("/");
  const url = new URL(req.url);
  const target = `${UPSTREAM}/${subpath}${url.search}`;

  const isStream = subpath === "api/stream" && req.method === "GET";

  const headers: HeadersInit = {};
  const contentType = req.headers.get("content-type");
  if (contentType) headers["Content-Type"] = contentType;
  if (isStream) headers.Accept = "text/event-stream";

  const init: RequestInit = {
    method: req.method,
    headers,
    cache: "no-store",
  };

  if (req.method !== "GET" && req.method !== "HEAD") {
    init.body = await req.text();
  }

  let upstreamRes: Response;
  try {
    upstreamRes = await fetch(target, init);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      {
        error: "Algo desk backend unreachable",
        detail: msg,
        hint: "Start the AI-trader Flask API (services/ai-trader) and set AI_TRADER_API_URL.",
      },
      { status: 502 },
    );
  }

  if (isStream && upstreamRes.body) {
    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    });
  }

  const body = await upstreamRes.arrayBuffer();
  const outHeaders = new Headers();
  const ct = upstreamRes.headers.get("content-type");
  if (ct) outHeaders.set("Content-Type", ct);

  return new Response(body, { status: upstreamRes.status, headers: outHeaders });
}

type Ctx = { params: Promise<{ path: string[] }> };

export async function GET(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function POST(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PUT(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function DELETE(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}

export async function PATCH(req: Request, ctx: Ctx) {
  const { path } = await ctx.params;
  return proxy(req, path);
}
