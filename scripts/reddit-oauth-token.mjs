#!/usr/bin/env node
/**
 * One-time: obtain Reddit refresh token for Vercel (script app at reddit.com/prefs/apps).
 *
 *   export REDDIT_CLIENT_ID=...
 *   export REDDIT_CLIENT_SECRET=...
 *   export REDDIT_USERNAME=your_reddit_username
 *   export REDDIT_PASSWORD=your_reddit_password
 *   node scripts/reddit-oauth-token.mjs
 *
 * Then add to Vercel Production:
 *   vercel env add REDDIT_CLIENT_ID production
 *   vercel env add REDDIT_CLIENT_SECRET production
 *   vercel env add REDDIT_REFRESH_TOKEN production   # if script prints one
 * Or use password grant vars REDDIT_USERNAME + REDDIT_PASSWORD instead of refresh token.
 */
const id = process.env.REDDIT_CLIENT_ID?.trim();
const secret = process.env.REDDIT_CLIENT_SECRET?.trim();
const user = process.env.REDDIT_USERNAME?.trim();
const pass = process.env.REDDIT_PASSWORD?.trim();
const ua =
  process.env.REDDIT_USER_AGENT?.trim() ||
  "web:market-intelligence:v1.0.0 (+https://getmarketintelligence.in)";

if (!id || !secret || !user || !pass) {
  console.error("Need REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD");
  process.exit(1);
}

const basic = Buffer.from(`${id}:${secret}`).toString("base64");
const body = new URLSearchParams({
  grant_type: "password",
  username: user,
  password: pass,
  scope: "read",
}).toString();

const res = await fetch("https://www.reddit.com/api/v1/access_token", {
  method: "POST",
  headers: {
    Authorization: `Basic ${basic}`,
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": ua,
  },
  body,
});
const json = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error("Token failed:", res.status, json);
  process.exit(1);
}
console.log("access_token (short-lived):", json.access_token?.slice(0, 12) + "...");
if (json.refresh_token) console.log("REDDIT_REFRESH_TOKEN=", json.refresh_token);
else console.log("No refresh_token — set REDDIT_USERNAME + REDDIT_PASSWORD on Vercel instead.");

const test = await fetch(
  "https://oauth.reddit.com/r/IndiaInvestments/search?q=RELIANCE&restrict_sr=on&sort=new&t=week&limit=3&raw_json=1",
  {
    headers: { Authorization: `Bearer ${json.access_token}`, "User-Agent": ua },
  },
);
console.log("oauth search probe:", test.status, test.headers.get("content-type"));
