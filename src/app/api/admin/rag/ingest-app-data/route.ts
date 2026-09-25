import { requireAdmin } from "@/lib/admin/guard";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { GLOSSARY } from "@/lib/my-portfolio/glossary";
import { METRIC_COPY } from "@/lib/macro/metric-copy";
import { PAGE_COMMANDS } from "@/lib/command-registry";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Pulls the app's own knowledge — portfolio metric definitions and macro
 * "plain English" explainers — into the RAG knowledge base as source='app'
 * documents. Idempotent: clears previous app-sourced docs first so re-running
 * after a copy edit doesn't leave stale duplicates.
 */
export async function POST() {
  const guard = await requireAdmin();
  if ("error" in guard) return guard.error;
  if (!hasDatabase()) return NextResponse.json({ error: "No database configured" }, { status: 503 });

  await ensureSchema();
  const db = sql();
  await db`DELETE FROM rag_documents WHERE source = 'app'`;

  const rows: { title: string; content: string }[] = [];

  for (const entry of Object.values(GLOSSARY)) {
    rows.push({
      title: `Metric: ${entry.label}`,
      content: [
        entry.definition,
        `Formula: ${entry.formula}`,
        `Example: ${entry.example}`,
        `Why it matters: ${entry.why}`,
      ].join("\n"),
    });
  }

  for (const [key, copy] of Object.entries(METRIC_COPY)) {
    rows.push({
      title: `Macro indicator: ${key}`,
      content: `${copy.novice}\nSource: ${copy.provider} (${copy.url})`,
    });
  }

  for (const page of PAGE_COMMANDS) {
    rows.push({
      title: `Portal page: ${page.label}`,
      content: `Path: ${page.href}\n${page.description}`,
    });
  }

  for (const row of rows) {
    await db`INSERT INTO rag_documents (source, title, content) VALUES ('app', ${row.title}, ${row.content})`;
  }

  return NextResponse.json({ ingested: rows.length });
}
