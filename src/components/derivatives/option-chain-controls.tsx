"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OPTION_UNDERLYINGS } from "@/lib/feeds/india/instruments";
import { useMemo, useState } from "react";

export function OptionChainControls({
  underlyingKey,
  onUnderlyingChange,
  expiry,
  expiries,
  onExpiryChange,
  expiriesLoading,
}: {
  underlyingKey: string;
  onUnderlyingChange: (key: string) => void;
  expiry: string;
  expiries: string[];
  onExpiryChange: (expiry: string) => void;
  expiriesLoading: boolean;
}) {
  const [kind, setKind] = useState<"index" | "stock">("index");
  const options = useMemo(
    () => OPTION_UNDERLYINGS.filter((u) => u.kind === kind),
    [kind],
  );

  return (
    <div className="flex flex-wrap items-center gap-3">
      <Tabs value={kind} onValueChange={(v) => setKind(v as "index" | "stock")}>
        <TabsList>
          <TabsTrigger value="index">Index</TabsTrigger>
          <TabsTrigger value="stock">Stocks</TabsTrigger>
        </TabsList>
      </Tabs>

      <Select value={underlyingKey} onValueChange={onUnderlyingChange}>
        <SelectTrigger className="h-9 w-[180px]">
          <SelectValue placeholder="Underlying" />
        </SelectTrigger>
        <SelectContent>
          {options.map((u) => (
            <SelectItem key={u.key} value={u.key}>
              {u.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={expiry} onValueChange={onExpiryChange} disabled={expiriesLoading || !expiries.length}>
        <SelectTrigger className="h-9 w-[150px]">
          <SelectValue placeholder={expiriesLoading ? "Loading…" : "Expiry"} />
        </SelectTrigger>
        <SelectContent>
          {expiries.map((e) => (
            <SelectItem key={e} value={e}>
              {e}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
