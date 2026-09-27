import { authorizationServerMetadata } from "@/lib/mcp/oauth/metadata";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(authorizationServerMetadata(), {
    headers: { "Cache-Control": "public, max-age=300" },
  });
}
