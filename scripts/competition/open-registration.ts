#!/usr/bin/env tsx
/**
 * Operator recovery: set season back to registration (e.g. after "Go live" too early).
 *
 * Usage (repo root, DATABASE_URL in env):
 *   node --env-file=.env.local --import tsx scripts/competition/open-registration.ts
 */

import { prepare } from "@/lib/competition/http";
import { runAdmin } from "@/lib/competition/admin";

async function main() {
  await prepare();
  const result = await runAdmin({ action: "reopenRegistration" });
  console.log(JSON.stringify(result, null, 2));
  if (!result.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
