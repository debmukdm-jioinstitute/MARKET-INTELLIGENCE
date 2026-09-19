"use client";

import {
  hashPassword,
  persistCookie,
  readSession,
  readUsers,
  writeSession,
  writeUsers,
  type SessionUser,
} from "@/lib/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

type AuthCtx = {
  user: SessionUser | null;
  ready: boolean;
  signup: (input: { name: string; email: string; password: string }) => Promise<void>;
  login: (input: { email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthCtx | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<SessionUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const session = readSession();
    setUser(session);
    setReady(true);
    if (session) void persistCookie(session);
  }, []);

  const value = useMemo<AuthCtx>(
    () => ({
      user,
      ready,
      async signup({ name, email, password }) {
        const users = readUsers();
        const key = email.trim().toLowerCase();
        if (users.some((u) => u.email === key)) throw new Error("An account with that email already exists.");
        if (password.length < 6) throw new Error("Password must be at least 6 characters.");
        const record = {
          name: name.trim() || "Investor",
          email: key,
          passwordHash: await hashPassword(password),
          createdAt: new Date().toISOString(),
        };
        writeUsers([...users, record]);
        const session = { name: record.name, email: record.email };
        writeSession(session);
        await persistCookie(session);
        setUser(session);
      },
      async login({ email, password }) {
        const key = email.trim().toLowerCase();
        const match = readUsers().find((u) => u.email === key);
        if (!match || match.passwordHash !== (await hashPassword(password))) {
          throw new Error("Invalid email or password.");
        }
        const session = { name: match.name, email: match.email };
        writeSession(session);
        await persistCookie(session);
        setUser(session);
      },
      async logout() {
        writeSession(null);
        await persistCookie(null);
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
