"use client";

import { isGuestUser, type SessionUser } from "@/lib/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthCtx = {
  user: SessionUser | null;
  ready: boolean;
  isGuest: boolean;
  requireAccount: boolean;
  guestAllowed: boolean;
  signup: (input: { name: string; email: string; password: string; acceptPrivacy: boolean }) => Promise<{ pending: boolean }>;
  verifySignup: (input: { email: string; code: string }) => Promise<void>;
  resendSignupOtp: (email: string) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  enterGuest: () => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

async function postJson(url: string, body: unknown) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? `Request failed (${res.status})`);
  return json;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);
  const [requireAccount, setRequireAccount] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // The session lives in an httpOnly cookie (real accounts are verified server-side),
    // so the client has to ask the server who's logged in rather than reading it locally.
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) {
          setUser(json.user ?? null);
          setRequireAccount(Boolean(json.requireAccount));
          // A guest never owns a book: clear anything left in this browser by a previous session.
          if (isGuestUser(json.user ?? null)) {
            try {
              window.localStorage.removeItem("mi_user_holdings_v2");
              window.dispatchEvent(new Event("mi_portfolio_updated"));
            } catch {}
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      isGuest: isGuestUser(user),
      requireAccount,
      guestAllowed: !requireAccount,
      async enterGuest() {
        const res = await fetch("/api/auth/session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ guest: true }),
        });
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          if (res.status === 403) setRequireAccount(true);
          throw new Error(typeof json.error === "string" ? json.error : `Request failed (${res.status})`);
        }
        setUser(json.user);
      },
      async signup({ name, email, password, acceptPrivacy }) {
        // Carry a referral code (?ref=) through email signup when present.
        let ref: string | undefined;
        try {
          const m = new URLSearchParams(window.location.search).get("ref");
          if (m && /^[A-Z0-9-]{3,16}$/i.test(m.trim())) ref = m.trim();
        } catch {
          /* ignore */
        }
        const json = await postJson("/api/auth/signup", { name, email, password, acceptPrivacy, ...(ref ? { ref } : {}) });
        if (json.pending) return { pending: true };
        setUser(json.user);
        return { pending: false };
      },
      async verifySignup({ email, code }) {
        const json = await postJson("/api/auth/signup/verify", { email, code });
        setUser(json.user);
      },
      async resendSignupOtp(email) {
        await postJson("/api/auth/signup/resend", { email });
      },
      async login({ email, password }) {
        const json = await postJson("/api/auth/login", { email, password });
        setUser(json.user);
      },
      async logout() {
        await fetch("/api/auth/session", { method: "DELETE" });
        setUser(null);
      },
    }),
    [user, ready, requireAccount],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
