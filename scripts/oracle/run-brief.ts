#!/usr/bin/env tsx
/**
 * Oracle Always Free: market brief cron (was: Vercel GET /api/cron/brief).
 *
 * Performs IDENTICAL work to the route: buildBrief(kind) from src/lib/brief/build,
 * then saveBrief/briefRecipients/markEmailed from src/lib/brief/store and
 * sendNewsletter from src/lib/admin/email — emailed to opt-in subscribers
 * only, with RFC 8058 one-click unsubscribe headers. No HTTP,
 * no cronUnauthorized — the VM is the trust boundary.
 *
 *   npx --yes tsx@4.20.5 scripts/oracle/run-brief.ts [--kind=pre|post] [--dry=1]
 *
 * --kind mirrors the route's ?kind=pre|post (defaults to "pre").
 * --dry=1 mirrors the route's ?dry=1 (generate without storing/sending).
 *
 * stdout: { ok: true, persisted: false, brief } in dry mode
 *         { ok: true, persisted: true, id, engine, email } otherwise
 *         { ok: false, error } on failure (exits 1).
 *
 * ENV (read only from process.env — dotenv is not a dependency):
 *   DATABASE_URL | POSTGRES_URL | DATABASE_URL_UNPOOLED (any one; required)
 *   RESEND_API_KEY (+ RESEND_FROM_EMAIL) — sending; skipped gracefully when
 *       unset (mirrors the route's "RESEND_API_KEY not configured" skip)
 *   NEXT_PUBLIC_SITE_URL — base for unsubscribe links (defaults inside lib)
 *
 * If no database env var is set, the job logs a JSON warning to stderr and
 * exits 0 — jobs must NEVER crash-loop when env is absent.
 */
import { hasEmailConfigured, listUnsubscribeHeaders, sendNewsletter } from "@/lib/admin/email";
import { hasDatabase } from "@/lib/db";
import { buildBrief } from "@/lib/brief/build";
import { briefHtml, briefSubject } from "@/lib/brief/email";
import { briefRecipients, markEmailed, saveBrief } from "@/lib/brief/store";
import { unsubscribeUrl } from "@/lib/newsletter";

function arg(name: string): string | undefined {
  const p = `--${name}=`;
  return process.argv.find((a) => a.startsWith(p))?.slice(p.length) || undefined;
}

const SCRIPT = "run-brief";
const kind = arg("kind") === "post" ? "post" : "pre";
const dry = arg("dry") === "1" || arg("dry") === "true";

if (!hasDatabase()) {
  console.error(
    JSON.stringify({
      level: "warn",
      script: SCRIPT,
      msg: "DATABASE_URL / POSTGRES_URL / DATABASE_URL_UNPOOLED is not set — nothing to do",
    }),
  );
  process.exit(0);
}

async function main(): Promise<void> {
  try {
    const brief = await buildBrief(kind);
    if (dry) {
      console.log(JSON.stringify({ ok: true, persisted: false, brief }));
      return;
    }
    const id = await saveBrief(brief);
    let email: { sent: number; failed: number } | { skipped: string } = { skipped: "no subscribers" };
    const to = await briefRecipients(kind);
    if (to.length && !hasEmailConfigured()) email = { skipped: "RESEND_API_KEY not configured" };
    else if (to.length) {
      const r = await sendNewsletter(briefSubject(brief), to, (addr) => briefHtml(brief, addr), {
        headersFor: (addr) => listUnsubscribeHeaders(unsubscribeUrl(addr)),
      });
      await markEmailed(id);
      email = { sent: r.sent, failed: r.failed };
    }
    console.log(JSON.stringify({ ok: true, persisted: true, id, engine: brief.engine, email }));
  } catch (e) {
    console.log(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
    process.exit(1);
  }
}

main().catch((e) => {
  console.error(
    JSON.stringify({
      level: "error",
      script: SCRIPT,
      msg: "runner crashed",
      error: e instanceof Error ? e.message : String(e),
    }),
  );
  process.exit(1);
});
