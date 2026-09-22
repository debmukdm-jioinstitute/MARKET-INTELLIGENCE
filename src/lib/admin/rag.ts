import { callLlm, hasLlmKey, untrustedBlock } from "@/lib/ai/llm";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";

export type RagDocument = { id: string; source: "admin" | "app"; title: string; content: string; created_at: string };

/** Postgres full-text search retrieval — no embedding model/API key needed. */
export async function retrieve(query: string, limit = 6): Promise<RagDocument[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  const rows = await sql()`
    SELECT id, source, title, content, created_at,
           ts_rank(search, websearch_to_tsquery('english', ${query})) AS rank
    FROM rag_documents
    WHERE search @@ websearch_to_tsquery('english', ${query})
    ORDER BY rank DESC
    LIMIT ${limit}
  `;
  return rows as unknown as RagDocument[];
}

export type RagAnswer = { answer: string; sources: { id: string; title: string }[] };

export async function answerFromKnowledgeBase(question: string): Promise<RagAnswer> {
  const docs = await retrieve(question, 6);
  if (docs.length === 0) {
    return { answer: "Nothing in the knowledge base matches that question yet — feed in more documents or app data.", sources: [] };
  }
  if (!hasLlmKey()) {
    return {
      answer: `GROQ_API_KEY isn't configured, so here are the closest matching documents verbatim:\n\n${docs
        .map((d) => `— ${d.title}: ${d.content.slice(0, 300)}`)
        .join("\n\n")}`,
      sources: docs.map((d) => ({ id: d.id, title: d.title })),
    };
  }

  const context = docs.map((d, i) => `[${i + 1}] ${d.title}\n${untrustedBlock("document", d.content)}`).join("\n\n");
  const answer = await callLlm({
    system:
      "You are the knowledge-base assistant for an admin backend. Answer strictly using the numbered documents provided — " +
      "if they don't contain the answer, say so plainly instead of guessing. Cite documents inline as [1], [2] etc. Be concise.",
    prompt: `Question: ${question}\n\nDocuments:\n${context}`,
    maxTokens: 500,
  });

  return { answer, sources: docs.map((d) => ({ id: d.id, title: d.title })) };
}
