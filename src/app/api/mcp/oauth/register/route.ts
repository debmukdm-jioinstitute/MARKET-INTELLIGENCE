import { isAllowedRedirectUri } from "@/lib/mcp/oauth/constants";
import { issueClientId } from "@/lib/mcp/oauth/crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type RegisterBody = {
  redirect_uris?: string[];
  client_name?: string;
  token_endpoint_auth_method?: string;
  grant_types?: string[];
  response_types?: string[];
};

export async function POST(req: Request) {
  let body: RegisterBody;
  try {
    body = (await req.json()) as RegisterBody;
  } catch {
    return NextResponse.json({ error: "invalid_client_metadata" }, { status: 400 });
  }

  const redirectUris = body.redirect_uris?.filter(Boolean) ?? [];
  if (!redirectUris.length || !redirectUris.every(isAllowedRedirectUri)) {
    return NextResponse.json({ error: "invalid_redirect_uri" }, { status: 400 });
  }

  const now = Math.floor(Date.now() / 1000);
  const clientId = issueClientId({
    redirectUris,
    clientName: body.client_name,
    iat: now,
  });

  return NextResponse.json(
    {
      client_id: clientId,
      client_id_issued_at: now,
      redirect_uris: redirectUris,
      grant_types: body.grant_types?.length ? body.grant_types : ["authorization_code"],
      response_types: body.response_types?.length ? body.response_types : ["code"],
      token_endpoint_auth_method: "none",
    },
    {
      status: 201,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type",
      },
    },
  );
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
