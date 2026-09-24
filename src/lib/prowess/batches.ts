import { readFile } from "node:fs/promises";
import path from "node:path";

/**
 * Batch files downloaded from Prowess live in `prowess-batches/` at the repo root (encrypted, safe to commit).
 * Reference them by file name only — no path segments.
 */
const DIR = path.join(process.cwd(), "prowess-batches");

export async function loadBatch(name: string): Promise<Uint8Array> {
  if (!/^[\w.-]+$/.test(name)) throw new Error("Invalid batch name");
  return new Uint8Array(await readFile(path.join(DIR, name)));
}
