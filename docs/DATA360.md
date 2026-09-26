# World Bank Data360 API

Public API: [data360.worldbank.org/en/api](https://data360.worldbank.org/en/api) · root `https://data360api.worldbank.org`

No API key. CC BY 4.0 — attribute World Bank Data360.

## What we mirror

- **Catalog** (weekly): database ids (WB_WDI, IMF_BOP, …) + full indicator id lists per database.
- **Observations** (daily cron, resumable): paginates `/data360/data` with `REF_AREA` filter into Postgres (`data360_observations`). Default countries: **India (`IND`)** and **United States (`USA`)** only.

Sync is incremental by design; monitor progress via `/api/data360`.

## Cron (Vercel)

| Route | Schedule |
|-------|----------|
| `/api/cron/data360/catalog` | Sundays 02:00 UTC |
| `/api/cron/data360` | Daily 03:45 UTC |

Both require `CRON_SECRET` (`Authorization: Bearer …`).

**First deploy:** trigger catalog once, then data sync:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" "https://getmarketintelligence.in/api/cron/data360/catalog"
curl -H "Authorization: Bearer $CRON_SECRET" "https://getmarketintelligence.in/api/cron/data360"
```

## Read API

- `GET /api/data360` — sync status + recent log
- `GET /api/data360?database=WB_WDI&indicator=WB_WDI_NY_GDP_MKTP_KD_ZG&ref_area=IND` — stored rows
- `GET /api/data360?live=1&database=WB_WDI&indicator=…` — live passthrough (max 1000/page)

## Optional env

| Variable | Default | Purpose |
|----------|---------|---------|
| `DATA360_REF_AREAS` | `IND,USA` | ISO3 reference areas to mirror |
| `DATA360_DATASETS` | (facet list) | Extra `database_id` values to catalog |
