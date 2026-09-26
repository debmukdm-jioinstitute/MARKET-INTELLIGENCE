# Google sign-in (OAuth)

Portal **Continue with Google** uses Google OAuth 2.0 (free). Same `mi_session` cookie as email/password login.

## 1. Google Cloud Console

Project used for production client: **`gen-lang-client-0489919833`**.

### Branding ([console link](https://console.cloud.google.com/auth/branding?project=gen-lang-client-0489919833))

| Field | Value |
|-------|--------|
| App name | `Market Intelligence` |
| User support email | Your Google account (e.g. `debmuk.dm@gmail.com`) |
| App logo | Optional: upload `public/logo.png` from this repo |
| App home page | `https://getmarketintelligence.in` |
| Privacy policy | `https://getmarketintelligence.in/privacy` |
| Terms of service | `https://getmarketintelligence.in/terms` |
| Authorized domains | `getmarketintelligence.in` (verify domain in Search Console if prompted) |

### Audience ([console link](https://console.cloud.google.com/auth/audience?project=gen-lang-client-0489919833))

- **Test users:** add emails that may sign in while the app is in Testing (e.g. `debmuk.dm@gmail.com`).
- **Publish app** when branding is complete (scopes `email`, `profile`, `openid` only — no verification for basic profile).

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project.
2. **Google Auth Platform → Branding + Audience** (or legacy **OAuth consent screen**) → External → scopes `email`, `profile`, `openid`.
3. **APIs & Services → Credentials → Create credentials → OAuth client ID** → **Web application**.
4. **Authorized JavaScript origins:** `https://getmarketintelligence.in` (and `http://localhost:3000` for local dev).
5. **Authorized redirect URIs:**
   - `https://getmarketintelligence.in/api/auth/google/callback`
   - `http://localhost:3000/api/auth/google/callback`
6. Copy **Client ID** and **Client secret**.

## 2. Environment variables

Set on Vercel (Production + Preview) and in `.env.local` for dev:

| Variable | Example |
|----------|---------|
| `GOOGLE_CLIENT_ID` | `123….apps.googleusercontent.com` |
| `GOOGLE_CLIENT_SECRET` | `GOCSPX-…` |
| `NEXT_PUBLIC_SITE_URL` | `https://getmarketintelligence.in` |
| `GOOGLE_OAUTH_REDIRECT_URI` | Optional override of callback URL |

Existing **`AUTH_SECRET`** (or `SESSION_SECRET`) and **`DATABASE_URL`** must remain set.

## 3. Behaviour

- New Google user → row in `users` with `google_sub`, no usable password (Google-only).
- Same email already registered with password → Google links to that account (`google_sub` set); password login still works.
- Email in `ADMIN_EMAILS` → admin role on Google login (same as password signup).

## 4. Routes

- Start: `GET /api/auth/google?next=/Home`
- Callback: `GET /api/auth/google/callback`
