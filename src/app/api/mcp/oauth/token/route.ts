import { redirectUriMatchesRegistered } from "@/lib/mcp/oauth/constants";
import {
  issueAccessToken,
  issueRefreshToken,
  parseAuthCode,
  parseClientId,
  parseRefreshToken,
  verifyPkceS256,
} from "@/lib/mcp/oauth/crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

async function readForm(req: Request): Promise<Record<string, string>> {
  const ct = req.headers.get("content-type") ?? "";
  const text = await req.text();
  if (ct.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(text));
  }
  try {
    const j = JSON.parse(text) as Record<string, string>;
    return j;
  } catch {
    return {};
  }
}

function tokenJson(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, { status });
}

export async function POST(req: Request) {
  const body = await readForm(req);
  const grantType = body.grant_type ?? "";

  if (grantType === "authorization_code") {
    const code = body.code ?? "";
    const redirectUri = body.redirect_uri ?? "";
    const clientId = body.client_id ?? "";
    const codeVerifier = body.code_verifier ?? "";

    const record = parseAuthCode(code);
    if (!record) return tokenJson({ error: "invalid_grant" }, 400);
    if (record.clientId !== clientId) return tokenJson({ error: "invalid_grant" }, 400);
    if (!redirectUriMatchesRegistered(redirectUri, record.redirectUri)) {
      return tokenJson({ error: "invalid_grant" }, 400);
    }
    if (!codeVerifier || !verifyPkceS256(codeVerifier, record.codeChallenge)) {
      return tokenJson({ error: "invalid_grant" }, 400);
    }
    const client = parseClientId(clientId);
    if (!client) return tokenJson({ error: "invalid_client" }, 401);

    const scope = "mcp:tools";
    const expAccess = Date.now() + 60 * 60 * 1000;
    const accessToken = issueAccessToken({ clientId, scope, exp: expAccess, user: record.user });

    return tokenJson({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      scope,
    });
  }

  if (grantType === "refresh_token") {
    const refresh = body.refresh_token ?? "";
    const record = parseRefreshToken(refresh);
    if (!record) return tokenJson({ error: "invalid_grant" }, 400);

    const expAccess = Date.now() + 60 * 60 * 1000;
    const accessToken = issueAccessToken({
      clientId: record.clientId,
      scope: record.scope,
      exp: expAccess,
      user: record.user,
    });
    const newRefresh = issueRefreshToken({
      clientId: record.clientId,
      scope: record.scope,
      exp: Date.now() + 30 * 24 * 60 * 60 * 1000,
      user: record.user,
    });

    return tokenJson({
      access_token: accessToken,
      token_type: "Bearer",
      expires_in: 3600,
      refresh_token: newRefresh,
      scope: record.scope,
    });
  }

  return tokenJson({ error: "unsupported_grant_type" }, 400);
}
