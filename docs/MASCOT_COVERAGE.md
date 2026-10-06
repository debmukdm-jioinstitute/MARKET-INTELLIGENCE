# Mi mascot and driver nudges: coverage map

Base URL: https://getmarketintelligence.in (https://www.getmarketintelligence.in redirects here).

## Mi mascot

| Where | Behaviour |
| --- | --- |
| https://getmarketintelligence.in/ | Section-aware guide (hero to founder), pointing pose docks right on "point" tips |
| Every public and portal page except those below | Route tip from `src/components/mascot/mascot-tips.ts`, fallback tip otherwise (mounted once in `src/app/layout.tsx`) |
| https://getmarketintelligence.in/research/SYMBOL | Dynamic tip from the driver engine (for example crude for RELIANCE) |
| Not covered | `/admin/*`, `/loader-preview`, API routes |

## Driver nudges (rule-based, no LLM)

Engine: `src/lib/guide/driver-rules.ts`. Hook: `src/hooks/use-driver-nudges.ts`. Card: `src/components/guide/driver-nudges.tsx`.

| Page | Status |
| --- | --- |
| https://getmarketintelligence.in/research/SYMBOL | Live |
| https://getmarketintelligence.in/markets/india/SYMBOL | Not yet |
| https://getmarketintelligence.in/research/model/SYMBOL | Not yet |
| https://getmarketintelligence.in/portfolio (holdings) | Not yet |
| https://getmarketintelligence.in/intelligence/scanner | Not yet |
