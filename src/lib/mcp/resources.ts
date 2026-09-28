import { METRICS } from "@/lib/snapshot";

export type McpResource = {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
};

export const RESOURCES: McpResource[] = [
  {
    uri: "mcp://metrics/glossary",
    name: "Financial & Macro Metric Glossary",
    description: "Complete dictionary of all 17 core macroeconomic and market metrics used across Market Intelligence with units and methodology.",
    mimeType: "text/markdown",
  },
  {
    uri: "mcp://methodology/stress-index",
    name: "Macro Stress Index Methodology",
    description: "Formal specification of the 0–100 India Macro Stress Index, family classifications, and convergence alerts.",
    mimeType: "text/markdown",
  },
  {
    uri: "mcp://data/sources",
    name: "Official Data Sources & Feed Provenance",
    description: "Data provenance policy: RBI, MOSPI, World Bank, FRED, NSE India, Upstox, and Yahoo Finance APIs.",
    mimeType: "text/markdown",
  },
];

export function readResource(uri: string): { contents: { uri: string; mimeType: string; text: string }[] } | null {
  switch (uri) {
    case "mcp://metrics/glossary": {
      const lines = [
        "# Market Intelligence Metric Glossary",
        "",
        "| Metric ID | Label | Unit | Description |",
        "|---|---|---|---|",
        ...Object.entries(METRICS).map(
          ([k, v]) => `| \`${k}\` | ${v.label} | ${v.unit} | Core indicator for quantitative models and alert triggers |`
        ),
      ];
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: lines.join("\n"),
          },
        ],
      };
    }
    case "mcp://methodology/stress-index": {
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: `# India Macro Stress Index (0–100)

## Overview
The India Macro Stress Index is a quantitative heuristic combining 4 distinct signal families:
1. **Volatility**: India VIX, US VIX.
2. **Currency & External**: USD/INR velocity, Brent crude shocks, FX reserves.
3. **Rates & Liquidity**: G-Sec 10Y yield, US 10Y yield, RBI net liquidity deficit/surplus.
4. **Flows**: Institutional cash market flows (FII/DII net).

## Bands
- **0–25**: Normal (low systemic tension)
- **26–50**: Elevated (watchpoints emerging)
- **51–75**: High Stress (widespread cross-asset dislocations)
- **76–100**: Critical (acute systemic market distress)

## Convergence Score
Whenever 3 or more distinct signal families simultaneously show stress, the convergence score triggers a systemic alert, filtering out isolated idiosyncratic noise.`,
          },
        ],
      };
    }
    case "mcp://data/sources": {
      return {
        contents: [
          {
            uri,
            mimeType: "text/markdown",
            text: `# Data Provenance & Official Source Hierarchy

All data on Market Intelligence is sourced directly from official or primary market entities with zero synthetic fabrication:
- **Reserve Bank of India (RBI)**: Policy corridor, repo rates, system liquidity operations, sovereign yield benchmarks.
- **MOSPI (Ministry of Statistics and Programme Implementation)**: Official CPI, WPI, GDP, and IIP series.
- **NSE India / Upstox API**: Live equities quotes, options chain, futures open interest, market breadth.
- **US Federal Reserve (FRED) & US BEA**: US Treasury yields, PCE, CPI, US GDP prints.
- **Yahoo Finance**: Global benchmark indices, international commodities, cross-currency pairs.`,
          },
        ],
      };
    }
    default:
      return null;
  }
}

export const MCP_RESOURCES = RESOURCES;

export function readMcpResource(uri: string) {
  const res = readResource(uri);
  return res?.contents[0] ?? null;
}
