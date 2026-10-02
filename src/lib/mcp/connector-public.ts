/** MCP endpoint for Claude / Cursor — paid plans only (see /pricing). */
export const MCP_ENDPOINT = "https://getmarketintelligence.in/api/mcp";

export const CLAUDE_CONNECTOR = {
  name: "Market Intelligence",
  url: MCP_ENDPOINT,
  docs: "https://getmarketintelligence.in/connect/claude",
  help: "https://getmarketintelligence.in/help#mcp",
} as const;
