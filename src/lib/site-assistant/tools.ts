import { searchPages } from "@/lib/site-assistant/site-map";
import { tool } from "ai";
import { z } from "zod";

/** Server-executed tools for streamText. Client tools (navigate, open_command_palette) are defined in the API route without execute. */
export function createServerSiteAssistantTools() {
  return {
    search_pages: tool({
      description:
        "Search portal pages by name, topic, or path fragment. Returns href, label, and description for each match.",
      inputSchema: z.object({
        query: z.string().describe("Keywords, page name, or feature (e.g. stress, portfolio risk, IPO)"),
      }),
      execute: async ({ query }) => ({
        pages: searchPages(query, 8),
      }),
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
