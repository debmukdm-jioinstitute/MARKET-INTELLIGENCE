"use client";

import { AppShell } from "@/components/layout/app-shell";

export function TerminalLayout({ children }: { children: React.ReactNode }) {
  return <AppShell>{children}</AppShell>;
}
