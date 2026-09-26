"use client";

import { useCallback, useEffect, useState } from "react";
import { Panel } from "@/components/layout/page-header";
import { API_BASE, fetchJSON, postJSON } from "@/lib/ai-trader/api";
import { cn } from "@/lib/utils";
import Badge from "@/components/ai-trader/Badge";

type BrokerStatus = {
  connected?: boolean;
  broker?: string;
  mode?: string;
  halted?: boolean;
  halt_reason?: string;
  daily_pnl?: number;
  trade_count?: number;
  max_daily_loss?: number;
  confirmation_mode?: string;
};

export function BrokerSettingsPanel() {
  const [status, setStatus] = useState<BrokerStatus | null>(null);
  const [loginUrl, setLoginUrl] = useState("");
  const [requestToken, setRequestToken] = useState("");
  const [msg, setMsg] = useState<string | null>(null);

  const refresh = useCallback(() => {
    fetchJSON<BrokerStatus>("/api/broker/status").then(setStatus).catch(() => setStatus(null));
  }, []);

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 8000);
    return () => clearInterval(id);
  }, [refresh]);

  const connect = async () => {
    setMsg(null);
    try {
      const r = await postJSON<{ connected: boolean; broker: string }>("/api/broker/connect");
      setMsg(r.connected ? `Connected (${r.broker})` : "Connect failed");
      refresh();
    } catch {
      setMsg("Connect failed");
    }
  };

  const loadLoginUrl = async () => {
    try {
      const r = await fetchJSON<{ login_url?: string; message?: string }>("/api/broker/auth/login_url");
      if (r.login_url) {
        setLoginUrl(r.login_url);
        window.open(r.login_url, "_blank", "noopener,noreferrer");
      } else setMsg(r.message ?? "Login URL unavailable (paper mode or missing Kite keys)");
    } catch {
      setMsg("Login URL unavailable");
    }
  };

  const completeAuth = async () => {
    if (!requestToken.trim()) return;
    try {
      const r = await postJSON<{ authenticated?: boolean }>("/api/broker/auth/callback", { request_token: requestToken.trim() });
      setMsg(r.authenticated ? "Zerodha session saved" : "Auth failed");
      setRequestToken("");
      refresh();
    } catch {
      setMsg("Auth callback failed");
    }
  };

  const reconcile = async () => {
    try {
      const r = await fetchJSON<Record<string, unknown>>("/api/broker/reconcile");
      setMsg(`Reconcile: ${JSON.stringify(r).slice(0, 120)}…`);
    } catch {
      setMsg("Reconcile failed");
    }
  };

  return (
    <Panel
      title="Broker (Zerodha / paper)"
      subtitle="Connect, OAuth, reconcile, and kill switch. Use test mode until you trust the stack."
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Badge label={`${status?.broker ?? "—"} ${status?.connected ? "connected" : "disconnected"}`} variant={status?.connected ? "green" : "red"} />
        <Badge label={`Mode: ${status?.mode?.toUpperCase() ?? "—"}`} variant="blue" />
      </div>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="t-btn" onClick={connect}>
          Connect broker
        </button>
        <button type="button" className="t-btn" onClick={loadLoginUrl}>
          Zerodha login URL
        </button>
        <button type="button" className="t-btn" onClick={reconcile}>
          Reconcile positions
        </button>
        <button type="button" className="t-btn-red" onClick={() => fetch(`${API_BASE}/api/broker/kill`, { method: "POST" }).then(refresh)}>
          Kill switch
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={requestToken}
          onChange={(e) => setRequestToken(e.target.value)}
          placeholder="Paste request_token after Kite login"
          className="min-w-[240px] flex-1 text-sm"
        />
        <button type="button" className="t-btn-green" onClick={completeAuth}>
          Complete OAuth
        </button>
      </div>
      {loginUrl ? <p className="mt-2 break-all text-xs text-primary">{loginUrl}</p> : null}
      {msg ? <p className={cn("mt-2 text-sm", msg.includes("failed") ? "text-destructive" : "text-chart-3")}>{msg}</p> : null}
    </Panel>
  );
}
