import { deleteState, getState, setState } from "@/lib/notify/store";
import { broadcastTelegram, hasTelegramConfigured, siteUrl } from "@/lib/notify/telegram";
import { FAILURE_THRESHOLD, getSourceHealth, type SourceHealth } from "./sources";

export interface HealthIncident {
  startedAt: string;
  failStreak: number;
  lastError: string | null;
}

const incidentKey = (sourceId: string) => `health-alert:${sourceId}`;

export interface HealthAlertDeps {
  getHealth: () => Promise<SourceHealth[]>;
  getIncident: (sourceId: string) => Promise<HealthIncident | null>;
  setIncident: (sourceId: string, incident: HealthIncident) => Promise<void>;
  clearIncident: (sourceId: string) => Promise<void>;
  broadcast: (text: string) => Promise<{ sent: number; failed: number }>;
  telegramConfigured: () => boolean;
}

const defaultDeps: HealthAlertDeps = {
  getHealth: () => getSourceHealth(),
  getIncident: (id) => getState<HealthIncident>(incidentKey(id)),
  setIncident: (id, v) => setState(incidentKey(id), v),
  clearIncident: (id) => deleteState(incidentKey(id)),
  broadcast: (text) => broadcastTelegram(text),
  telegramConfigured: () => hasTelegramConfigured(),
};

export interface HealthAlertReport {
  checked: number;
  alerted: string[];
  recovered: string[];
  skippedNoTelegram: boolean;
}

function formatAlert(s: SourceHealth): string {
  const lastOk = s.lastOk ? new Date(s.lastOk).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" }) : "never";
  return (
    `⚠️ Source failing: ${s.label} — ${s.failStreak} consecutive failures.\n` +
    `Last success: ${lastOk} IST.\n` +
    `Error: ${s.lastError ?? "unknown"}\n` +
    `${siteUrl()}/data/feeds`
  );
}

function formatRecovery(s: SourceHealth): string {
  return `✅ Recovered: ${s.label} is reporting healthy again.\n${siteUrl()}/data/feeds`;
}

/**
 * One alert per incident: sources whose status is "failing" trigger a single
 * Telegram message; the incident is recorded so later runs stay silent until
 * recovery. Recovery clears the incident (with a notice). Never throws —
 * alerting must not break the cron that calls it.
 */
export async function checkHealthAlerts(deps: HealthAlertDeps = defaultDeps): Promise<HealthAlertReport> {
  const report: HealthAlertReport = { checked: 0, alerted: [], recovered: [], skippedNoTelegram: false };
  try {
    const sources = await deps.getHealth();
    report.checked = sources.length;
    if (!sources.length) return report;
    if (!deps.telegramConfigured()) {
      report.skippedNoTelegram = true;
      return report;
    }
    const now = new Date().toISOString();
    for (const s of sources) {
      const incident = await deps.getIncident(s.id).catch(() => null);
      if (s.status === "failing") {
        if (incident) continue; // already alerted for this incident
        const res = await deps.broadcast(formatAlert(s)).catch(() => ({ sent: 0, failed: 0 }));
        if (res.sent > 0) {
          await deps
            .setIncident(s.id, { startedAt: now, failStreak: s.failStreak, lastError: s.lastError })
            .catch(() => {});
          report.alerted.push(s.id);
        }
        // If the broadcast failed everywhere, don't record the incident: the
        // next run retries instead of going silent.
      } else if (incident && (s.status === "healthy" || s.status === "degraded")) {
        await deps.clearIncident(s.id).catch(() => {});
        const res = await deps.broadcast(formatRecovery(s)).catch(() => ({ sent: 0, failed: 0 }));
        if (res.sent > 0) report.recovered.push(s.id);
      }
    }
  } catch {
    // alerting is best-effort
  }
  return report;
}

export { FAILURE_THRESHOLD };
