export type McpPrompt = {
  name: string;
  description: string;
  arguments?: { name: string; description: string; required?: boolean }[];
};

export const PROMPTS: McpPrompt[] = [
  {
    name: "morning-brief",
    description: "Pre-market routine: review overnight global markets, NIFTY levels, macroeconomic shifts, and high-impact releases before the 09:15 IST opening bell.",
    arguments: [
      { name: "focus", description: "Optional trading focus, e.g. 'equities', 'options', 'macro'", required: false },
    ],
  },
  {
    name: "stock-deep-dive",
    description: "Complete fundamental and technical deep-dive on an Indian equity: ratios, valuation bands, security risk, and options flow flags.",
    arguments: [
      { name: "symbol", description: "NSE/BSE ticker symbol, e.g. 'TCS', 'RELIANCE', 'INFY'", required: true },
    ],
  },
  {
    name: "pre-market-checklist",
    description: "Actionable 5-point opening checklist: global sentiment, domestic liquidity, holiday checks, and key support/resistance levels.",
    arguments: [],
  },
];

export function getPromptMessages(name: string, args: Record<string, string> = {}) {
  switch (name) {
    case "morning-brief": {
      const focus = args.focus ? ` Focus specifically on ${args.focus}.` : "";
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are an institutional macro and equity analyst for Indian markets.${focus} Execute the official pre-market morning brief routine:\n1. Call get_market_overview to inspect current NIFTY/VIX levels, macro stress score, and market breadth.\n2. Call get_what_changed to review breaking shifts across sectors.\n3. Call get_world_indices and get_macro_tape to evaluate global cues (US markets, Brent crude, USD/INR, US10Y).\n4. Review get_rbi_rates for liquidity and repo stance.\n5. Synthesize these into an actionable morning brief with clear risk levels, key sector catalysts, and regime bias for today's session.`,
          },
        },
      ];
    }
    case "stock-deep-dive": {
      const sym = args.symbol ? args.symbol.trim().toUpperCase() : "RELIANCE";
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Perform a comprehensive equity research deep-dive on ${sym}:\n1. Call get_research_pack for symbol="${sym}" to inspect profile, financial ratios, historical price trajectory, and security risk.\n2. Call get_valuation_model for symbol="${sym}" to evaluate DCF multiples and intrinsic valuation range.\n3. Call get_options_flow to inspect any unusual institutional options positioning on ${sym}.\n4. Synthesize your findings into an institutional investment memo covering: (a) Business Quality & Moat, (b) Valuation & Target multiples, (c) Key upside/downside catalysts, and (d) Final recommendation.`,
          },
        },
      ];
    }
    case "pre-market-checklist": {
      return [
        {
          role: "user",
          content: {
            type: "text",
            text: `Execute the pre-market checklist for the upcoming NSE/BSE session:\n1. Check get_market_holidays to verify exchange operational status today.\n2. Check get_world_indices to review overnight US/Asian performance.\n3. Call get_market_overview to read the latest composite baseline.\n4. Call get_ai_signals for index ensemble posture and BTST/STBT setups.\n5. Deliver a crisp, formatted bulleted checklist with key pivot levels and risk watchpoints.`,
          },
        },
      ];
    }
    default:
      return null;
  }
}
