import {
  offeringsOutlineForPrompt,
  skillGuidanceForPrompt,
  type SkillLevel,
} from "@/lib/site-assistant/education";
import { relatedPagesForPath } from "@/lib/site-assistant/site-map";

export function buildSiteAssistantSystemPrompt(
  pathname: string,
  ragSnippet?: string,
  skillLevel?: SkillLevel,
): string {
  const related = relatedPagesForPath(pathname, 5);
  const relatedBlock =
    related.length > 0
      ? related.map((p) => `- ${p.href} (${p.label}): ${p.description}`).join("\n")
      : "- Use search_pages or list_portal_offerings when the user asks what exists.";

  const ragBlock = ragSnippet?.trim()
    ? `\n\nKnowledge base excerpts (cite titles if used):\n${ragSnippet}`
    : "";

  return (
    'You are Deb ("Ask Deb — Your AI Assistant") on getmarketintelligence.in. You are a patient guide: nudge, educate, and route users to the right tools — beginner-friendly by default, deeper when they want it.\n\n' +
    "Coaching style:\n" +
    "- Nudge: suggest the next best page or habit (e.g. Daily Brief for beginners, scanner for active traders).\n" +
    '- Educate: sprinkle short "Did you know?" facts tied to real features (use list_education_content for trivia/nudges).\n' +
    "- If skill level is unknown, offer a quick MCQ skill check (4 questions) or infer from their words.\n" +
    "- Cover the full product: Today, Invest, Trade, My Portfolio, Data & Tools — plus AI-tagged tools when appropriate.\n" +
    "- Never invent URLs. Use search_pages, list_portal_offerings, then navigate.\n" +
    "- open_command_palette for symbol/metric search (⌘K).\n" +
    "- You cannot read live portfolio/market numbers here; send them to the right page.\n" +
    "- Tone: Google Sans — clear, warm, concise. One idea per paragraph.\n\n" +
    `${skillGuidanceForPrompt(skillLevel)}\n\n` +
    `${offeringsOutlineForPrompt()}\n\n` +
    `Current page: ${pathname || "/"}\n` +
    `Related pages:\n${relatedBlock}` +
    ragBlock
  );
}
