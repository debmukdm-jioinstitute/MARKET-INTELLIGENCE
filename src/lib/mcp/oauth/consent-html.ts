import { GOOGLE_SANS_FONT_STACK } from "@/lib/typography";
import { MCP_PAID_PLANS_COPY, MCP_PRICING_URL } from "@/lib/mcp/paid-access";

export type OAuthConsentState = {
  loggedIn: boolean;
  paid: boolean;
  loginNextUrl: string;
};

export function oauthConsentHtml(fields: Record<string, string>, state: OAuthConsentState): string {
  const hidden = Object.entries(fields)
    .map(([k, v]) => `<input type="hidden" name="${k}" value="${escapeAttr(v)}" />`)
    .join("");

  let body = "";
  let action = "";

  if (!state.loggedIn) {
    body = `<p>Sign in on Market Intelligence first, then subscribe to a paid plan (Daily pass, Plus, or Pro). After that, return here and click Allow access.</p>
      <p><a href="${escapeAttr(state.loginNextUrl)}" style="color:#2563eb;font-weight:600;">Sign in →</a></p>`;
    action = `<a href="${escapeAttr(state.loginNextUrl)}" style="display:block;text-align:center;padding:0.75rem 1rem;border-radius:0.5rem;background:#2563eb;color:#fff;text-decoration:none;font-weight:600;">Sign in to continue</a>`;
  } else if (!state.paid) {
    body = `<p>Signed in, but Claude MCP needs an active paid plan.</p>
      <p>${escapeAttr(MCP_PAID_PLANS_COPY)}</p>`;
    action = `<a href="${escapeAttr(MCP_PRICING_URL)}" style="display:block;text-align:center;padding:0.75rem 1rem;border-radius:0.5rem;background:#CC785C;color:#fff;text-decoration:none;font-weight:600;">View pricing</a>`;
  } else {
    body = `<p>Claude will read live market data (indices, macro, scanners, research) for your paid plan. Read-only — no trades. Portfolio tools still need <strong>mi_sign_in</strong> inside Claude.</p>`;
    action = `<form method="post">
      ${hidden}
      <input type="hidden" name="approve" value="1" />
      <button type="submit">Allow access</button>
    </form>`;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Allow Claude · Market Intelligence</title>
  <style>
    body { font-family: ${GOOGLE_SANS_FONT_STACK}; margin: 0; background: #f8fafc; color: #0f172a; }
    main { max-width: 28rem; margin: 3rem auto; padding: 1.5rem; background: #fff; border: 1px solid #e2e8f0; border-radius: 1rem; }
    h1 { font-size: 1.25rem; margin: 0 0 0.75rem; }
    p { font-size: 0.9375rem; line-height: 1.5; color: #475569; margin: 0 0 1rem; }
    button { width: 100%; padding: 0.75rem 1rem; border: 0; border-radius: 0.5rem; background: #CC785C; color: #fff; font-size: 0.9375rem; font-weight: 600; cursor: pointer; font-family: inherit; }
    button:hover { opacity: 0.92; }
    .logo { font-size: 0.75rem; letter-spacing: 0.12em; text-transform: uppercase; color: #2563eb; margin-bottom: 0.5rem; }
  </style>
</head>
<body>
  <main>
    <p class="logo">Market Intelligence · MCP</p>
    <h1>Allow Claude to connect?</h1>
    ${body}
    ${action}
  </main>
</body>
</html>`;
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");
}
