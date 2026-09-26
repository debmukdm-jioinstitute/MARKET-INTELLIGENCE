"use client";

import { useCallback, useEffect, useState } from "react";
import { API_BASE, fetchJSON, postJSON } from "@/lib/ai-trader/api";

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
    <div className="t-panel mb-4 p-5">
      <h2 className="mb-1 text-[12px] font-bold uppercase tracking-wider" style={{ color: "#c8cdd5" }}>
        Broker (Zerodha / paper)
      </h2>
      <p className="mb-4 text-[10px]" style={{ color: "#5a6270" }}>
        Same controls as AI-trader live desk: connect, OAuth, reconcile, kill switch. Use TEST mode until you trust the stack.
      </p>
      <div className="mb-3 flex flex-wrap gap-2">
        <span className="t-badge" style={{ color: status?.connected ? "#00e87b" : "#ff3e3e", borderColor: status?.connected ? "#1a5c3a" : "#5c1a1a" }}>
          {status?.broker ?? "—"} {status?.connected ? "connected" : "disconnected"}
        </span>
        <span className="t-badge" style={{ color: "#4da6ff", borderColor: "#1a3a5c" }}>
          Mode: {status?.mode?.toUpperCase() ?? "—"}
        </span>
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
        <button
          type="button"
          className="t-btn-red"
          onClick={() => fetch(`${API_BASE}/api/broker/kill`, { method: "POST" }).then(refresh)}
        >
          Kill switch
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          value={requestToken}
          onChange={(e) => setRequestToken(e.target.value)}
          placeholder="Paste request_token after Kite login"
          className="min-w-[240px] flex-1 text-[11px]"
        />
        <button type="button" className="t-btn-green" onClick={completeAuth}>
          Complete OAuth
        </button>
      </div>
      {loginUrl ? (
        <p className="mt-2 text-[10px] break-all" style={{ color: "#4da6ff" }}>
          {loginUrl}
        </p>
      ) : null}
      {msg ? (
        <p className="mt-2 text-[11px]" style={{ color: "#e8c300" }}>
          {msg}
        </p>
      ) : null}
    </div>
  );
}
