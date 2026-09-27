"""
Free algo desk API for production: no TimescaleDB, no TrueData, no model files.
Sample backtest + live-style state so /algo dashboards render on Fly free tier.
Set AI_TRADER_API_URL to this host; swap to full Flask when Tiger + models are ready.
"""

from __future__ import annotations

import json
import time
from datetime import date, timedelta

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DEMO_NOTE = (
    "Demo desk (open-source fixture data). For live ticks and ML, deploy full services/ai-trader "
    "with Neon/Tiger Postgres + TrueData — see docs/AI-TRADER-FREE.md."
)


def _mk_trade(i: int, risk: str, base_pnl: float) -> dict:
    d = date.today() - timedelta(days=10 - i)
    entry = f"{d.isoformat()} 10:{15 + i:02d}:00"
    exit_t = f"{d.isoformat()} 11:{20 + i:02d}:00"
    pnl = round(base_pnl * (1.1 if i % 3 else -0.85), 2)
    return {
        "entry_time": entry,
        "exit_time": exit_t,
        "symbol": f"NIFTY{d.strftime('%d%b%y').upper()}24500CE",
        "direction": "CALL" if i % 2 == 0 else "PUT",
        "strategy": "MOMENTUM" if risk != "low" else "MEAN_REVERT",
        "entry_premium": 120.0 + i * 3,
        "exit_premium": 120.0 + i * 3 + pnl / 25,
        "sl": 90.0,
        "target": 180.0,
        "sl_pct": 25.0,
        "tgt_pct": 50.0,
        "lot_size": 25 if risk == "high" else 15 if risk == "medium" else 10,
        "pnl": pnl,
        "result": "TARGET" if pnl > 0 else "SL",
        "ml_prob": 0.62 + i * 0.02,
        "strat_prob": 0.58,
        "flow_score": 0.4,
        "final_score": 0.71,
        "regime": "BULL_TREND",
        "index_price": 24480 + i * 12,
    }


def _profile(risk: str, n: int, scale: float) -> dict:
    trades = [_mk_trade(i, risk, scale * 800) for i in range(n)]
    pnls = [t["pnl"] for t in trades]
    wins = [p for p in pnls if p > 0]
    losses = [p for p in pnls if p <= 0]
    equity = []
    run = 0.0
    for p in pnls:
        run += p
        equity.append(round(run, 2))
    peak = equity[0]
    max_dd = 0.0
    for e in equity:
        peak = max(peak, e)
        max_dd = min(max_dd, e - peak)
    total = sum(pnls)
    return {
        "trades": len(trades),
        "pnl": round(total, 2),
        "win_rate": round(len(wins) / max(len(pnls), 1) * 100, 1),
        "avg_win": round(sum(wins) / len(wins), 2) if wins else 0,
        "avg_loss": round(sum(losses) / len(losses), 2) if losses else 0,
        "max_dd": round(max_dd, 2),
        "rr": round(abs((sum(wins) / len(wins)) / (sum(losses) / len(losses))), 2) if wins and losses else 1.2,
        "equity_curve": equity,
        "trade_list": trades,
    }


RESULTS = {
    "low": _profile("low", 8, 0.6),
    "medium": _profile("medium", 12, 1.0),
    "high": _profile("high", 16, 1.4),
}

CURVES = {
    risk: [{"time": t["entry_time"][:10], "equity": e} for t, e in zip(RESULTS[risk]["trade_list"], RESULTS[risk]["equity_curve"])]
    for risk in RESULTS
}

DAYS = [
    {"day": (date.today() - timedelta(days=i)).isoformat(), "ticks": 12000 - i * 400}
    for i in range(5, 0, -1)
]

