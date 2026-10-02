export function isAuthRequiredError(e: unknown): boolean {
  return e instanceof AuthRequiredError || (e instanceof Error && e.message === "Sign in required");
}

export class AuthRequiredError extends Error {
  readonly status = 401;
  constructor(message = "Sign in required") {
    super(message);
    this.name = "AuthRequiredError";
  }
}

export class ScannerQuotaError extends Error {
  readonly status = 402;
  readonly code = "SCANNER_QUOTA_EXCEEDED";
  constructor(message: string) {
    super(message);
    this.name = "ScannerQuotaError";
  }
}

export function isScannerQuotaError(e: unknown): boolean {
  return e instanceof ScannerQuotaError || (e instanceof Error && e.message.includes("Scanner limit reached"));
}

/** JSON fetcher that surfaces 401 instead of returning error payloads as data. */
export async function fetchJsonAuth<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: "no-store", ...init });
  if (res.status === 401) throw new AuthRequiredError();
  const json = (await res.json()) as T & { error?: string; code?: string };
  if (res.status === 402 && json.code === "SCANNER_QUOTA_EXCEEDED") {
    throw new ScannerQuotaError(json.error ?? "Scanner limit reached");
  }
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}
