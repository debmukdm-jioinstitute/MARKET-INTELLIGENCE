"use client";

import { cn } from "@/lib/utils";
import { X } from "lucide-react";
import { useEffect, useState } from "react";

type AppUpdate = { id: string; title: string; body: string; severity: "info" | "warning" | "critical" };

const DISMISSED_KEY = "mi.dismissedUpdateId";

export function UpdatesBanner() {
  const [update, setUpdate] = useState<AppUpdate | null>(null);
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    fetch("/api/updates/latest")
      .then((r) => r.json())
      .then((json) => {
        if (!json.update) return;
        setUpdate(json.update);
        try {
          setDismissed(localStorage.getItem(DISMISSED_KEY) === json.update.id);
        } catch {
          setDismissed(false);
        }
      })
      .catch(() => {});
  }, []);

  if (!update || dismissed) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b px-4 py-2 text-sm",
        update.severity === "critical" && "border-rose-500/40 bg-rose-500/10 text-rose-700",
        update.severity === "warning" && "border-blue-600/40 bg-blue-600/10 text-blue-600",
        update.severity === "info" && "border-border bg-secondary/40 text-foreground",
      )}
    >
      <p className="min-w-0 truncate">
        <span className="font-semibold">{update.title}</span> — {update.body}
      </p>
      <button
        type="button"
        aria-label="Dismiss"
        onClick={() => {
          setDismissed(true);
          try {
            localStorage.setItem(DISMISSED_KEY, update.id);
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 rounded p-0.5 hover:bg-black/5"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
