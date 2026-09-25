# OmniRoute — site assistant LLM gateway

The portal **site assistant** (`/api/site-assistant`) calls an OpenAI-compatible gateway. [OmniRoute](https://github.com/diegosouzapw/OmniRoute) is the primary path; Groq is used when OmniRoute is unreachable or not configured.

## Local development

1. Install and start OmniRoute (default API port **20128**):

   ```bash
   npm install -g omniroute
   omniroute
   ```

   Or Docker:

   ```bash
   docker run -d --name omniroute --restart unless-stopped \
     -p 127.0.0.1:20128:20128 \
     -v omniroute-data:/app/data \
     diegosouzapw/omniroute:latest
   ```

2. Open `http://localhost:20128`, connect at least one free provider, and copy the API key from **Dashboard → Endpoints**.

3. Set environment variables for Next.js (`.env.local` or Vercel):

   | Variable | Example | Purpose |
   |----------|---------|---------|
   | `OMNIROUTE_BASE_URL` | `http://127.0.0.1:20128/v1` | OpenAI-compatible base URL (must be reachable from the **Next server**, not the browser) |
   | `OMNIROUTE_API_KEY` | from dashboard | Bearer token for OmniRoute |
   | `OMNIROUTE_MODEL` | `auto/fast` | Primary model id (latency-first widget default) |
   | `OMNIROUTE_FALLBACK_MODEL` | `openai/gpt-oss-20b` | Second tier via OmniRoute → Groq (smaller free model) |
   | `GROQ_API_KEY` | optional | Groq upstream in OmniRoute + **direct Groq** if the gateway is down |
   | `SITE_ASSISTANT_GROQ_MODEL` | `openai/gpt-oss-120b` | Third tier: direct Groq model (bypasses OmniRoute) |

4. Run the app: `npm run dev`. The floating assistant appears on all portal pages.

### Fallback chain (site assistant)

Each request probes tiers in order until one responds:

1. **OmniRoute** + `OMNIROUTE_MODEL` (`auto/fast` — free-tier pool)
2. **OmniRoute** + `OMNIROUTE_FALLBACK_MODEL` (`openai/gpt-oss-20b` on your Groq connection)
3. **Direct Groq** + `SITE_ASSISTANT_GROQ_MODEL` (`openai/gpt-oss-120b`) if the gateway is down

Check which tier served a reply via the `X-MI-Assistant-Provider` response header (`omniroute`, `omniroute-groq-fallback`, or `groq-direct`).

To add a **third provider** (e.g. OpenRouter `:free`, Cerebras, Gemini), connect it in the OmniRoute dashboard → **Providers**, then set `OMNIROUTE_FALLBACK_MODEL` to that model id.

## Production

Vercel cannot reach `localhost` on your machine. Run OmniRoute on a VPS, bind to a private interface, and set `OMNIROUTE_BASE_URL` to that host (Tailscale, internal DNS, or authenticated reverse proxy). Never expose the OmniRoute dashboard or unauthenticated `/v1` to the public internet.

## Verify

```bash
curl -s "$OMNIROUTE_BASE_URL/models" -H "Authorization: Bearer $OMNIROUTE_API_KEY" | head
```

Quick chat:

```bash
curl -s "$OMNIROUTE_BASE_URL/chat/completions" \
  -H "Authorization: Bearer $OMNIROUTE_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"auto/fast","messages":[{"role":"user","content":"Say OK"}],"max_tokens":16}'
```
