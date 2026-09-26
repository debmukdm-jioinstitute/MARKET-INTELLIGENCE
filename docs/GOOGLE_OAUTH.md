# Google sign-in (OAuth)

Portal **Continue with Google** uses Google OAuth 2.0 (free). Same `mi_session` cookie as email/password login.

## 1. Google Cloud Console

1. Open [Google Cloud Console](https://console.cloud.google.com/) → create or pick a project.
2. **APIs & Services → OAuth consent screen** → External → fill app name + support email → add scopes `email`, `profile`, `openid` → add test users while in Testing (or Publish when ready).
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
