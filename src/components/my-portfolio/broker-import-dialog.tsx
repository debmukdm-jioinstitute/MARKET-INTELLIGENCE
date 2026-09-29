"use client";

import { useState, useRef, useTransition } from "react";
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
  UploadCloud,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Layers,
  RefreshCw,
  Trash2,
  HelpCircle,
  Download,
  Search,
  Sparkles,
  Building,
} from "lucide-react";

type Props = {
  onImport: (holdings: Holding[], mode: "replace" | "append") => Promise<unknown>;
  triggerLabel?: string;
};

const BROKER_OPTIONS = [
  { value: "auto", label: "Auto-detect brokerage (recommended)" },
  { value: "Zerodha", label: "Zerodha (Console / Tradebook)" },
  { value: "Groww", label: "Groww (Holdings / Stock Orders)" },
  { value: "Angel One", label: "Angel One (Portfolio / Tradebook)" },
  { value: "ICICI Direct", label: "ICICI Direct (Equity Portfolio / Trade Log)" },
  { value: "HDFC Sky / Securities", label: "HDFC Sky / Securities (Holdings / Trades)" },
  { value: "Kotak Securities", label: "Kotak Securities (Portfolio / Trade History)" },
  { value: "Motilal Oswal", label: "Motilal Oswal (Holdings / Net Position)" },
  { value: "Dhan", label: "Dhan (Holdings CSV / Tradebook)" },
  { value: "Upstox", label: "Upstox (Holdings / Orders)" },
  { value: "Interactive Brokers", label: "Interactive Brokers / US Brokers" },
  { value: "generic", label: "Generic Broker / Standard Spreadsheet" },
];

const SAMPLE_CSV = `Instrument,ISIN,Qty.,Avg. cost
RELIANCE,INE002A01018,50,2850.50
TCS,INE467B01029,25,3820.00
HDFCBANK,INE040A01034,60,1650.00
INFY,INE009A01021,80,1480.00
ITC,INE154A01025,120,435.50
SBIN,INE062A01020,70,795.00
LT,INE018A01030,20,3520.00
TITAN,INE280A01028,15,3240.00`;

