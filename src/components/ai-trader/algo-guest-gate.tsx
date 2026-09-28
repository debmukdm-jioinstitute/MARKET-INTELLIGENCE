"use client";

import { useAuth } from "@/components/providers/auth-provider";
import type { ReactNode } from "react";

/** Hide algo desk body for guests — banner in layout handles sign-in CTA. */
export function AlgoGuestGate({ children }: { children: ReactNode }) {
  const { ready, isGuest } = useAuth();
  if (!ready || isGuest) return null;
  return <>{children}</>;
}
