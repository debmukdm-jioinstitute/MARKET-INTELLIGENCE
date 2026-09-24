#!/usr/bin/env node
// Local ops for the data.gov.in mirror. Node 24 runs the .ts modules directly.
//   node --env-file=.env.local scripts/datagov.mjs catalog [sector] [pages]
//   node --env-file=.env.local scripts/datagov.mjs discover
//   node --env-file=.env.local scripts/datagov.mjs sync <resource-uuid> [budgetSeconds]
//   node --env-file=.env.local scripts/datagov.mjs tracked
import { syncCatalog, discoverTracked, syncDataset, syncTracked } from "../src/lib/datagov/sync.ts";

const [cmd, a, b] = process.argv.slice(2);
const out =
  cmd === "catalog" ? await syncCatalog({ sector: a, maxPages: Number(b ?? 10) })
  : cmd === "discover" ? await discoverTracked()
  : cmd === "sync" ? await syncDataset(a, { budgetMs: Number(b ?? 300) * 1000 })
  : cmd === "tracked" ? await syncTracked(Number(a ?? 300) * 1000)
  : (console.log("usage: catalog [sector] [pages] | discover | sync <id> [sec] | tracked [sec]"), null);
if (out) console.log(JSON.stringify(out, null, 2));
