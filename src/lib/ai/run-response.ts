/** Shared client handling for AI run API errors (quota, setup). */
export function aiRunErrorMessage(json: { error?: string; code?: string; setupRequired?: boolean }): {
  setupMessage: string | null;
  error: string | null;
  quotaExceeded: boolean;
} {
  if (json.setupRequired && json.error) {
    return { setupMessage: json.error, error: null, quotaExceeded: false };
  }
  if (json.code === "FREE_QUOTA_EXCEEDED") {
    return { setupMessage: null, error: json.error ?? "Free monthly limit reached.", quotaExceeded: true };
  }
  return { setupMessage: null, error: json.error ?? "Run failed", quotaExceeded: false };
}
