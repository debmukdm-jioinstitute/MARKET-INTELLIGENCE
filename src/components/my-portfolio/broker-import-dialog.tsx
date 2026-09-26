"use client";

import { useState } from "react";
import type { Holding } from "@/lib/my-portfolio/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Key,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ExternalLink,
  Layers,
  RefreshCw,
  Building2,
} from "lucide-react";

type BrokerType = "zerodha" | "dhan" | "upstox";

type Props = {
  onImport: (holdings: Holding[], mode: "replace" | "append") => Promise<unknown>;
};

export function BrokerImportDialog({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [broker, setBroker] = useState<BrokerType>("zerodha");
  const [tab, setTab] = useState<"api" | "csv">("csv");

  // Form States
  const [apiKey, setApiKey] = useState(""); // Zerodha Kite
  const [accessToken, setAccessToken] = useState(""); // Zerodha / Dhan / Upstox
  const [clientId, setClientId] = useState(""); // Dhan Client ID

  // CSV States
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  // Preview & Processing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHoldings, setPreviewHoldings] = useState<Holding[] | null>(null);
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [committing, setCommitting] = useState(false);

  function resetState() {
    setPreviewHoldings(null);
    setError(null);
    setLoading(false);
    setCommitting(false);
  }

  function handleBrokerChange(b: BrokerType) {
    setBroker(b);
    resetState();
    setFileName(null);
    setCsvText("");
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setCsvText(text || "");
    };
    reader.onerror = () => {
      setError("Failed to read the selected CSV file.");
    };
    reader.readAsText(file);
  }

  async function handleFetchOrParse() {
    setError(null);
    setLoading(true);

    try {
      const endpoint = `/api/portfolio/import/${broker}`;
      let payload: Record<string, unknown> = {};

      if (broker === "zerodha") {
        payload =
          tab === "api"
            ? { mode: "api", apiKey: apiKey.trim(), accessToken: accessToken.trim() }
            : { mode: "csv", csvText: csvText.trim() };
      } else if (broker === "dhan") {
        payload =
          tab === "api"
            ? { mode: "api", clientId: clientId.trim(), accessToken: accessToken.trim() }
            : { mode: "csv", csvText: csvText.trim() };
      } else if (broker === "upstox") {
        payload =
          tab === "api"
            ? { mode: "api", accessToken: accessToken.trim() }
            : { mode: "csv", csvText: csvText.trim() };
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Import failed with HTTP ${res.status}`);
      }

      if (!data.holdings || !Array.isArray(data.holdings) || data.holdings.length === 0) {
        throw new Error("No valid equity holdings found in broker response.");
      }

      setPreviewHoldings(data.holdings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import holdings");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirmImport() {
    if (!previewHoldings || previewHoldings.length === 0) return;
    setCommitting(true);
    setError(null);

    try {
      await onImport(previewHoldings, importMode);
      setOpen(false);
      resetState();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save holdings");
    } finally {
      setCommitting(false);
    }
  }

  const totalInvested =
    previewHoldings?.reduce((sum, h) => sum + h.shares * h.avgCost, 0) ?? 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 rounded-full border border-blue-600/40 bg-blue-600/10 px-3.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600 hover:text-white transition-colors"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Import from Broker</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto rounded-2xl border-border bg-card font-sans text-foreground">
        <DialogHeader className="border-b border-border/80 pr-7 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-blue-600 px-2 py-0.5 text-sm font-bold text-white uppercase tracking-wide">
              Broker Gateway
            </span>
            <DialogTitle className="font-heading text-lg leading-snug font-bold tracking-tight text-foreground">
              Import Holdings into Portfolio Desk
            </DialogTitle>
          </div>
          <p className="text-sm text-muted-foreground">
            Directly connect your broker account or upload export files to run attribution, risk, and macro stress tests.
          </p>
        </DialogHeader>

        {error ? (
          <div className="flex items-center gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-600">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        ) : null}

        {!previewHoldings ? (
          <div className="space-y-4 pt-1">
            {/* BROKER SELECTOR */}
            <div>
              <label className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                1. Select Indian Broker
              </label>
              <div className="grid grid-cols-3 gap-2 mt-1.5">
                <button
                  type="button"
                  onClick={() => handleBrokerChange("zerodha")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm transition-colors ${
                    broker === "zerodha"
                      ? "border-blue-600 bg-blue-600/10 text-blue-600 font-bold"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <Building2 className="h-4 w-4 mb-1" />
                  <span>Zerodha Kite</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBrokerChange("dhan")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm transition-colors ${
                    broker === "dhan"
                      ? "border-blue-600 bg-blue-600/10 text-blue-600 font-bold"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <Building2 className="h-4 w-4 mb-1" />
                  <span>Dhan HQ</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleBrokerChange("upstox")}
                  className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm transition-colors ${
                    broker === "upstox"
                      ? "border-blue-600 bg-blue-600/10 text-blue-600 font-bold"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <Building2 className="h-4 w-4 mb-1" />
                  <span>Upstox Pro</span>
                </button>
              </div>
            </div>

            {/* CONNECTION METHOD TABS */}
            <Tabs value={tab} onValueChange={(v) => setTab(v as "api" | "csv")}>
              <TabsList className="grid h-auto w-full grid-cols-2 gap-1 rounded-xl bg-secondary/40 text-sm">
                <TabsTrigger
                  value="csv"
                  className="flex h-auto min-w-0 items-center justify-center gap-1.5 whitespace-normal rounded-lg py-1.5 text-center leading-tight data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">CSV File Export</span>
                </TabsTrigger>
                <TabsTrigger
                  value="api"
                  className="flex h-auto min-w-0 items-center justify-center gap-1.5 whitespace-normal rounded-lg py-1.5 text-center leading-tight data-[state=active]:bg-blue-600 data-[state=active]:text-white font-semibold"
                >
                  <Key className="h-3.5 w-3.5 shrink-0" />
                  <span className="min-w-0">Broker API Sync</span>
                </TabsTrigger>
              </TabsList>

              {/* CSV TAB */}
              <TabsContent value="csv" className="space-y-4 pt-3">
                <div className="rounded-xl border border-dashed border-border/80 bg-secondary/20 p-4 text-center">
                  <FileSpreadsheet className="mx-auto h-8 w-8 text-blue-600/80 mb-2" />
                  <p className="text-sm text-foreground font-semibold">
                    Select {broker === "zerodha" ? "Zerodha Console" : broker === "dhan" ? "Dhan Web" : "Upstox"} Holdings CSV
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {broker === "zerodha" ? (
                      <>
                        Download <code className="text-blue-600">holdings.csv</code> from{" "}
                        <a
                          href="https://console.zerodha.com/portfolio/holdings"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-600 hover:text-blue-600 inline-flex items-center gap-0.5"
                        >
                          console.zerodha.com/portfolio/holdings <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </>
                    ) : broker === "dhan" ? (
                      <>
                        Download portfolio holdings CSV from{" "}
                        <a
                          href="https://web.dhan.co"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-blue-600 hover:text-blue-600 inline-flex items-center gap-0.5"
                        >
                          web.dhan.co Portfolio <ExternalLink className="h-2.5 w-2.5" />
                        </a>
                      </>
                    ) : (
                      <>
                        Export portfolio holdings CSV from your Upstox Pro web portal.
                      </>
                    )}
                  </p>

                  <div className="mt-3 flex justify-center">
                    <label className="cursor-pointer rounded-full border border-blue-600/40 bg-blue-600/10 px-3.5 py-1.5 text-sm font-semibold text-blue-600 hover:bg-blue-600 hover:text-white transition-colors">
                      {fileName ? fileName : "Browse CSV File..."}
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleFileUpload}
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm text-muted-foreground">
                    Or paste raw CSV text:
                  </label>
                  <textarea
                    rows={4}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Instrument/Symbol,ISIN,Quantity,Average Price,..."
                    className="w-full rounded-xl border border-border bg-card p-3 text-sm text-foreground focus:border-blue-600 focus:outline-none"
                  />
                </div>

                <Button
                  onClick={handleFetchOrParse}
                  disabled={loading || !csvText.trim()}
                  className="w-full rounded-full bg-blue-600 text-sm font-bold text-white hover:bg-blue-600"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Parsing {broker.toUpperCase()} File...
                    </>
                  ) : (
                    `Parse & Preview ${broker.toUpperCase()} Holdings`
                  )}
                </Button>
              </TabsContent>

              {/* API TAB */}
              <TabsContent value="api" className="space-y-3 pt-3">
                {broker === "zerodha" && (
                  <>
                    <div className="rounded-xl border border-blue-600/20 bg-blue-600/5 p-3 text-sm text-blue-600/90">
                      <p className="font-semibold flex items-center gap-1">
                        <Key className="h-3.5 w-3.5" /> Zerodha Kite Connect API
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Requires developer Kite Connect app (₹2,000/mo). For free import, use the CSV tab above.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Kite API Key</label>
                        <Input
                          type="text"
                          placeholder="e.g. 8k3j0a9z..."
                          value={apiKey}
                          onChange={(e) => setApiKey(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Kite Access Token</label>
                        <Input
                          type="password"
                          placeholder="e.g. h6j7k8m9..."
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {broker === "dhan" && (
                  <>
                    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-sm text-emerald-600/90">
                      <p className="font-semibold flex items-center gap-1">
                        <Key className="h-3.5 w-3.5" /> Dhan HQ API (100% Free)
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Generate your free access token at{" "}
                        <a
                          href="https://web.dhan.co"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="underline text-emerald-600 hover:text-emerald-600"
                        >
                          web.dhan.co
                        </a>{" "}
                        &rarr; Profile &rarr; Access Token.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Dhan Client ID</label>
                        <Input
                          type="text"
                          placeholder="e.g. 1000000001"
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                      <div>
                        <label className="text-sm text-muted-foreground">Dhan Access Token (JWT)</label>
                        <Input
                          type="password"
                          placeholder="Paste Dhan Access Token..."
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                {broker === "upstox" && (
                  <>
                    <div className="rounded-xl border border-sky-400/20 bg-sky-400/5 p-3 text-sm text-sky-300/90">
                      <p className="font-semibold flex items-center gap-1">
                        <Key className="h-3.5 w-3.5" /> Upstox API v2
                      </p>
                      <p className="mt-0.5 text-sm text-muted-foreground">
                        Enter your active Upstox Bearer Access Token generated via Upstox Developer Console.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <label className="text-sm text-muted-foreground">Upstox Access Token</label>
                        <Input
                          type="password"
                          placeholder="Paste Upstox Bearer Token..."
                          value={accessToken}
                          onChange={(e) => setAccessToken(e.target.value)}
                          className="text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                <Button
                  onClick={handleFetchOrParse}
                  disabled={
                    loading ||
                    (broker === "zerodha" && (!apiKey.trim() || !accessToken.trim())) ||
                    (broker === "dhan" && (!clientId.trim() || !accessToken.trim())) ||
                    (broker === "upstox" && !accessToken.trim())
                  }
                  className="w-full rounded-full bg-blue-600 text-sm font-bold text-white hover:bg-blue-600 mt-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Connecting to {broker.toUpperCase()} API...
                    </>
                  ) : (
                    `Fetch Live Holdings from ${broker.toUpperCase()}`
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* PREVIEW SCREEN */
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/70 bg-secondary/30 p-3 text-sm">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="font-bold text-foreground">
                  {previewHoldings.length} Positions from {broker.toUpperCase()}
                </span>
              </div>
              <div className="text-muted-foreground">
                Total Invested:{" "}
                <span className="font-bold text-blue-600">
                  ₹{(totalInvested / 100_000).toFixed(2)} Lakh
                </span>
              </div>
            </div>

            {/* PREVIEW TABLE */}
            <div className="max-h-60 overflow-y-auto rounded-xl border border-border/80 bg-card">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 border-b border-border bg-secondary/80 text-sm uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2.5">Symbol</th>
                    <th className="p-2.5">Name</th>
                    <th className="p-2.5 text-right">Shares</th>
                    <th className="p-2.5 text-right">Avg Cost</th>
                    <th className="p-2.5 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {previewHoldings.map((h, i) => (
                    <tr key={h.id || i} className="hover:bg-secondary/20">
                      <td className="p-2.5 font-bold text-blue-600">{h.symbol}</td>
                      <td className="p-2.5 text-muted-foreground truncate max-w-[140px]">
                        {h.name}
                      </td>
                      <td className="p-2.5 text-right">{h.shares.toLocaleString()}</td>
                      <td className="p-2.5 text-right">₹{h.avgCost.toFixed(2)}</td>
                      <td className="p-2.5 text-right text-foreground font-semibold">
                        ₹{((h.shares * h.avgCost) / 1000).toFixed(1)}k
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* IMPORT MODE CONTROLS */}
            <div className="rounded-xl border border-border/60 bg-secondary/20 p-3.5 text-sm space-y-2">
              <span className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Select Import Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <label
                  onClick={() => setImportMode("replace")}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors ${
                    importMode === "replace"
                      ? "border-blue-600 bg-blue-600/10 text-blue-600"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="hidden"
                  />
                  <RefreshCw className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="font-bold">Replace Book</p>
                    <p className="text-sm opacity-80">Wipes current demo holdings</p>
                  </div>
                </label>

                <label
                  onClick={() => setImportMode("append")}
                  className={`flex cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-sm transition-colors ${
                    importMode === "append"
                      ? "border-blue-600 bg-blue-600/10 text-blue-600"
                      : "border-border text-muted-foreground"
                  }`}
                >
                  <input
                    type="radio"
                    name="mode"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                    className="hidden"
                  />
                  <Layers className="h-3.5 w-3.5 shrink-0" />
                  <div>
                    <p className="font-bold">Merge / Append</p>
                    <p className="text-sm opacity-80">Combines with current book</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetState}
                className="w-1/3 rounded-full border-border text-sm text-muted-foreground"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={committing}
                className="w-2/3 rounded-full bg-blue-600 text-sm font-bold text-white hover:bg-blue-600"
              >
                {committing ? (
                  <>
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                    Calculating Metrics...
                  </>
                ) : (
                  `Confirm Import (${previewHoldings.length} Positions)`
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
