import { z } from "zod";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success)
    return <p>Invalid verification ID.</p>;
  let row: Record<string, unknown> | null = null;
  let unavailable = false;
  try {
    if (!hasDatabase()) throw new Error("unavailable");
    await ensureSchema();
    const [r] =
      await sql()`SELECT cc.display_name,cc.kind,c.name FROM competition_certificates cc JOIN competition c ON c.id=cc.competition_id WHERE cc.id=${id}::uuid AND c.results_verified`;
    row = r ?? null;
  } catch {
    unavailable = true;
  }
  if (unavailable)
    return <p>Certificate verification is temporarily unavailable.</p>;
  return row ? (
    <article className="rounded-xl border border-border p-6">
      <h1 className="text-2xl font-bold">Verified certificate</h1>
      <p className="mt-4">
        {String(row.display_name)} · {String(row.kind)}
      </p>
      <p>{String(row.name)}</p>
      <p className="mt-4 text-xs">Verification ID: {id}</p>
    </article>
  ) : (
    <p>Certificate not found.</p>
  );
}