BASE_STATE = {
    "status": "scanning",
    "last_scan": time.strftime("%Y-%m-%d %H:%M:%S"),
    "last_price": 24532.5,
    "spot_price": 24532.5,
    "regime": "BULL_TREND",
    "models_loaded": True,
    "strategy_models_loaded": ["MOMENTUM", "MEAN_REVERT"],
    "db_connected": True,
    "demo_mode": True,
    "demo_note": DEMO_NOTE,
    "trade_suggestions": [],
    "scan_count": 42,
    "signals_checked": 128,
    "trades_today": 0,
    "scanner_enabled": True,
    "auto_trade_enabled": False,
}

RISK_PROFILES = {
    "low": {"name": "low", "max_loss_per_trade": 1500, "max_daily_loss": 4000, "position_size_pct": 0.5},
    "medium": {"name": "medium", "max_loss_per_trade": 2500, "max_daily_loss": 7000, "position_size_pct": 1.0},
    "high": {"name": "high", "max_loss_per_trade": 4000, "max_daily_loss": 12000, "position_size_pct": 1.5},
}

backtest_progress = {"running": False, "risk": None, "status": "idle", "output_lines": []}


@app.route("/api/state")
def api_state():
    return jsonify(BASE_STATE)


@app.route("/api/stream")
def api_stream():
    def gen():
        payload = {
            "state": BASE_STATE,
            "positions_by_mode": {"test": [], "live": []},
            "tick_cache": {"NIFTY-I": {"price": BASE_STATE["last_price"], "ts": time.strftime("%H:%M:%S")}},
            "tick_cache_age": 1,
            "total_open_pnl": 0,
            "total_closed_pnl": 0,
            "total_pnl": 0,
            "total_open_pnl_test": 0,
            "total_closed_pnl_test": 0,
            "total_pnl_test": 0,
            "total_open_pnl_live": 0,
            "total_closed_pnl_live": 0,
            "total_pnl_live": 0,
        }
        while True:
            yield f"data: {json.dumps(payload)}\n\n"
            time.sleep(2)

    return Response(gen(), mimetype="text/event-stream")


@app.route("/api/days")
def api_days():
    return jsonify(DAYS)


@app.route("/api/backtest/results")
def api_backtest_results():
    return jsonify(RESULTS)


@app.route("/api/equity/curve")
def api_equity_curve():
    return jsonify(CURVES)


@app.route("/api/risk/profiles")
def api_risk_profiles():
    return jsonify(RISK_PROFILES)


@app.route("/api/backtest/progress")
def api_backtest_progress():
    return jsonify(backtest_progress)


@app.route("/api/backtest/run", methods=["POST"])
def api_backtest_run():
    data = request.get_json(silent=True) or {}
    risk = data.get("risk", "medium")
    backtest_progress.update(
        {
            "running": False,
            "risk": risk,
            "status": "done",
            "output_lines": [DEMO_NOTE, "Demo data is static — use full Flask + DB for real replay."],
            "exit_code": 0,
        }
    )
    return jsonify({"status": "demo", "risk": risk, "note": DEMO_NOTE})


@app.route("/api/broker/status")
def api_broker_status():
    return jsonify({"connected": False, "mode": "paper", "demo_mode": True})


@app.route("/api/rl/status")
def api_rl_status():
    return jsonify({"demo_mode": True, "tabular": {"loaded": False}, "dqn": {"loaded": False}})


@app.route("/api/replay/state")
def api_replay_state():
    return jsonify({"status": "idle", "progress": 0, "demo_mode": True})


@app.route("/api/trades/history")
def api_trades_history():
    risk = request.args.get("risk", "medium")
    prof = RESULTS.get(risk, RESULTS["medium"])
    return jsonify(prof["trade_list"])


@app.route("/api/paper/positions")
def api_paper_positions():
    return jsonify({"positions": [], "total_open_pnl": 0, "total_closed_pnl": 0, "total_pnl": 0})


@app.route("/api/<path:subpath>", methods=["GET", "POST", "PUT", "DELETE"])
def api_catch(subpath: str):
    if request.method == "GET":
        return jsonify({"demo_mode": True, "path": subpath, "note": DEMO_NOTE})
    return jsonify({"error": "demo_readonly", "note": DEMO_NOTE}), 501


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", "5050"))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
