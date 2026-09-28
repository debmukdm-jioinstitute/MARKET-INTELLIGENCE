import { ensureSchema, hasDatabase, sql } from "@/lib/db";

let ready: Promise<void> | null = null;

function ensureAuditSchema(): Promise<void> {
  if (!hasDatabase()) return Promise.resolve();
  ready ??= (async () => {
    await ensureSchema();
    await sql()`
      CREATE TABLE IF NOT EXISTS assistant_actions (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_email text NOT NULL,
        tool text NOT NULL,
        params jsonb NOT NULL DEFAULT '{}',
        summary text NOT NULL,
        ok boolean NOT NULL,
        created_at timestamptz NOT NULL DEFAULT now()
      )
    `;
    await sql()`CREATE INDEX IF NOT EXISTS idx_assistant_actions_user ON assistant_actions(user_email, created_at DESC)`;
  })();
  return ready;
}

/**
 * Every mutation Ask Deb performs (or attempts) is recorded here — who asked, what tool,
 * what parameters, whether it succeeded, and when. Best-effort: never throws to the caller,
 * because a logging failure must not block or misreport the action itself.
 */
export async function logAssistantAction(input: {
  email: string;
  tool: string;
  params: Record<string, unknown>;
  summary: string;
  ok: boolean;
}): Promise<void> {
  if (!hasDatabase()) return;
  try {
    await ensureAuditSchema();
    await sql()`
      INSERT INTO assistant_actions (user_email, tool, params, summary, ok)
      VALUES (${input.email}, ${input.tool.slice(0, 64)}, ${JSON.stringify(input.params).slice(0, 4000)}, ${input.summary.slice(0, 500)}, ${input.ok})
    `;
  } catch (e) {
    console.warn("[assistant-audit] failed to log action:", e);
  }
}

export type AssistantActionRow = {
  id: string;
  tool: string;
  params: Record<string, unknown>;
  summary: string;
  ok: boolean;
  created_at: string;
};

export async function recentAssistantActions(email: string, limit = 30): Promise<AssistantActionRow[]> {
  if (!hasDatabase()) return [];
  await ensureAuditSchema();
  return (await sql()`
    SELECT id, tool, params, summary, ok, created_at
    FROM assistant_actions WHERE user_email = ${email}
    ORDER BY created_at DESC LIMIT ${limit}
  `) as unknown as AssistantActionRow[];
}
