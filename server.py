"""Private-development EODHD bridge. Never place API tokens in browser code."""
import os
import time
from datetime import date
from threading import Lock

import requests
from flask import Flask, jsonify, request

app = Flask(__name__)
ALLOWED_SYMBOLS = {"CNQ.TO", "CVE.TO"}
CACHE_SECONDS = 60 * 60 * 12
cache = {}
cache_lock = Lock()


@app.get("/health")
def health():
    return jsonify(status="ok", service="investing-data-test")


@app.get("/api/history")
def history():
    # Limited to two development tickers until data licensing and access are resolved.
    symbol = request.args.get("symbol", "").strip().upper()
    if symbol not in ALLOWED_SYMBOLS:
        return jsonify(error="Symbol not enabled for this test"), 400

    token = os.environ.get("EODHD_API_TOKEN")
    if not token:
        return jsonify(error="Data source not configured"), 503

    now = time.monotonic()
    with cache_lock:
        cached = cache.get(symbol)
        if cached and now - cached[0] < CACHE_SECONDS:
            return jsonify(symbol=symbol, rows=cached[1], cached=True)

    try:
        response = requests.get(
            f"https://eodhd.com/api/eod/{symbol}",
            params={"api_token": token, "fmt": "json", "order": "a"},
            timeout=20,
        )
        response.raise_for_status()
        data = response.json()
        if not isinstance(data, list):
            return jsonify(error="Unexpected data format"), 502
        rows = []
        for row in data:
            if not isinstance(row, dict):
                continue
            day = row.get("date")
            adjusted = row.get("adjusted_close")
            if not isinstance(day, str) or not isinstance(adjusted, (int, float)):
                continue
            rows.append({"date": day, "adjusted_close": adjusted})
        if not rows:
            return jsonify(error="No usable adjusted-close data"), 502
    except (requests.RequestException, ValueError) as exc:
        app.logger.warning("Historical data fetch failed: %s", type(exc).__name__)
        return jsonify(error="Historical data temporarily unavailable"), 502

    with cache_lock:
        cache[symbol] = (now, rows)
    return jsonify(symbol=symbol, rows=rows, cached=False)


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", "10000")))
