import { redirectUriMatchesRegistered } from "@/lib/mcp/oauth/constants";
import { oauthConsentHtml } from "@/lib/mcp/oauth/consent-html";
import { issueAuthCode, parseClientId } from "@/lib/mcp/oauth/crypto";
import { sessionFromToken } from "@/lib/mcp/context";
import { MCP_PAID_REQUIRED_MESSAGE } from "@/lib/mcp/paid-access";
import { getProEntitlement, isProUser } from "@/lib/payments/pro-entitlement";
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

async function consentState(req: Request, redirectUri: string) {
  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(/mi_session=([^;]+)/);
  const user = sessionFromToken(cookieMatch ? decodeURIComponent(cookieMatch[1]) : null);
  const loginNextUrl = `https://getmarketintelligence.in/login?next=${encodeURIComponent(redirectUri)}`;
  if (!user) {
    return { loggedIn: false, paid: false, loginNextUrl };
  }
  const ent = await getProEntitlement(user.email);
  return { loggedIn: true, paid: isProUser(user, ent), loginNextUrl };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const p = readAuthParams(url);
  const err = validateAuthParams(p);
  if (err) return badRequest(err);

  const state = await consentState(req, url.toString());
  const html = oauthConsentHtml(
    {
      response_type: p.responseType,
      client_id: p.clientId,
      redirect_uri: p.redirectUri,
      state: p.state,
      code_challenge: p.codeChallenge,
      code_challenge_method: p.codeChallengeMethod,
      scope: p.scope,
    },
    state,
  );
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

  const cookieHeader = req.headers.get("cookie") ?? "";
  const cookieMatch = cookieHeader.match(/mi_session=([^;]+)/);
  const user = sessionFromToken(cookieMatch ? decodeURIComponent(cookieMatch[1]) : null);
  if (!user) return badRequest("Sign in on getmarketintelligence.in before allowing Claude access.");
  const ent = await getProEntitlement(user.email);
  if (!isProUser(user, ent)) return badRequest(MCP_PAID_REQUIRED_MESSAGE);

  const code = issueAuthCode({
    clientId: p.clientId,
    redirectUri: p.redirectUri,
    codeChallenge: p.codeChallenge,
    exp: Date.now() + 10 * 60 * 1000,
    user: user ?? undefined,
  });

  const dest = new URL(p.redirectUri);
  dest.searchParams.set("code", code);
  if (p.state) dest.searchParams.set("state", p.state);
  return NextResponse.redirect(dest.toString(), 302);
}
