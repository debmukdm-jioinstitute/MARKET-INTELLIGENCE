# AI-trader Flask API (Python 3.13). Connect to Tiger Cloud / Timescale via DB_* env.
FROM python:3.13-slim-bookworm

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends libpq-dev gcc g++ \
  && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt \
  && pip install --no-cache-dir flask flask-cors gunicorn "psycopg[binary]"

COPY . .

ENV NUMBA_CACHE_DIR=/tmp/numba \
  PORT=5050 \
  PYTHONUNBUFFERED=1

RUN mkdir -p /tmp/numba logs models/saved

EXPOSE 5050

HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 \
  CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:5050/api/state', timeout=3)"

CMD python -c "from database.db import init_db; init_db()" ; exec python backend/app.py
