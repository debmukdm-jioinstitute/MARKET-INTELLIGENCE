import { guardExpensive } from "@/lib/api-guard";
import { NextResponse } from "next/server";
import { callLlm, hasLlmKey, untrustedBlock } from "@/lib/ai/llm";
import { factsFrom, numbersGrounded, numbersIn } from "@/lib/brief/build";
import { buildSnapshot } from "@/lib/snapshot";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const SYSTEM = `You answer questions about the current Indian market backdrop for retail investors.
Rules:
- Use ONLY the numbers in <facts>. If the question needs data that is not in the facts, say you don't have it — never guess.
- Do not give investment advice, price targets, or say what anyone should buy or sell. Describe what the data shows.
- Do not infer causes or predict. Keep time frames exactly as given ("1d" = one day).
- At most 90 words. Plain text.`;

/** Grounded Q&A over the live snapshot. The answer's numbers are checked against the fact sheet; otherwise the raw facts are returned. */
export async function POST(req: Request) {
  const blocked = await guardExpensive(req, { name: "copilot", flag: "ai", max: 8, windowSec: 60 });
  if (blocked) return blocked;
  const body = (await req.json().catch(() => ({}))) as { question?: unknown };
  const question = typeof body.question === "string" ? body.question.trim().slice(0, 300) : "";
  if (!question) return NextResponse.json({ error: "question required" }, { status: 400 });

  const snap = await buildSnapshot().catch(() => null);
  if (!snap) return NextResponse.json({ answer: "Live market data is unavailable right now.", grounded: false });
  const facts = factsFrom(snap);
  const sheet = facts.map((f) => `${f.label} = ${f.value} [${f.provider}]`).join("\n");
  const factsOnly = `Here is what the live data shows right now:\n${facts.map((f) => `• ${f.label}: ${f.value}`).join("\n")}`;

  if (!hasLlmKey()) return NextResponse.json({ answer: factsOnly, grounded: true, engine: "facts" });
  try {
    const answer = (await callLlm({ system: SYSTEM, maxTokens: 500, prompt: `${untrustedBlock("question", question)}\n\n${untrustedBlock("facts", sheet)}` })).trim();
    const factNumbers = facts.flatMap((f) => numbersIn(`${f.label} ${f.value}`));
    if (numbersGrounded(answer, factNumbers)) return NextResponse.json({ answer, grounded: true, engine: "llm", asOf: snap.asOf });
    return NextResponse.json({ answer: factsOnly, grounded: true, engine: "facts", note: "The AI's answer contained a figure not in the data, so the raw readings are shown instead." });
  } catch {
    return NextResponse.json({ answer: factsOnly, grounded: true, engine: "facts" });
  }
}
