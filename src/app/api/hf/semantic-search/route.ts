/**
 * GET /api/hf/semantic-search?corpus=help|learn|feeds&q=...
 *
 * Shared semantic search over three small static doc corpora (/help, /learn, /data/feeds) using
 * sentence-transformers/all-MiniLM-L6-v2 embeddings + cosine similarity. Corpus embeddings are
 * computed once per corpus and cached in-process for 24h (embeddings are deterministic for the
 * same text); only the query itself is embedded per request.
 *
 * Note: MiniLM is English-tuned, so a Hindi query will fall back to weak/near-random similarity
 * rather than a real semantic match — this is a known limitation, not a bug.
 */

import { NextResponse } from "next/server";
import { embedTexts, cosineSimilarity } from "@/lib/hf/embeddings";
import { HELP_TOPICS } from "@/lib/help/help-search-index";
import { LEARN_ARTICLES } from "@/lib/learn/articles";
import { FEED_SEARCH_DOCS } from "@/lib/help/feed-search-corpus";

export const runtime = "nodejs";

type Doc = { title: string; blurb: string; href: string; text: string };

function helpDocs(): Doc[] {
  return HELP_TOPICS.map((t) => ({ title: t.title, blurb: t.blurb, href: t.href, text: `${t.title}. ${t.blurb}. ${t.keywords.join(" ")}` }));
}

function learnDocs(): Doc[] {
  return LEARN_ARTICLES.map((a) => ({ title: a.title, blurb: a.description, href: `/learn/${a.slug}`, text: `${a.title}. ${a.description}` }));
}

function feedDocs(): Doc[] {
  return FEED_SEARCH_DOCS.map((f) => ({ title: f.title, blurb: f.blurb, href: f.href, text: `${f.title}. ${f.blurb}` }));
}

const CORPORA: Record<string, () => Doc[]> = { help: helpDocs, learn: learnDocs, feeds: feedDocs };

const EMBED_TTL_MS = 24 * 60 * 60 * 1000;
const corpusCache = new Map<string, { at: number; docs: Doc[]; vectors: number[][] }>();

/** embedTexts caps at 10 per call — chunk larger corpora. */
async function embedAll(texts: string[]): Promise<number[][]> {
  const out: number[][] = [];
  for (let i = 0; i < texts.length; i += 9) {
    out.push(...(await embedTexts(texts.slice(i, i + 9))));
  }
  return out;
}

async function getCorpusVectors(corpus: string): Promise<{ docs: Doc[]; vectors: number[][] } | null> {
  const build = CORPORA[corpus];
  if (!build) return null;
  const hit = corpusCache.get(corpus);
  if (hit && Date.now() - hit.at < EMBED_TTL_MS) return hit;
  const docs = build();
  const vectors = await embedAll(docs.map((d) => d.text));
  const entry = { at: Date.now(), docs, vectors };
  corpusCache.set(corpus, entry);
  return entry;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const corpus = searchParams.get("corpus") ?? "";
  const q = searchParams.get("q")?.trim() ?? "";

  if (!CORPORA[corpus]) {
    return NextResponse.json({ error: "unknown corpus", results: [] }, { status: 400 });
  }
  if (!q) return NextResponse.json({ results: [] });

  try {
    const entry = await getCorpusVectors(corpus);
    if (!entry || entry.vectors.length === 0) return NextResponse.json({ results: [] });

    const [queryVec] = await embedTexts([q]);
    if (!queryVec) return NextResponse.json({ results: [] });

    const scored = entry.docs
      .map((d, i) => ({ title: d.title, blurb: d.blurb, href: d.href, similarity: cosineSimilarity(queryVec, entry.vectors[i] ?? []) }))
      .sort((a, b) => b.similarity - a.similarity)
      .filter((r) => r.similarity > 0.15)
      .slice(0, 5);

    return NextResponse.json({ results: scored });
  } catch {
    // Graceful degradation: empty results, never an error dump — caller renders no search results.
    return NextResponse.json({ results: [] });
  }
}
