# Algo desk — AI models page (archived)

Removed from production Next.js app (`/algo/ai` no longer routed on getmarketintelligence.in).

## Contents

- `page.tsx` — former `src/app/(portal)/algo/ai/page.tsx` (RL + macro/strategy model status UI).

## Dependencies (if you revive this page)

- `@/components/ai-trader/algo-desk-shell`, `algo-desk-ui`
- `@/lib/ai-trader/api` → `fetchJSON`, `RLStatus` (type archived below)
- Backend: `GET /api/rl/status` on **AI-trader** service (`services/ai-trader/backend/app.py`, proxied via `/api/ai-trader/*` when deployed)

## RLStatus type (was in `src/lib/ai-trader/api.ts`)

```ts
export interface RLStatus {
  tabular?: { states: number; episodes: number; policy: Record<string, number> };
  dqn?: { episodes: number; training_steps: number; epsilon: number; params: number };
}
```

## Training / models

Python training scripts and `models/saved/*` live under `services/ai-trader/` — unchanged; only the **portal page** was detached from the main site.
