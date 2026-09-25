import { retrieve } from "@/lib/admin/rag";

/** Pulls top Postgres FTS matches for the latest user turn (optional, when DB + docs exist). */
export async function ragContextForQuestion(question: string, limit = 4): Promise<string | undefined> {
  const q = question.trim();
  if (!q) return undefined;
  const docs = await retrieve(q, limit);
  if (docs.length === 0) return undefined;
  return docs.map((d, i) => `[${i + 1}] ${d.title}\n${d.content.slice(0, 500)}`).join("\n\n");
}
