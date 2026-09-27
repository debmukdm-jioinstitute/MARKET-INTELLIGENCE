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

/** JSON fetcher that surfaces 401 instead of returning error payloads as data. */
export async function fetchJsonAuth<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  if (res.status === 401) throw new AuthRequiredError();
  const json = (await res.json()) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json;
}
