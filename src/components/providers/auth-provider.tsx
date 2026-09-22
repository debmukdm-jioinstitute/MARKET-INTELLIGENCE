"use client";

import { isGuestUser, type SessionUser } from "@/lib/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthCtx = {
  user: SessionUser | null;
  ready: boolean;
  isGuest: boolean;
  signup: (input: { name: string; email: string; password: string }) => Promise<void>;
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

  useEffect(() => {
    let cancelled = false;
    // The session lives in an httpOnly cookie (real accounts are verified server-side),
    // so the client has to ask the server who's logged in rather than reading it locally.
    fetch("/api/auth/session")
      .then((res) => res.json())
      .then((json) => {
        if (!cancelled) setUser(json.user ?? null);
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
      async enterGuest() {
        const json = await postJson("/api/auth/session", { guest: true });
        setUser(json.user);
      },
      async signup({ name, email, password }) {
        const json = await postJson("/api/auth/signup", { name, email, password });
        setUser(json.user);
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
    [user, ready],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
