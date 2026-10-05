import { GOOGLE_SANS_FONT_FAMILY_CSS } from "@/lib/typography";
import { siteUrl } from "@/lib/seo/site-url";
import { latestBriefs } from "@/lib/brief/store";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export type ReengagementCustomer = {
  name?: string | null;
  email: string;
  created_at: string;
  last_login_at?: string | null;
};

export type FeatureHighlight = {
  key: string;
  title: string;
  badge: string;
  description: string;
  path: string;
};

export const REENGAGEMENT_FEATURES: FeatureHighlight[] = [
  {
    key: "ai_desk",
    title: "AI Research Desk & Stock Copilot",
    badge: "⚡ AI Intelligence",
    description: "Instant concall transcripts breakdown, annual report teardowns, and conversational valuation models in plain English.",
    path: "/research/ai-desk",
  },
  {
    key: "market_pulse",
    title: "Live Market Pulse & Smart Money Tracker",
    badge: "📊 Live Upstox Feed",
    description: "Track FII & DII flows, institutional bulk deals, option chain open interest, and real-time market breadth.",
    path: "/Home",
  },
  {
    key: "portfolio",
    title: "Portfolio Optimizer & Risk Attribution",
    badge: "🎯 Risk Engine",
    description: "Stress-test equity holdings against NIFTY 50, audit sector concentration risk, and simulate historical drawdowns.",
    path: "/portfolio",
  },
  {
    key: "alpha_league",
    title: "Alpha League Trading Arena",
    badge: "🏆 Quant Arena",
    description: "Backtest systematic trading algorithms, verify strategies on live NSE data, and climb the verified leaderboard.",
    path: "/alpha-league",
  },
  {
    key: "macro",
    title: "Macro Monitor & RBI Policy Transmission",
    badge: "🌐 Policy & Yields",
    description: "Monitor banking system liquidity, sovereign yield curves, credit growth, and sectoral macro transmission models.",
    path: "/macro",
  },
  {
    key: "reports",
    title: "Institutional Research & Consensus",
    badge: "📑 Analyst Coverage",
    description: "Browse consensus price targets, earnings revision momentum, and institutional equity research coverage notes.",
    path: "/research-reports",
  },
];

export function computeDaysInactive(customer: ReengagementCustomer): {
  days: number;
  hasEverLoggedIn: boolean;
  dateReference: Date;
} {
  const hasEverLoggedIn = Boolean(customer.last_login_at);
  const refString = customer.last_login_at || customer.created_at;
  const dateReference = new Date(refString);
  const diffMs = Date.now() - (isNaN(dateReference.getTime()) ? Date.now() : dateReference.getTime());
  const days = Math.max(1, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  return { days, hasEverLoggedIn, dateReference };
}

export async function getTodayMarketSummary(customUpdate?: string): Promise<{
  formattedDate: string;
  summaryText: string;
  sourceLabel: string;
}> {
  const formattedDate = new Intl.DateTimeFormat("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Asia/Kolkata",
  }).format(new Date());

  if (customUpdate && customUpdate.trim()) {
    return {
      formattedDate,
      summaryText: customUpdate.trim(),
      sourceLabel: "Curated Desk Note",
    };
  }

  try {
    const briefs = await latestBriefs(1);
    if (briefs.length > 0 && briefs[0].headline) {
      const b = briefs[0];
      const itemsText = b.items?.length
        ? b.items.slice(0, 2).map((it) => `• ${it.theme} (${it.stance}): ${it.text}`).join("\n")
        : "";
      return {
        formattedDate,
        summaryText: `${b.headline}${itemsText ? `\n\n${itemsText}` : ""}`.trim(),
        sourceLabel: "Intelligence Desk Brief",
      };
    }
  } catch {}

  return {
    formattedDate,
    summaryText:
      "Domestic benchmarks and sectoral rotations are active on your terminal today. Track institutional Smart Money inflows, breadth signals, and updated AI company filings.",
    sourceLabel: "Live Market Desk",
  };
}

export type RenderReengagementEmailOptions = {
  customer: ReengagementCustomer;
  customMarketUpdate?: string;
  includedFeatureKeys?: string[];
  customSubject?: string;
};

