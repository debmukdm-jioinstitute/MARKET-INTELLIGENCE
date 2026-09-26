import { GOOGLE_SANS_FONT_STACK } from "@/lib/typography";
import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function charBoxes(value: string, max: number): string {
  const chars = value.toUpperCase().padEnd(max, " ").slice(0, max).split("");
  return chars
    .map((c) => `<span class="box">${c.trim() ? esc(c) : "&nbsp;"}</span>`)
    .join("");
}

/** Printable / downloadable HTML onboarding form (Market Intelligence branding). */
export function renderOnboardingFormHtml(model: OnboardingFormModel): string {
  const featuresBySection = new Map<string, OnboardingFormModel["productFeatures"]>();
  for (const f of model.productFeatures) {
    const list = featuresBySection.get(f.section) ?? [];
    list.push(f);
    featuresBySection.set(f.section, list);
  }

  const featureRows = [...featuresBySection.entries()]
    .map(([section, items]) => {
      const rows = items
        .map(
          (f) => `<tr>
        <td>${esc(f.group)}</td>
        <td><strong>${esc(f.label)}</strong>${f.badge ? ` <span class="pill">${esc(f.badge)}</span>` : ""}</td>
        <td class="muted">${esc(f.href)}</td>
        <td>${esc(f.description)}</td>
      </tr>`,
        )
        .join("");
      return `<tr class="section-head"><td colspan="4">${esc(section)}</td></tr>${rows}`;
    })
    .join("");

  const serviceRows = model.subscribedServices
    .map(
      (s) => `<tr>
      <td>${esc(s.name)}</td>
      <td>${esc(s.description)}</td>
      <td>${esc(s.status)}</td>
    </tr>`,
    )
    .join("");

  const capRows = model.platformCapabilities
    .map(
      (c) => `<tr>
      <td>${esc(c.label)}</td>
      <td>${c.enabled ? "Enabled" : "Disabled (admin)"}</td>
    </tr>`,
    )
    .join("");

  const disclaimerBlocks = model.disclaimers
    .map((d) => `<div class="disc"><strong>${esc(d.title)}.</strong> ${esc(d.body)}</div>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Customer Onboarding Form — ${esc(model.customer.name)}</title>
  <style>
    * { box-sizing: border-box; }
    body { margin: 0; padding: 24px; font-family: ${GOOGLE_SANS_FONT_STACK}; font-size: 11px; line-height: 1.45; color: #202124; background: #fff; }
    .sheet { max-width: 920px; margin: 0 auto; border: 2px solid #1a73e8; }
    .head { display: flex; justify-content: space-between; align-items: flex-start; padding: 16px 20px; border-bottom: 3px solid #1a73e8; }
    .brand { font-size: 20px; font-weight: 700; color: #1a73e8; }
    .brand sub { display: block; font-size: 10px; font-weight: 600; color: #5f6368; letter-spacing: 0.08em; text-transform: uppercase; }
    .title { text-align: right; font-size: 13px; font-weight: 700; color: #1a73e8; }
    .bar { background: #1a73e8; color: #fff; font-weight: 700; font-size: 10px; letter-spacing: 0.06em; text-transform: uppercase; padding: 6px 12px; }
    .block { padding: 14px 16px; border-bottom: 1px solid #dadce0; }
    .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 24px; }
    label { display: block; font-size: 9px; font-weight: 700; color: #5f6368; text-transform: uppercase; margin-bottom: 4px; }
    .boxes { display: flex; flex-wrap: wrap; gap: 2px; }
    .box { display: inline-flex; align-items: center; justify-content: center; width: 14px; height: 18px; border: 1px solid #80868b; font-size: 10px; font-weight: 600; }
    .val { font-size: 12px; font-weight: 600; }
    table { width: 100%; border-collapse: collapse; font-size: 10px; }
    th, td { border: 1px solid #dadce0; padding: 6px 8px; vertical-align: top; text-align: left; }
    th { background: #e8f0fe; color: #174ea6; font-size: 9px; text-transform: uppercase; }
    tr.section-head td { background: #f1f3f4; font-weight: 700; color: #1a73e8; }
    .muted { color: #5f6368; font-size: 9px; }
    .pill { display: inline-block; background: #e8f0fe; color: #174ea6; font-size: 8px; font-weight: 700; padding: 1px 5px; border-radius: 4px; }
    .disc { margin-bottom: 8px; }
    .undertaking { margin-top: 12px; padding: 10px; border: 1px solid #1a73e8; background: #f8fbff; }
    .sig { margin-top: 20px; display: flex; justify-content: space-between; }
    .foot { font-size: 9px; color: #5f6368; padding: 10px 16px; }
    @media print { body { padding: 0; } .sheet { border-width: 1px; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div class="brand">Market Intelligence<sub>getmarketintelligence.in</sub></div>
      <div class="title">Customer Onboarding Form<br/>Part I — Account &amp; Service Schedule<br/>
        <span style="font-weight:400;font-size:10px;color:#5f6368">Catalog ${esc(model.catalogVersion)} · Generated ${esc(formatDate(model.generatedAt))}</span>
      </div>
    </div>

    <div class="bar">Instructions</div>
    <div class="block" style="font-size:10px">
      This document is auto-generated from your account profile and the live product catalog. When new features ship in the portal navigation, regenerate this form to receive an updated schedule. Educational use only — not a brokerage account opening form.
    </div>

    <div class="bar">Applicant details</div>
    <div class="block grid2">
      <div><label>Customer ID</label><div class="val">${esc(model.customer.customerId)}</div></div>
      <div><label>Account opened</label><div class="val">${esc(formatDate(model.customer.accountOpenedAt))}</div></div>
      <div><label>Full name</label><div class="boxes">${charBoxes(model.customer.name, 28)}</div></div>
      <div><label>Email</label><div class="val">${esc(model.customer.email)}</div></div>
      <div><label>Privacy policy accepted</label><div class="val">${esc(formatDate(model.customer.privacyAcceptedAt))}</div></div>
      <div><label>Account type</label><div class="val">Individual · ${esc(model.customer.role)} · Free beta</div></div>
    </div>

    <div class="bar">Subscribed services (your plan)</div>
    <div class="block">
      <table>
        <thead><tr><th>Service</th><th>Description</th><th>Status</th></tr></thead>
        <tbody>${serviceRows}</tbody>
      </table>
    </div>

    <div class="bar">Product feature catalog (portal modules)</div>
    <div class="block">
      <table>
        <thead><tr><th>Module group</th><th>Feature</th><th>Route</th><th>Description</th></tr></thead>
        <tbody>${featureRows}</tbody>
      </table>
    </div>

    <div class="bar">Platform capabilities (feature flags)</div>
    <div class="block">
      <table>
        <thead><tr><th>Capability</th><th>Status</th></tr></thead>
        <tbody>${capRows}</tbody>
      </table>
    </div>

    <div class="bar">Disclaimers &amp; undertakings</div>
    <div class="block">
      ${disclaimerBlocks}
      <div class="undertaking">
        <strong>Undertaking.</strong> I confirm that the information above reflects my Market Intelligence account at the time of generation. I have read the Privacy Policy (${esc(model.legalLinks.privacy)}) and Terms (${esc(model.legalLinks.terms)}). I understand this platform does not provide personalised investment advice.
        <div class="sig">
          <span><strong>Customer:</strong> ${esc(model.customer.name)}</span>
          <span><strong>Date:</strong> ${esc(formatDate(model.generatedAt))}</span>
        </div>
      </div>
    </div>

    <div class="foot">
      Market Intelligence · Auto-generated onboarding schedule · ${esc(model.siteUrl)} · Do not submit to a bank — for your records only.
    </div>
  </div>
</body>
</html>`;
}

export function downloadOnboardingFormHtml(model: OnboardingFormModel, filenameBase?: string): void {
  const html = renderOnboardingFormHtml(model);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (filenameBase ?? model.customer.customerId).replace(/[^a-zA-Z0-9-_]/g, "_");
  a.href = url;
  a.download = `market-intelligence-onboarding-${safe}-${model.catalogVersion}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
