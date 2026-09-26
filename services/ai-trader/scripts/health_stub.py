"""Minimal Flask on :5050 so the portal proxy + tunnel can be tested without TimescaleDB/TrueData."""

from __future__ import annotations

import json
import time

from flask import Flask, Response, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

REPLAY_STATE = {
    "status": "idle",
    "date": None,
    "progress": 0,
    "total_minutes": 0,
    "current_time": None,
    "current_price": 0,
    "regime": "UNKNOWN",
    "trades": [],
    "total_pnl": 0,
    "ticks_processed": 0,
}

BASE_STATE = {
    "status": "ready",
    "last_scan": None,
    "last_price": 0,
    "spot_price": 0,
    "regime": "UNKNOWN",
    "models_loaded": False,
    "strategy_models_loaded": [],
    "db_connected": False,
    "trade_suggestions": [],
    "scan_count": 0,
    "signals_checked": 0,
    "trades_today": 0,
    "scanner_enabled": False,
    "auto_trade_enabled": False,
    "stub": True,
    "stub_note": "Replace with full backend: Python 3.13, TimescaleDB, TrueData — see docs/AI-TRADER.md",
}


@app.route("/api/state")
def api_state():
    return jsonify(BASE_STATE)


@app.route("/api/stream")
def api_stream():
    def gen():
        payload = {"state": BASE_STATE, "positions_by_mode": {"test": [], "live": []}, "tick_cache": {}}
        while True:
            yield f"data: {json.dumps(payload)}\n\n"
            time.sleep(1)

    return Response(gen(), mimetype="text/event-stream")


@app.route("/api/replay/state")
def api_replay_state():
    return jsonify(REPLAY_STATE)


@app.route("/api/replay/start", methods=["POST"])
def api_replay_start():
    return jsonify({"error": "stub", "note": BASE_STATE["stub_note"]}), 501


@app.route("/api/days")
def api_days():
    return jsonify([])


@app.route("/api/<path:subpath>", methods=["GET", "POST", "PUT", "DELETE"])
def api_catch(subpath: str):
    if request.method == "GET" and subpath in ("risk/profiles", "backtest/results", "equity/curve"):
        return jsonify({})
    if request.method == "GET" and subpath.startswith("paper/positions"):
        return jsonify({"positions": [], "total_open_pnl": 0, "total_closed_pnl": 0, "total_pnl": 0})
    if request.method == "GET" and subpath == "rl/status":
        return jsonify({})
    if request.method == "GET" and subpath == "broker/status":
        return jsonify({"connected": False, "mode": "stub"})
    return jsonify({"error": "stub_backend", "path": subpath, "note": BASE_STATE["stub_note"]}), 501


if __name__ == "__main__":
    import os

    port = int(os.environ.get("PORT", "5050"))
    app.run(host="0.0.0.0", port=port, debug=False, threaded=True)
