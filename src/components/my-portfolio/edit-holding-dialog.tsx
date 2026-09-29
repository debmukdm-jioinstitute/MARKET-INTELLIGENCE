"use client";

import type { PositionRow } from "@/lib/my-portfolio/types";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";

export function EditHoldingDialog({
  row,
  open,
  onOpenChange,
  onSave,
}: {
  row: PositionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (id: string, patch: { shares: number; avgCost: number }) => Promise<unknown>;
}) {
  const [shares, setShares] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && row) {
      setShares(String(row.shares));
      setAvgCost(String(row.avgCost));
      setError(null);
    }
  }, [open, row]);

  async function submit() {
    if (!row) return;
    const sharesN = Number(shares);
    const avgN = Number(avgCost);
    if (!sharesN || sharesN <= 0 || !avgN || avgN <= 0) {
      setError("Enter valid shares and average cost.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await onSave(row.id, { shares: sharesN, avgCost: avgN });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {row?.symbol ?? "holding"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input type="number" placeholder="Shares" value={shares} onChange={(e) => setShares(e.target.value)} />
          <Input
            type="number"
            placeholder={`Avg cost (${row?.currency ?? "INR"})`}
            value={avgCost}
            onChange={(e) => setAvgCost(e.target.value)}
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button onClick={() => void submit()} disabled={busy}>
            {busy ? "Saving…" : "Save changes"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
