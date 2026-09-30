#!/usr/bin/env node

/**
 * Market Intelligence Terminal CLI Tool
 * Usage:
 *   npx market-cli nifty
 *   npx market-cli overview
 *   npx market-cli sentiment "HDFC Bank reports 18% net profit growth"
 *   npx market-cli credit
 *   npx market-cli export
 */

const http = require("https");
const httpSync = require("http");

const BASE_URL = process.env.MARKET_API_URL || "https://getmarketintelligence.in";

function fetchUrl(urlPath) {
  return new Promise((resolve, reject) => {
    const fullUrl = urlPath.startsWith("http") ? urlPath : `${BASE_URL}${urlPath}`;
    const client = fullUrl.startsWith("https") ? http : httpSync;
    
    client.get(fullUrl, { headers: { "User-Agent": "market-cli/1.0" } }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          if (res.headers["content-type"]?.includes("application/json")) {
            resolve(JSON.parse(data));
          } else {
            resolve(data);
          }
        } catch (e) {
          resolve(data);
        }
      });
    }).on("error", (err) => reject(err));
  });
}

function postJson(urlPath, body) {
  return new Promise((resolve, reject) => {
    const fullUrl = urlPath.startsWith("http") ? urlPath : `${BASE_URL}${urlPath}`;
    const urlObj = new URL(fullUrl);
    const client = urlObj.protocol === "https:" ? http : httpSync;
    const payload = JSON.stringify(body);

    const req = client.request(fullUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
        "User-Agent": "market-cli/1.0"
      }
    }, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          resolve(data);
        }
      });
    });

    req.on("error", (err) => reject(err));
    req.write(payload);
    req.end();
  });
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0] || "nifty";

  console.log(`\x1b[36m┌─────────────────────────────────────────────────────────┐\x1b[0m`);
  console.log(`\x1b[36m│          MARKET INTELLIGENCE TERMINAL CLI v1.0          │\x1b[0m`);
  console.log(`\x1b[36m└─────────────────────────────────────────────────────────┘\x1b[0m\n`);

  try {
    switch (command.toLowerCase()) {
      case "nifty":
      case "nifty50": {
        console.log(`Fetching Nifty 50 constituents and sector breakdown from ${BASE_URL}...\n`);
        const textData = await fetchUrl("/api/export?format=terminal");
        console.log(textData);
        break;
      }

      case "overview":
      case "macro": {
        console.log(`Fetching macro stress index & snapshot...\n`);
        const json = await fetchUrl("/api/export?format=json");
        if (typeof json === "object" && json.metrics) {
          const m = json.metrics;
          console.log(`\x1b[1m=== MACRO INDICATORS ===\x1b[0m`);
          console.log(`• Nifty 50      : ${m.nifty} (${m.nifty_1d_pct >= 0 ? "+" : ""}${m.nifty_1d_pct}%)`);
          console.log(`• India VIX     : ${m.india_vix}`);
          console.log(`• USD / INR     : ₹${m.usdinr}`);
          console.log(`• Brent Crude   : $${m.brent}/bbl`);
          console.log(`• US 10Y Yield  : ${m.us10y}%`);
          console.log(`• Macro Stress  : ${json.stress?.score}/100 [Band: ${json.stress?.band}]`);
        } else {
          console.log(JSON.stringify(json, null, 2));
        }
        break;
      }

      case "sentiment": {
        const textToAnalyze = args.slice(1).join(" ") || "HDFC Bank quarterly earnings beats expectations with strong NII growth.";
        console.log(`Evaluating sentiment for: "${textToAnalyze}" via Hugging Face (ProsusAI/finbert)...\n`);
        const res = await postJson("/api/hf/sentiment", { text: textToAnalyze });
        console.log(`\x1b[1m=== HUGGING FACE FINBERT RESULT ===\x1b[0m`);
        console.log(`• Sentiment  : \x1b[32m${res.sentiment?.toUpperCase()}\x1b[0m`);
        console.log(`• Score      : ${((res.score || 0) * 100).toFixed(1)}% confidence`);
        console.log(`• Provider   : ${res.fallbackUsed ? "Lexicon Fallback Engine" : "ProsusAI/finbert Inference"}`);
        break;
      }

      case "credit": {
        console.log(`Fetching Credit Intelligence & Debt Risk parameters...\n`);
        const llmsData = await fetchUrl("/llms-full.txt");
        const lines = llmsData.split("\n");
        const creditSec = lines.slice(0, 40).join("\n");
        console.log(creditSec);
        break;
      }

      case "export": {
        console.log(`Dumping full raw platform dataset in JSON...\n`);
        const json = await fetchUrl("/api/export?format=json");
        console.log(JSON.stringify(json, null, 2));
        break;
      }

      default: {
        console.log(`\x1b[33mCommand not recognized: "${command}"\x1b[0m\n`);
        console.log(`Available commands:`);
        console.log(`  npx market-cli nifty               Show Nifty 50 constituents & sector weights`);
        console.log(`  npx market-cli overview            Show macro stress index, VIX, USDINR`);
        console.log(`  npx market-cli sentiment "<text>"  Evaluate text with ProsusAI/finbert AI`);
        console.log(`  npx market-cli credit              Show credit risk & debt metrics`);
        console.log(`  npx market-cli export              Dump full platform dataset in JSON`);
        break;
      }
    }
  } catch (err) {
    console.error(`\x1b[31mError fetching data:\x1b[0m`, err.message);
  }
}

main();