export function BrokerImportDialog({ onImport, triggerLabel = "Import Holdings" }: Props) {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<"file" | "paste" | "guide">("file");

  // File Upload State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paste State
  const [pastedText, setPastedText] = useState("");

  // Common Options
  const [brokerHint, setBrokerHint] = useState("auto");

  // Processing & Preview State
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewHoldings, setPreviewHoldings] = useState<Holding[] | null>(null);
  const [detectedBroker, setDetectedBroker] = useState<string | null>(null);
  const [statementType, setStatementType] = useState<string | null>(null);
  const [tradesProcessed, setTradesProcessed] = useState<number | null>(null);

  // Filter in Preview Table
  const [searchQuery, setSearchQuery] = useState("");

  // Commit State
  const [importMode, setImportMode] = useState<"replace" | "append">("replace");
  const [committing, setCommitting] = useState(false);
  const [, startTransition] = useTransition();

  function resetState() {
    setSelectedFile(null);
    setPastedText("");
    setPreviewHoldings(null);
    setDetectedBroker(null);
    setStatementType(null);
    setTradesProcessed(null);
    setError(null);
    setLoading(false);
    setCommitting(false);
    setSearchQuery("");
  }

  function handleFileSelected(file: File) {
    setSelectedFile(file);
    setError(null);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelected(file);
    }
  }

  async function handleParse() {
    setError(null);
    setLoading(true);

    try {
      let res: Response;

      if (tab === "file") {
        if (!selectedFile) {
          throw new Error("Please select a statement or holdings file first.");
        }
        const formData = new FormData();
        formData.append("file", selectedFile);
        if (brokerHint !== "auto") {
          formData.append("brokerHint", brokerHint);
        }

        res = await fetch("/api/portfolio/import", {
          method: "POST",
          body: formData,
        });
      } else {
        if (!pastedText.trim()) {
          throw new Error("Please paste your statement or holdings text first.");
        }

        res = await fetch("/api/portfolio/import", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: pastedText.trim(),
            brokerHint: brokerHint !== "auto" ? brokerHint : undefined,
          }),
        });
      }

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || `Parsing failed with status ${res.status}`);
      }

      if (!data.holdings || !Array.isArray(data.holdings) || data.holdings.length === 0) {
        throw new Error("No active holding positions found in this statement.");
      }

      setPreviewHoldings(data.holdings);
      setDetectedBroker(data.brokerDetected || "Brokerage House");
      setStatementType(data.statementType || "holdings");
      setTradesProcessed(data.totalTradesProcessed || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to parse statement");
    } finally {
      setLoading(false);
    }
  }

  function handleRemoveHolding(indexToRemove: number) {
    if (!previewHoldings) return;
    setPreviewHoldings(previewHoldings.filter((_, idx) => idx !== indexToRemove));
  }

  async function handleConfirmImport() {
    if (!previewHoldings || previewHoldings.length === 0) return;
    setCommitting(true);
    setError(null);

    try {
      await onImport(previewHoldings, importMode);
      startTransition(() => {
        setOpen(false);
        resetState();
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save holdings to desk");
    } finally {
      setCommitting(false);
    }
  }

  function handleDownloadTemplate() {
    const blob = new Blob([SAMPLE_CSV], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "holdings_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  const totalInvested =
    previewHoldings?.reduce((sum, h) => sum + h.shares * h.avgCost, 0) ?? 0;

  const filteredHoldings = (previewHoldings || []).filter((h) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      h.symbol.toLowerCase().includes(q) ||
      h.name.toLowerCase().includes(q) ||
      (h.sector && h.sector.toLowerCase().includes(q))
    );
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) resetState();
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="font-semibold gap-1.5 border-border hover:border-blue-600/50 hover:bg-blue-600/5"
        >
          <UploadCloud className="h-4 w-4 text-blue-600" />
          {triggerLabel}
        </Button>
      </DialogTrigger>

      <DialogContent className="flex max-h-[92vh] max-w-[min(100vw-2rem,42rem)] flex-col gap-0 overflow-y-auto rounded-2xl border-border bg-card p-0 font-sans text-foreground sm:max-w-2xl">
        <DialogHeader className="space-y-3 border-b border-border/80 px-5 pb-5 pt-6 sm:px-7 sm:pt-7">
          <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-600">
            <Sparkles className="size-3.5 shrink-0" aria-hidden />
            Brokerage import
          </span>
          <DialogTitle className="font-heading text-left text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">
            Import holdings & statements
          </DialogTitle>
          <p className="text-left text-sm leading-relaxed text-muted-foreground">
            Upload holdings exports, tradebooks, or contract notes (CSV, Excel, or paste) to refresh your book for risk and attribution.
          </p>

          <div className="space-y-2 pt-1">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground/90">
              <Building className="size-3.5 shrink-0 text-blue-600" aria-hidden />
              Works with
            </p>
            <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-0.5 [scrollbar-width:thin]">
              {["Zerodha", "Groww", "Angel One", "ICICI Direct", "HDFC Sky", "Kotak", "Dhan", "Upstox", "Motilal Oswal", "IBKR", "Others"].map(
                (b) => (
                  <span
                    key={b}
                    className="shrink-0 rounded-full border border-border/60 bg-muted/40 px-2.5 py-1 text-[11px] font-medium text-foreground/90"
                  >
                    {b}
                  </span>
                ),
              )}
            </div>
          </div>
        </DialogHeader>

        <div className="px-5 py-5 sm:px-7 sm:py-6">
        {error ? (
          <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-sm text-rose-600">
            <AlertCircle className="h-4 w-4 shrink-0 text-rose-600 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-semibold">Unable to import statement</p>
              <p className="text-rose-600/90 text-xs">{error}</p>
            </div>
          </div>
        ) : null}

        {!previewHoldings ? (
          <div className="space-y-6">
            <div className="space-y-2 rounded-xl border border-border/70 bg-muted/20 p-4">
              <label htmlFor="broker-hint" className="block text-sm font-semibold text-foreground">
                Brokerage source
              </label>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Leave on auto-detect unless the parser mis-reads your export headers.
              </p>
              <select
                id="broker-hint"
                value={brokerHint}
                onChange={(e) => setBrokerHint(e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25"
              >
                {BROKER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "file" | "paste" | "guide")} className="gap-4">
              <TabsList className="grid h-auto w-full grid-cols-1 gap-2 rounded-xl bg-muted/35 p-1.5 sm:grid-cols-3 sm:gap-1">
                <TabsTrigger
                  value="file"
                  className="flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2.5 text-center leading-snug whitespace-normal data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <UploadCloud className="size-4 shrink-0" aria-hidden />
                    Upload file
                  </span>
                  <span className="text-[10px] font-normal opacity-80">CSV, XLSX, XLS</span>
                </TabsTrigger>
                <TabsTrigger
                  value="paste"
                  className="flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2.5 text-center leading-snug whitespace-normal data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <FileText className="size-4 shrink-0" aria-hidden />
                    Paste table
                  </span>
                  <span className="text-[10px] font-normal opacity-80">From broker portal</span>
                </TabsTrigger>
                <TabsTrigger
                  value="guide"
                  className="flex h-auto min-h-11 flex-col items-center justify-center gap-0.5 rounded-lg px-3 py-2.5 text-center leading-snug whitespace-normal data-[state=active]:bg-blue-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
                >
                  <span className="flex items-center gap-1.5 text-sm font-semibold">
                    <HelpCircle className="size-4 shrink-0" aria-hidden />
                    Guide
                  </span>
                  <span className="text-[10px] font-normal opacity-80">Export steps + template</span>
                </TabsTrigger>
              </TabsList>

              {/* FILE UPLOAD TAB */}
              <TabsContent value="file" className="mt-4 space-y-4 focus-visible:outline-none">
                <div
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors sm:p-10 ${
                    isDragging
                      ? "border-blue-600 bg-blue-600/10"
                      : selectedFile
                      ? "border-blue-600/60 bg-blue-600/5"
                      : "border-border hover:border-blue-600/50 hover:bg-secondary/30"
                  }`}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx,.xls,.tsv,.txt"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelected(f);
                    }}
                  />

                  {selectedFile ? (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="rounded-full bg-blue-600/10 p-3 text-blue-600 border border-blue-600/20">
                        <FileSpreadsheet className="h-7 w-7" />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-foreground">{selectedFile.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {(selectedFile.size / 1024).toFixed(1)} KB • Ready to parse
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(null);
                        }}
                        className="text-xs font-semibold text-rose-500 hover:underline pt-1"
                      >
                        Remove & choose another file
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center space-y-2">
                      <div className="rounded-full bg-secondary p-3 text-blue-600/80">
                        <UploadCloud className="h-7 w-7" />
                      </div>
                      <div className="space-y-1">
                        <p className="font-semibold text-sm text-foreground">
                          Drag and drop your holding or statement file here
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Supports Excel (.xlsx, .xls), CSV, TSV, and text exports from your broker
                        </p>
                      </div>
                      <div className="pt-2">
                        <span className="rounded-full bg-blue-600/10 px-3 py-1 text-xs font-bold text-blue-600 border border-blue-600/20">
                          Browse File
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                  <span>Accepts Holdings Statements, Tradebooks & Portfolio Valuations</span>
                  <span>Max file size: 25 MB</span>
                </div>

                <Button
                  onClick={handleParse}
                  disabled={loading || !selectedFile}
                  size="lg"
                  className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-600/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Parsing statement…
                    </>
                  ) : (
                    "Parse and preview holdings"
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="paste" className="mt-4 space-y-4 focus-visible:outline-none">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Paste CSV, TSV, or copied table rows:
                    </label>
                    <button
                      type="button"
                      onClick={() => setPastedText(SAMPLE_CSV)}
                      className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                    >
                      <Sparkles className="h-3 w-3" /> Load Sample Holdings
                    </button>
                  </div>
                  <textarea
                    rows={8}
                    value={pastedText}
                    onChange={(e) => setPastedText(e.target.value)}
                    placeholder={"Symbol, Quantity, Avg Cost\nRELIANCE, 50, 2850.50\nTCS, 20, 3800.00\nINFY, 100, 1450.25"}
                    className="w-full rounded-xl border border-border bg-card p-3.5 font-sans text-sm tabular-nums text-foreground focus-visible:border-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600/25"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Tip: You can copy tables directly from your broker&apos;s web portal (e.g. Zerodha Console, Groww, ICICI Direct) and paste them here.
                  </p>
                </div>

                <Button
                  onClick={handleParse}
                  disabled={loading || !pastedText.trim()}
                  size="lg"
                  className="h-11 w-full rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-600/90"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                      Parsing pasted text…
                    </>
                  ) : (
                    "Parse and preview pasted text"
                  )}
                </Button>
              </TabsContent>

              <TabsContent value="guide" className="mt-4 space-y-4 text-sm text-foreground focus-visible:outline-none">
                <div className="rounded-xl border border-border/80 bg-secondary/20 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-sm text-foreground flex items-center gap-1.5">
                      <FileSpreadsheet className="h-4 w-4 text-blue-600" /> How to Export From Your Broker
                    </h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDownloadTemplate}
                      className="h-7 text-xs font-semibold gap-1"
                    >
                      <Download className="h-3 w-3" /> Download Template (.csv)
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1 text-muted-foreground">
                    <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-1">
                      <p className="font-bold text-foreground">Zerodha (Holdings or Tradebook)</p>
                      <p>Go to <strong>Console &gt; Portfolio &gt; Holdings</strong> and click <em>Download CSV/XLSX</em>. Or download your Tradebook.</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-1">
                      <p className="font-bold text-foreground">Groww</p>
                      <p>Go to <strong>Profile &gt; Reports &gt; Stocks</strong> &gt; download <em>Holdings Report</em> (Excel/CSV) or Stock Orders.</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-1">
                      <p className="font-bold text-foreground">ICICI Direct / HDFC Sky</p>
                      <p>Open <strong>Portfolio &gt; Equity</strong> and click <em>Download to Excel</em>. Trade logs are also fully supported.</p>
                    </div>
                    <div className="rounded-lg border border-border/60 bg-card p-2.5 space-y-1">
                      <p className="font-bold text-foreground">Angel One / Kotak / Dhan / Upstox</p>
                      <p>Navigate to <strong>Portfolio &gt; Holdings &gt; Export</strong> or export your account trade statement.</p>
                    </div>
                  </div>

                  <div className="rounded-lg bg-blue-600/5 border border-blue-600/20 p-3 text-blue-600/90 space-y-1">
                    <p className="font-bold">Tradebook & Contract Note Support</p>
                    <p className="text-muted-foreground text-[11px]">
                      If you upload a tradebook or transaction history with BUY/SELL orders, our engine automatically calculates your active net holdings and volume-weighted purchase cost!
                    </p>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        ) : (
          <div className="space-y-5">
            {/* SUMMARY BAR */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/70 bg-secondary/30 p-3.5 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                <div>
                  <span className="font-bold text-sm text-foreground">
                    {previewHoldings.length} Active Positions
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {detectedBroker ? (
                      <span className="rounded bg-blue-600/10 px-1.5 py-0.5 text-[10px] font-bold text-blue-600 border border-blue-600/20">
                        {detectedBroker}
                      </span>
                    ) : null}
                    <span className="rounded bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/50">
                      {statementType === "tradebook"
                        ? `Tradebook (${tradesProcessed ?? "All"} trades netted)`
                        : "Holdings Statement"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-right">
                <span className="text-muted-foreground block text-[11px]">Total Invested Capital</span>
                <span className="font-bold text-base text-foreground">
                  ₹{(totalInvested / 100_000).toFixed(2)} Lakh
                </span>
              </div>
            </div>

            {/* SEARCH / FILTER BAR */}
            {previewHoldings.length > 5 ? (
              <div className="relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  type="text"
                  placeholder="Filter recognized symbols or company names..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs h-8 rounded-lg"
                />
              </div>
            ) : null}

            {/* PREVIEW TABLE */}
            <div className="max-h-64 overflow-y-auto rounded-xl border border-border/80 bg-card">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-border bg-secondary/90 text-[11px] uppercase text-muted-foreground backdrop-blur-sm">
                  <tr>
                    <th className="p-2.5">Symbol</th>
                    <th className="p-2.5">Company Name</th>
                    <th className="p-2.5 text-right">Shares</th>
                    <th className="p-2.5 text-right">Avg Cost</th>
                    <th className="p-2.5 text-right">Total Invested</th>
                    <th className="p-2.5 text-center w-10">Remove</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredHoldings.map((h, i) => {
                    const originalIdx = previewHoldings.indexOf(h);
                    return (
                      <tr key={h.id || i} className="hover:bg-secondary/20 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-blue-600">{h.symbol}</span>
                            <span className="rounded bg-secondary px-1 text-[9px] font-semibold text-muted-foreground">
                              {h.market}
                            </span>
                          </div>
                        </td>
                        <td className="p-2.5 text-muted-foreground truncate max-w-[170px]" title={h.name}>
                          {h.name}
                        </td>
                        <td className="p-2.5 text-right font-medium text-foreground">
                          {h.shares.toLocaleString()}
                        </td>
                        <td className="p-2.5 text-right text-muted-foreground">
                          {h.currency === "USD" ? "$" : "₹"}
                          {h.avgCost.toFixed(2)}
                        </td>
                        <td className="p-2.5 text-right text-foreground font-semibold">
                          {h.currency === "USD" ? "$" : "₹"}
                          {((h.shares * h.avgCost) / (h.currency === "USD" ? 1 : 1000)).toFixed(1)}
                          {h.currency === "USD" ? "" : "k"}
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveHolding(originalIdx)}
                            className="rounded p-1 text-muted-foreground hover:bg-rose-500/10 hover:text-rose-500 transition-colors"
                            title="Exclude this stock"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* IMPORT MODE CONTROLS */}
            <div className="rounded-xl border border-border/70 bg-secondary/20 p-3.5 text-xs space-y-2">
              <span className="font-bold text-foreground uppercase tracking-wide text-[11px]">
                Portfolio Destination Mode
              </span>
              <div className="grid grid-cols-2 gap-2">
                <label
                  onClick={() => setImportMode("replace")}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-all ${
                    importMode === "replace"
                      ? "border-blue-600 bg-blue-600/10 text-blue-600 shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "replace"}
                    onChange={() => setImportMode("replace")}
                    className="hidden"
                  />
                  <RefreshCw className="h-4 w-4 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-bold text-foreground">Replace Current Book</p>
                    <p className="text-[11px] text-muted-foreground">Clears existing holdings and starts fresh</p>
                  </div>
                </label>

                <label
                  onClick={() => setImportMode("append")}
                  className={`flex cursor-pointer items-center gap-2.5 rounded-xl border p-2.5 text-xs transition-all ${
                    importMode === "append"
                      ? "border-blue-600 bg-blue-600/10 text-blue-600 shadow-sm"
                      : "border-border bg-card text-muted-foreground hover:border-border/80"
                  }`}
                >
                  <input
                    type="radio"
                    name="importMode"
                    checked={importMode === "append"}
                    onChange={() => setImportMode("append")}
                    className="hidden"
                  />
                  <Layers className="h-4 w-4 shrink-0 text-blue-600" />
                  <div>
                    <p className="font-bold text-foreground">Merge / Append</p>
                    <p className="text-[11px] text-muted-foreground">Merges lots with volume-weighted price</p>
                  </div>
                </label>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch">
              <Button
                variant="outline"
                onClick={resetState}
                className="min-h-11 flex-1 rounded-xl border-border text-sm font-semibold text-muted-foreground hover:bg-muted/40"
              >
                Back to upload
              </Button>
              <Button
                onClick={handleConfirmImport}
                disabled={committing || previewHoldings.length === 0}
                size="lg"
                className="min-h-11 flex-[1.4] rounded-xl bg-blue-600 text-sm font-bold text-white hover:bg-blue-600/90"
              >
                {committing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" aria-hidden />
                    Saving to portfolio…
                  </>
                ) : (
                  `Confirm import (${previewHoldings.length})`
                )}
              </Button>
            </div>
          </div>
        )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
