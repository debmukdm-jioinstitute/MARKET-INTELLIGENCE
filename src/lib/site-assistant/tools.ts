import {
  listPortalOfferings,
  nudgesForSkill,
  pickDidYouKnow,
  type SkillLevel,
} from "@/lib/site-assistant/education";
import { ensureSchema, hasDatabase, sql } from "@/lib/db";
import { isPortalHrefAllowed, type PortalPageControlRow } from "@/lib/portal-page-access";
import { searchPages } from "@/lib/site-assistant/site-map";
import { tool } from "ai";
import { z } from "zod";

const skillSchema = z.enum(["beginner", "intermediate", "advanced"]);

const sectionSchema = z.enum(["Today", "Invest", "Trade", "My Portfolio", "Data & Tools", "all"]);

async function loadPortalControls(): Promise<PortalPageControlRow[]> {
  if (!hasDatabase()) return [];
  await ensureSchema();
  return (await sql()`
    SELECT href, label, nav_section, nav_group, sort_order, enabled, locked, lock_message, applies_to_children
    FROM portal_page_controls
  `) as PortalPageControlRow[];
}

/** Server-executed tools for streamText. Client tools (navigate, open_command_palette) are defined in the API route without execute. */
export function createServerSiteAssistantTools() {
  return {
    search_pages: tool({
      description:
        "Search portal pages by name, topic, or path fragment. Returns href, label, and description for each match.",
      inputSchema: z.object({
        query: z.string().describe("Keywords, page name, or feature (e.g. stress, portfolio risk, IPO)"),
      }),
      execute: async ({ query }) => {
        const controls = await loadPortalControls();
        const pages = searchPages(query, 12).filter((p) =>
          controls.length ? isPortalHrefAllowed(p.href, controls, false) : true,
        );
        return { pages: pages.slice(0, 8) };
      },
    }),
    list_portal_offerings: tool({
      description:
        "List the full portal menu: sections (Today, Invest, Trade, My Portfolio, Data & Tools), task groups, pages, Start Here shortcuts, and AI-tagged tools. Use when explaining what the site offers or matching user goals.",
      inputSchema: z.object({
        section: sectionSchema.optional().describe("Filter to one section, or omit for all"),
        skillLevel: skillSchema.optional().describe("Tailors Start Here shortcuts to learner level"),
      }),
      execute: async ({ section, skillLevel }) =>
        listPortalOfferings(section ?? "all", skillLevel as SkillLevel | undefined),
    }),
    list_education_content: tool({
      description:
        'Return nudges (where to go next) or a "Did you know?" trivia fact about the platform. Use to educate and guide beginners through advanced users.',
      inputSchema: z.object({
        kind: z.enum(["nudge", "trivia", "both"]),
        skillLevel: skillSchema.optional(),
        triviaSeed: z.number().int().optional().describe("Optional index seed for trivia rotation"),
      }),
      execute: async ({ kind, skillLevel, triviaSeed }) => {
        const level = (skillLevel ?? "beginner") as SkillLevel;
        const out: { nudges?: ReturnType<typeof nudgesForSkill>; trivia?: ReturnType<typeof pickDidYouKnow> } = {};
        if (kind === "nudge" || kind === "both") out.nudges = nudgesForSkill(level);
        if (kind === "trivia" || kind === "both") out.trivia = pickDidYouKnow(triviaSeed ?? Date.now());
        return out;
      },
    }),
  };
}

export const clientNavigateTool = tool({
  description: "Navigate the user to an allowed portal path. href must come from search_pages or the site map.",
  inputSchema: z.object({
    href: z.string().describe("Portal path starting with /, e.g. /macro/stress"),
    label: z.string().optional().describe("Human-readable destination name for confirmation"),
  }),
});

export const clientOpenPaletteTool = tool({
  description:
    "Open the global command palette so the user can search symbols, metrics, and pages (Spacebar shortcut when not typing).",
  inputSchema: z.object({
    reason: z.string().optional().describe("Why the palette helps for this request"),
  }),
});
