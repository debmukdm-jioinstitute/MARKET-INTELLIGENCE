/**
 * CMIE Prowess API client (server-only).
 *
 * Docs: batch files are encrypted and must be downloaded from Prowess ("Commands History and Planner" / API icon in
 * Report Viewer). Set PROWESS_API_KEY (generated at https://register.cmie.com → API Passkey).
 *
 *  - Batch API (deferred): sendbatch → token → getbatch (poll; zip when ready).
 *  - Report API (immediate): getreport with company (name | MCA CIN | CMIE code) + report batch file.
 */
import { unzipSync, strFromU8 } from "fflate";

const BASE = "https://prowess.cmie.com/api";

export class ProwessError extends Error {
  constructor(msg: string, readonly code?: number) {
    super(msg);
    this.name = "ProwessError";
  }
}

export function hasProwessKey(): boolean {
  return Boolean(process.env.PROWESS_API_KEY?.trim());
}

function key(): string {
  const k = process.env.PROWESS_API_KEY?.trim();
  if (!k) throw new ProwessError("PROWESS_API_KEY is not set");
  return k;
}

export type ProwessFormat = "json" | "txt";

async function post(endpoint: string, fields: Record<string, string>, batch?: { name: string; data: Uint8Array | Blob }) {
  const form = new FormData();
  form.set("apikey", key());
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  if (batch) form.set("batchfile", new Blob([batch.data as BlobPart]), batch.name);
  const res = await fetch(`${BASE}/${endpoint}`, { method: "POST", body: form, cache: "no-store" });
  if (!res.ok) throw new ProwessError(`Prowess ${endpoint} HTTP ${res.status}`, res.status);
  return res;
}

/** Error responses are JSON `{errcode, errdesc}`; success is a stream (txt/json/zip). */
async function readJsonError(res: Response) {
  const body = await res.clone().text();
  try {
    const j = JSON.parse(body);
    if (typeof j?.errcode === "number" && j.errcode !== 0) throw new ProwessError(String(j.errdesc ?? "Prowess error"), j.errcode);
    return j;
  } catch (e) {
    if (e instanceof ProwessError) throw e;
    return null;
  }
}

/** Queue a batch. Returns the token to poll with {@link getBatch}. */
export async function sendBatch(batchName: string, batchFile: Uint8Array, format: ProwessFormat = "json"): Promise<string> {
  const res = await post("sendbatch", format === "json" ? { format: "json" } : {}, { name: batchName, data: batchFile });
  const j = await readJsonError(res);
  if (!j?.token) throw new ProwessError("sendbatch returned no token");
  return String(j.token);
}

export type BatchStatus =
  | { state: "pending"; message: string }
  | { state: "ready"; files: Record<string, string> };

/** Poll a batch. When done, returns the unzipped files (e.g. "1.json", "TOKEN.lst") as text. */
export async function getBatch(token: string): Promise<BatchStatus> {
  const res = await post("getbatch", { token });
  const type = res.headers.get("content-type") ?? "";
  if (type.includes("application/json")) {
    const j = await readJsonError(res);
    return { state: "pending", message: String(j?.message ?? "UNKNOWN") };
  }
  const zip = unzipSync(new Uint8Array(await res.arrayBuffer()));
  const files: Record<string, string> = {};
  for (const [name, data] of Object.entries(zip)) files[name] = strFromU8(data);
  return { state: "ready", files };
}

/** Immediate pre-defined report for one company. Returns parsed JSON (format=json) or raw pipe-delimited text. */
export async function getReport(company: string, batchName: string, batchFile: Uint8Array, format: ProwessFormat = "json") {
  const res = await post("getreport", { company, ...(format === "json" ? { format: "json" } : {}) }, { name: batchName, data: batchFile });
  await readJsonError(res);
  const text = await res.text();
  if (format !== "json") return text;
  const j = JSON.parse(text);
  if (!j.meta) throw new ProwessError(String(j.message ?? j.errdesc ?? "No data returned"));
  return j;
}

export async function abortAll(): Promise<void> {
  await readJsonError(await post("abortall", {}));
}
