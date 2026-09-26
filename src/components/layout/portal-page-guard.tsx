"use client";

import { usePortalPages } from "@/components/providers/portal-page-provider";
import { HardHat, Home, Lock } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

function PageShell({
  icon: Icon,
  title,
  body,
  tone,
}: {
  icon: typeof Lock;
  title: string;
  body: string;
  tone: "muted" | "warn";
}) {
  return (
    <div className="mx-auto flex max-w-lg flex-col items-center gap-4 py-16 text-center">
      <div
        className={
          tone === "warn"
            ? "flex size-14 items-center justify-center rounded-2xl bg-amber-500/15 text-amber-700"
            : "flex size-14 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
        }
      >
        <Icon className="size-7" aria-hidden />
      </div>
      <h1 className="font-heading text-xl font-bold text-foreground">{title}</h1>
      <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
      <Link
        href="/Home"
        className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
      >
        <Home className="size-4" aria-hidden />
        Back to dashboard
      </Link>
    </div>
  );
}

export function PortalPageGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { accessForPath, bypass, loading, configured } = usePortalPages();

  if (bypass) return children;

  if (loading && configured) {
    return <p className="py-8 text-center text-sm text-muted-foreground">Loading…</p>;
  }

  const access = accessForPath(pathname);

  if (!access.enabled) {
    return (
      <PageShell
        icon={Lock}
        title="Page unavailable"
        body="This section is turned off on the live site. If you need access, contact your administrator."
        tone="muted"
      />
    );
  }

  if (access.locked) {
    return (
      <PageShell
        icon={HardHat}
        title="Under construction"
        body={access.lockMessage}
        tone="warn"
      />
    );
  }

  return children;
}
