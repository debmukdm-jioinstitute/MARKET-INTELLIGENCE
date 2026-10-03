"use client";
import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/format";
import { useState } from "react";
export async function loadCompetition<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Competition unavailable.");
  return data;
}
export async function sendCompetition(url: string, body: object) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Please retry.");
  return data;
}
export const money = (value: number | null | undefined) =>
  value == null ? "—" : formatInr(value);
export const percent = (value: number | null | undefined) =>
  value == null ? "—" : `${value > 0 ? "+" : ""}${value.toFixed(2)}%`;
export function StatusMessage({ error }: { error: unknown }) {
  return error ? (
    <p
      role="alert"
      className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800"
    >
      {error instanceof Error ? error.message : String(error)}
    </p>
  ) : null;
}
export function ActionButton({
  run,
  children,
  onSuccess,
}: {
  run: () => Promise<unknown>;
  children: React.ReactNode;
  onSuccess?: () => void;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null);
  return (
    <div className="space-y-2">
      <Button
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError(null);
          try {
            await run();
            onSuccess?.();
          } catch (e) {
            setError(e);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Working…" : children}
      </Button>
      <StatusMessage error={error} />
    </div>
  );
}