export async function renderReengagementEmail(opts: RenderReengagementEmailOptions): Promise<{
  subject: string;
  html: string;
  text: string;
  daysInactive: number;
  hasEverLoggedIn: boolean;
  formattedDate: string;
}> {
  const { customer, customMarketUpdate, includedFeatureKeys, customSubject } = opts;
  const site = siteUrl().replace(/\/$/, "");
  const { days, hasEverLoggedIn } = computeDaysInactive(customer);
  const { formattedDate, summaryText, sourceLabel } = await getTodayMarketSummary(customMarketUpdate);

  const firstName = customer.name?.trim() ? customer.name.trim().split(/\s+/)[0] : "";
  const daysText = `${days} ${days === 1 ? "day" : "days"}`;

  const defaultSubject = firstName
    ? `${firstName}, your Market Intelligence terminal is ready (${daysText} update)`
    : `Your Market Intelligence terminal is ready (${daysText} update)`;

  const subject = customSubject?.trim() || defaultSubject;

  const featuresToInclude = includedFeatureKeys && includedFeatureKeys.length > 0
    ? REENGAGEMENT_FEATURES.filter((f) => includedFeatureKeys.includes(f.key))
    : REENGAGEMENT_FEATURES;

  const inactivityParagraph = hasEverLoggedIn
    ? `It's been <strong style="color:#0f172a;font-weight:700;">${daysText}</strong> since your last session. While you were away, we've upgraded our quantitative engines, real-time institutional feeds, and AI copilot.`
    : `It's been <strong style="color:#0f172a;font-weight:700;">${daysText}</strong> since you created your account. Your dedicated market intelligence workspace is fully configured and ready for your first deep dive.`;

  const featuresHtml = featuresToInclude
    .map(
      (f) => `
      <div style="margin:14px 0;padding:20px 22px;background:linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.9) 100%);backdrop-filter:blur(16px);border:1px solid rgba(226,232,240,0.9);border-radius:16px;box-shadow:0 10px 24px -6px rgba(15,23,42,0.04), 0 2px 4px rgba(15,23,42,0.02), inset 0 1px 1px rgba(255,255,255,0.95);">
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
          <tr>
            <td valign="middle" align="left">
              <span style="display:inline-block;font-size:10.5px;font-weight:700;letter-spacing:0.4px;text-transform:uppercase;color:#1d4ed8;background:#eff6ff;padding:3.5px 10px;border-radius:100px;border:1px solid #bfdbfe;">
                ${esc(f.badge)}
              </span>
            </td>
            <td valign="middle" align="right">
              <a href="${esc(site)}${esc(f.path)}" style="font-size:12px;font-weight:700;color:#2563eb;text-decoration:none;">
                Explore tool &rarr;
              </a>
            </td>
          </tr>
        </table>
        <div style="margin:10px 0 4px;">
          <a href="${esc(site)}${esc(f.path)}" style="font-size:15.5px;font-weight:700;color:#0f172a;text-decoration:none;letter-spacing:-0.2px;">
            ${esc(f.title)} &rarr;
          </a>
        </div>
        <p style="margin:0;font-size:13px;line-height:1.6;color:#64748b;">
          ${esc(f.description)}
        </p>
      </div>`
    )
    .join("");

  const formattedUpdateHtml = summaryText
    .split("\n")
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 8px;font-size:13.5px;line-height:1.65;color:#334155;">${esc(p)}</p>`)
    .join("");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${esc(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#f8fafc;${GOOGLE_SANS_FONT_FAMILY_CSS};color:#0f172a;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
    Your terminal is ready. Today's live market update and personalized desk features are waiting.
  </div>

  <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:#f8fafc;padding:40px 16px;">
    <tr>
      <td align="center">
        <!-- Main Apple-style 3D Glass Container -->
        <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width:580px;background:#ffffff;border-radius:24px;border:1px solid rgba(226,232,240,0.85);overflow:hidden;box-shadow:0 30px 60px -15px rgba(15,23,42,0.08), 0 4px 12px -2px rgba(15,23,42,0.03), inset 0 1px 1px rgba(255,255,255,0.95);">
          
          <!-- Corporate Branding Header with Official Logo -->
          <tr>
            <td style="padding:28px 36px 22px;background:#ffffff;border-bottom:1px solid rgba(226,232,240,0.8);">
              <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%">
                <tr>
                  <td align="left" valign="middle">
                    <a href="${esc(site)}" style="text-decoration:none;display:inline-block;">
                      <img
                        src="${esc(site)}/logo.png"
                        alt="Market Intelligence"
                        width="180"
                        style="display:block;height:auto;max-width:180px;border:0;outline:none;"
                      />
                    </a>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:5px 12px;background:rgba(241,245,249,0.85);border:1px solid #e2e8f0;border-radius:100px;font-size:11.5px;color:#64748b;font-weight:600;letter-spacing:0.2px;">
                      ${esc(formattedDate)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Hero & Google Ad-Copy Inspired Statement -->
          <tr>
            <td style="padding:34px 36px 28px;">
              
              <!-- 3D Liquid Floating Inactivity Pill -->
              <div style="display:inline-block;padding:5px 14px;background:#eff6ff;border:1px solid #bfdbfe;border-radius:100px;box-shadow:0 2px 8px rgba(37,99,235,0.08);margin-bottom:18px;">
                <span style="font-size:11.5px;font-weight:700;color:#2563eb;letter-spacing:0.3px;">
                  ⏱ ${esc(daysText)} inactive · Desk briefing
                </span>
              </div>

              <!-- High-Impact Ad Headline -->
              <h1 style="margin:0 0 10px;font-size:25px;font-weight:700;color:#0f172a;line-height:1.25;letter-spacing:-0.5px;">
                ${firstName ? `${esc(firstName)}, your terminal is ready.` : "Your market terminal is ready."}
              </h1>

              <p style="margin:0 0 24px;font-size:14.5px;line-height:1.7;color:#475569;">
                ${inactivityParagraph}
              </p>

              <!-- Liquid Glass 3D Today's Market Update Box -->
              <div style="margin:24px 0 28px;padding:22px;background:linear-gradient(135deg, rgba(240,253,244,0.75) 0%, rgba(255,255,255,0.95) 100%);backdrop-filter:blur(16px);border:1px solid rgba(187,247,208,0.9);border-radius:18px;box-shadow:0 12px 28px -6px rgba(22,163,74,0.08), inset 0 1px 2px rgba(255,255,255,0.95);">
                <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin-bottom:12px;">
                  <tr>
                    <td valign="middle" align="left">
                      <table role="presentation" border="0" cellpadding="0" cellspacing="0">
                        <tr>
                          <td valign="middle" style="padding-right:7px;">
                            <span style="display:inline-block;width:8px;height:8px;background:#22c55e;border-radius:50%;box-shadow:0 0 0 3px rgba(34,197,94,0.25);"></span>
                          </td>
                          <td valign="middle">
                            <span style="font-size:11px;font-weight:800;letter-spacing:1px;text-transform:uppercase;color:#15803d;">
                              ${esc(sourceLabel)} · Live Pulse
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td valign="middle" align="right">
                      <a href="${esc(site)}/intelligence/brief" style="font-size:12px;font-weight:700;color:#16a34a;text-decoration:none;">
                        Full Brief &rarr;
                      </a>
                    </td>
                  </tr>
                </table>

                ${formattedUpdateHtml}

                <div style="margin-top:14px;padding-top:12px;border-top:1px solid rgba(187,247,208,0.6);">
                  <a href="${esc(site)}/Home" style="font-size:13px;font-weight:700;color:#15803d;text-decoration:none;">
                    View today's live Market Pulse & Smart Money Tracker &rarr;
                  </a>
                </div>
              </div>

              <!-- Section Subhead -->
              <div style="margin:30px 0 14px;">
                <p style="margin:0 0 4px;font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:1px;color:#64748b;">
                  Featured Modules
                </p>
                <h2 style="margin:0;font-size:17.5px;font-weight:700;color:#0f172a;letter-spacing:-0.3px;">
                  What's ready on your desk right now
                </h2>
              </div>

              <!-- 3D Feature Boxes -->
              ${featuresHtml}

              <!-- Apple-style Pill CTA Button with 3D Depth -->
              <div style="text-align:center;margin:38px 0 28px;">
                <a
                  href="${esc(site)}/login"
                  style="display:inline-block;background:linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);color:#ffffff;font-size:15.5px;font-weight:700;text-decoration:none;padding:15px 44px;border-radius:100px;box-shadow:0 12px 28px -4px rgba(37,99,235,0.4), inset 0 1px 1px rgba(255,255,255,0.4);letter-spacing:0.2px;"
                >
                  Log in now &rarr;
                </a>
                <p style="margin:12px 0 0;font-size:12px;color:#94a3b8;font-weight:500;">
                  Fast, seamless access to your personal intelligence workspace
                </p>
              </div>

              <!-- Corporate Founder Signature -->
              <div style="margin-top:36px;padding-top:22px;border-top:1px solid #e2e8f0;">
                <p style="margin:0 0 12px;font-size:13.5px;line-height:1.65;color:#475569;">
                  If you need a specific stock model, portfolio feed, or custom alert rule, simply reply directly to this note. I personally read and respond to every email.
                </p>
                <div style="font-size:14px;font-weight:700;color:#0f172a;">
                  Debabrata Mukherjee
                </div>
                <div style="font-size:12.5px;color:#64748b;margin-top:2px;">
                  Founder, Market Intelligence
                </div>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 36px;background:#f8fafc;border-top:1px solid #e2e8f0;text-align:center;">
              <p style="margin:0 0 8px;font-size:11.5px;color:#94a3b8;line-height:1.6;">
                You received this update because you have a registered account on <a href="${esc(site)}" style="color:#64748b;text-decoration:underline;">getmarketintelligence.in</a>.
              </p>
              <p style="margin:0;font-size:11.5px;color:#94a3b8;">
                <a href="${esc(site)}/Home" style="color:#64748b;text-decoration:none;margin:0 6px;">Terminal</a> ·
                <a href="${esc(site)}/research/ai-desk" style="color:#64748b;text-decoration:none;margin:0 6px;">AI Desk</a> ·
                <a href="${esc(site)}/portfolio" style="color:#64748b;text-decoration:none;margin:0 6px;">Portfolio</a> ·
                <a href="${esc(site)}/alpha-league" style="color:#64748b;text-decoration:none;margin:0 6px;">Alpha League</a> ·
                <a href="${esc(site)}/pricing" style="color:#64748b;text-decoration:none;margin:0 6px;">Plans</a> ·
                <a href="${esc(site)}/terms" style="color:#64748b;text-decoration:none;margin:0 6px;">Terms</a> ·
                <a href="${esc(site)}/privacy" style="color:#64748b;text-decoration:none;margin:0 6px;">Privacy</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const textLines: string[] = [
    `MARKET INTELLIGENCE`,
    `Personalized Desk Update · ${formattedDate}`,
    "",
    `Hi ${firstName || "there"},`,
    "",
    hasEverLoggedIn
      ? `It's been ${daysText} since you last logged in to your Market Intelligence platform.`
      : `It's been ${daysText} since you created your Market Intelligence account, and you haven't explored your workspace yet.`,
    "",
    `TODAY'S MARKET UPDATE (${formattedDate}):`,
    summaryText,
    `Live pulse link: ${site}/Home`,
    "",
    "FEATURED MODULES WAITING FOR YOU:",
    ...featuresToInclude.map(
      (f) => `• ${f.title} (${f.badge})\n  ${f.description}\n  Link: ${site}${f.path}\n`
    ),
    "LOG IN NOW:",
    `${site}/login`,
    "",
    "If you have questions or need specific data, just reply directly to this email.",
    "",
    "— Debabrata Mukherjee",
    "Founder, Market Intelligence",
  ];

  const text = textLines.join("\n");

  return {
    subject,
    html,
    text,
    daysInactive: days,
    hasEverLoggedIn,
    formattedDate,
  };
}
