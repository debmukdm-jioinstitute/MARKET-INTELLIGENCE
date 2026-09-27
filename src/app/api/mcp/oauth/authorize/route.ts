import { redirectUriMatchesRegistered } from "@/lib/mcp/oauth/constants";
import { oauthConsentHtml } from "@/lib/mcp/oauth/consent-html";
import { issueAuthCode, parseClientId } from "@/lib/mcp/oauth/crypto";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function badRequest(msg: string) {
  return NextResponse.json({ error: "invalid_request", error_description: msg }, { status: 400 });
}

function readAuthParams(url: URL) {
  return {
    responseType: url.searchParams.get("response_type") ?? "",
    clientId: url.searchParams.get("client_id") ?? "",
    redirectUri: url.searchParams.get("redirect_uri") ?? "",
    state: url.searchParams.get("state") ?? "",
    codeChallenge: url.searchParams.get("code_challenge") ?? "",
    codeChallengeMethod: url.searchParams.get("code_challenge_method") ?? "",
    scope: url.searchParams.get("scope") ?? "",
  };
}

function validateAuthParams(p: ReturnType<typeof readAuthParams>) {
  if (p.responseType !== "code") return "response_type must be code";
  if (!p.clientId || !p.redirectUri || !p.codeChallenge) return "missing required parameters";
  if (p.codeChallengeMethod !== "S256") return "code_challenge_method must be S256";
  const client = parseClientId(p.clientId);
  if (!client) return "invalid client_id";
  const allowed = client.redirectUris.some((r) => redirectUriMatchesRegistered(p.redirectUri, r));
  if (!allowed) return "redirect_uri not registered";
  return null;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = readAuthParams(url);
  const err = validateAuthParams(p);
  if (err) return badRequest(err);

  const html = oauthConsentHtml({
    response_type: p.responseType,
    client_id: p.clientId,
    redirect_uri: p.redirectUri,
    state: p.state,
    code_challenge: p.codeChallenge,
    code_challenge_method: p.codeChallengeMethod,
    scope: p.scope,
  });
  return new NextResponse(html, { headers: { "Content-Type": "text/html; charset=utf-8" } });
}

export async function POST(req: Request) {
  const form = await req.formData();
  const approve = form.get("approve");
  const p = {
    responseType: String(form.get("response_type") ?? ""),
    clientId: String(form.get("client_id") ?? ""),
    redirectUri: String(form.get("redirect_uri") ?? ""),
    state: String(form.get("state") ?? ""),
    codeChallenge: String(form.get("code_challenge") ?? ""),
    codeChallengeMethod: String(form.get("code_challenge_method") ?? ""),
    scope: String(form.get("scope") ?? ""),
  };

  if (approve !== "1") return badRequest("access denied");
  const err = validateAuthParams(p);
  if (err) return badRequest(err);

  const code = issueAuthCode({
    clientId: p.clientId,
    redirectUri: p.redirectUri,
    codeChallenge: p.codeChallenge,
    exp: Date.now() + 10 * 60 * 1000,
  });

  const dest = new URL(p.redirectUri);
  dest.searchParams.set("code", code);
  if (p.state) dest.searchParams.set("state", p.state);
  return NextResponse.redirect(dest.toString(), 302);
}
