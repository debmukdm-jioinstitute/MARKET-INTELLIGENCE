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
} from "lucide-react";

type Props = {
  onImport: (holdings: Holding[], mode: "replace" | "append") => Promise<unknown>;
};

export function ZerodhaImportDialog({ onImport }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"api" | "csv">("csv");

  // API Form State
  const [apiKey, setApiKey] = useState("");
  const [accessToken, setAccessToken] = useState("");

  // CSV Form State
  const [csvText, setCsvText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);

  // Preview & Processing State
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

  // Handle CSV file selection
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

  // Submit to backend parser/fetcher
  async function handleFetchOrParse() {
    setError(null);
    setLoading(true);

    try {
      const payload =
        tab === "api"
          ? { mode: "api", apiKey: apiKey.trim(), accessToken: accessToken.trim() }
          : { mode: "csv", csvText: csvText.trim() };

      const res = await fetch("/api/portfolio/import/zerodha", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Import failed with HTTP ${res.status}`);
      }

      if (!data.holdings || !Array.isArray(data.holdings) || data.holdings.length === 0) {
        throw new Error("No valid equity holdings found.");
      }

      setPreviewHoldings(data.holdings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import holdings");
    } finally {
      setLoading(false);
    }
  }

  // Confirm import into portfolio
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
          className="flex items-center gap-1.5 rounded-md border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs font-bold text-amber-300 hover:bg-amber-400 hover:text-black transition-colors"
        >
          <Layers className="h-3.5 w-3.5" />
          <span>Import Zerodha</span>
        </button>
      </DialogTrigger>

      <DialogContent className="max-w-2xl border-border bg-[#0a0b0e] font-sans text-foreground">
        <DialogHeader className="border-b border-border/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-amber-400 px-1.5 py-0.5 font-mono text-[10px] font-bold text-black uppercase tracking-wider">
              Broker Plugin
            </span>
            <DialogTitle className="font-heading text-lg font-bold tracking-tight text-foreground">
              Import from Zerodha
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground">
            Synchronize your holdings directly from Kite Connect or import your Zerodha Console export.
          </p>
        </DialogHeader>

        {error ? (
          <div className="flex items-center gap-2 rounded-md border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
            <p>{error}</p>
          </div>
        ) : null}

        {!previewHoldings ? (
          <div className="space-y-4 pt-1">
            <Tabs value={tab} onValueChange={(v) => setTab(v as "api" | "csv")}>
              <TabsList className="grid w-full grid-cols-2 bg-secondary/40 font-mono text-xs">
                <TabsTrigger value="csv" className="flex items-center gap-1.5 data-[state=active]:bg-amber-400 data-[state=active]:text-black font-semibold">
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  Console CSV (Free / No Fees)
                </TabsTrigger>
                <TabsTrigger value="api" className="flex items-center gap-1.5 data-[state=active]:bg-amber-400 data-[state=active]:text-black font-semibold">
                  <Key className="h-3.5 w-3.5" />
                  Kite Connect API
                </TabsTrigger>
              </TabsList>

              {/* CSV TAB */}
              <TabsContent value="csv" className="space-y-4 pt-3">
                <div className="rounded border border-dashed border-border/80 bg-secondary/20 p-4 text-center">
                  <FileSpreadsheet className="mx-auto h-8 w-8 text-amber-400/80 mb-2" />
                  <p className="font-mono text-xs text-foreground font-semibold">
                    Select Zerodha Console Holdings File
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Download <code className="text-amber-300 font-mono">holdings.csv</code> from{" "}
                    <a
                      href="https://console.zerodha.com/portfolio/holdings"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline text-amber-400 hover:text-amber-300 inline-flex items-center gap-0.5"
                    >
                      console.zerodha.com/portfolio/holdings <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </p>

                  <div className="mt-3 flex justify-center">
                    <label className="cursor-pointer rounded border border-amber-400/40 bg-amber-400/10 px-3 py-1.5 font-mono text-xs font-semibold text-amber-300 hover:bg-amber-400 hover:text-black transition-colors">
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
                  <label className="font-mono text-[11px] text-muted-foreground">
                    Or paste raw CSV text:
                  </label>
                  <textarea
                    rows={4}
                    value={csvText}
                    onChange={(e) => setCsvText(e.target.value)}
                    placeholder="Instrument,ISIN,Quantity,Average Price,..."
                    className="w-full rounded border border-border bg-card p-2 font-mono text-xs text-foreground focus:border-amber-400 focus:outline-none"
                  />
                </div>

                <Button
                  onClick={handleFetchOrParse}
                  disabled={loading || !csvText.trim()}
                  className="w-full bg-amber-400 font-mono text-xs font-bold text-black hover:bg-amber-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Parsing Zerodha File...
                    </>
                  ) : (
                    "Parse & Preview Holdings"
                  )}
                </Button>
              </TabsContent>

              {/* API TAB */}
              <TabsContent value="api" className="space-y-3 pt-3">
                <div className="rounded border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-300/90">
                  <p className="font-semibold flex items-center gap-1">
                    <Key className="h-3.5 w-3.5" /> Zerodha Kite Connect Developers
                  </p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Enter your active Kite Connect API Key and daily session Access Token. (Kite requires a ₹2,000/mo API subscription from developers).
                  </p>
                </div>

                <div className="space-y-2">
                  <div>
                    <label className="font-mono text-[11px] text-muted-foreground">
                      Kite API Key
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. 8k3j0a9z..."
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[11px] text-muted-foreground">
                      Kite Access Token
                    </label>
                    <Input
                      type="password"
                      placeholder="e.g. h6j7k8m9..."
                      value={accessToken}
                      onChange={(e) => setAccessToken(e.target.value)}
                      className="font-mono text-xs"
                    />
                  </div>
                </div>

                <Button
                  onClick={handleFetchOrParse}
                  disabled={loading || !apiKey.trim() || !accessToken.trim()}
                  className="w-full bg-amber-400 font-mono text-xs font-bold text-black hover:bg-amber-300"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                      Connecting to Kite Trade...
                    </>
                  ) : (
                    "Fetch Live Holdings from Kite"
                  )}
                </Button>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          /* PREVIEW SCREEN */
          <div className="space-y-4 pt-1">
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/70 bg-secondary/30 p-2.5 font-mono text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-foreground">
                  {previewHoldings.length} Positions Parsed
                </span>
              </div>
              <div className="text-muted-foreground">
                Total Invested:{" "}
                <span className="font-bold text-amber-300">
                  ₹{(totalInvested / 100_000).toFixed(2)} Lakh
                </span>
              </div>
            </div>

            {/* PREVIEW TABLE */}
            <div className="max-h-60 overflow-y-auto rounded border border-border/80 bg-card">
              <table className="w-full text-left font-mono text-xs">
                <thead className="sticky top-0 border-b border-border bg-secondary/80 text-[10px] uppercase text-muted-foreground">
                  <tr>
                    <th className="p-2">Symbol</th>
                    <th className="p-2">Name</th>
                    <th className="p-2 text-right">Shares</th>
                    <th className="p-2 text-right">Avg Cost</th>
                    <th className="p-2 text-right">Total Cost</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {previewHoldings.map((h, i) => (
                    <tr key={h.id || i} className="hover:bg-secondary/20">
                      <td className="p-2 font-bold text-amber-300">{h.symbol}</td>
                      <td className="p-2 text-muted-foreground truncate max-w-[140px]">
                        {h.name}
                      </td>
                      <td className="p-2 text-right">{h.shares.toLocaleString()}</td>
                      <td className="p-2 text-right">₹{h.avgCost.toFixed(2)}</td>
                      <td className="p-2 text-right text-foreground font-semibold">
                        ₹{((h.shares * h.avgCost) / 1000).toFixed(1)}k
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* IMPORT MODE CONTROLS */}
            <div className="rounded border border-border/60 bg-secondary/20 p-3 text-xs space-y-2">
              <span className="font-mono text-[11px] font-semibold text-muted-foreground">
                Select Import Mode:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <label
                  onClick={() => setImportMode("replace")}
                  className={`flex cursor-pointer items-center gap-2 rounded border p-2 font-mono text-xs transition-colors ${
                    importMode === "replace"
                      ? "border-amber-400 bg-amber-400/10 text-amber-300"
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
                    <p className="text-[10px] opacity-80">Wipes current demo holdings</p>
                  </div>
                </label>

                <label
                  onClick={() => setImportMode("append")}
                  className={`flex cursor-pointer items-center gap-2 rounded border p-2 font-mono text-xs transition-colors ${
                    importMode === "append"
                      ? "border-amber-400 bg-amber-400/10 text-amber-300"
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
                    <p className="text-[10px] opacity-80">Combines with current book</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={resetState}
                className="w-1/3 border-border font-mono text-xs text-muted-foreground"
              >
                Back
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={committing}
                className="w-2/3 bg-amber-400 font-mono text-xs font-bold text-black hover:bg-amber-300"
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
