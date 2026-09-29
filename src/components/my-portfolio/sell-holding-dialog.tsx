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

export function SellHoldingDialog({
  row,
  open,
  onOpenChange,
  onSell,
}: {
  row: PositionRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSell: (id: string, input: { shares: number; price: number; tradeDate?: string }) => Promise<unknown>;
}) {
  const [shares, setShares] = useState("");
  const [price, setPrice] = useState("");
  const [tradeDate, setTradeDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && row) {
      setShares(String(row.shares));
      setPrice(String(row.last));
      setTradeDate(new Date().toISOString().slice(0, 10));
      setError(null);
    }
  }, [open, row]);

  async function submit() {
    if (!row) return;
    const sharesN = Number(shares);
    const priceN = Number(price);
    if (!sharesN || sharesN <= 0 || sharesN > row.shares || !priceN || priceN <= 0) {
      setError("Enter valid sell quantity and price.");
      return;
    }
    setBusy(true);
    try {
      await onSell(row.id, { shares: sharesN, price: priceN, tradeDate });
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sell failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Sell {row?.symbol ?? "holding"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <Input type="number" placeholder="Shares to sell" value={shares} onChange={(e) => setShares(e.target.value)} />
          <Input
            type="number"
            placeholder={`Sell price (${row?.currency ?? "INR"})`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
          <Input type="date" value={tradeDate} onChange={(e) => setTradeDate(e.target.value)} />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <Button variant="destructive" onClick={() => void submit()} disabled={busy}>
            {busy ? "Recording…" : "Confirm sell"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
