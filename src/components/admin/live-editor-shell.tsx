"use client";

import {
  MI_CONTENT_SAVED,
  MI_DRAFT_OVERRIDES,
  MI_EDIT_QUERY,
  MI_REQUEST_SLOTS,
  MI_SELECT_SLOT,
  MI_SLOT_DRAFT,
  MI_SLOTS,
  portalPreviewOrigin,
  siteContentSlot,
  type MiIframeMessage,
  type MiSlotSummary,
} from "@/lib/site-content";
import { buildPortalPageRegistry } from "@/lib/portal-page-registry";
import { cn } from "@/lib/utils";
import { Check, Loader2, RotateCcw, Search } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const PAGES = buildPortalPageRegistry()
  .filter((p) => !p.href.includes("["))
  .sort((a, b) => a.sortOrder - b.sortOrder);

export function LiveEditorShell() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [path, setPath] = useState("/Home");
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<MiSlotSummary | null>(null);
  const [draft, setDraft] = useState("");
  const [pending, setPending] = useState<Record<string, string>>({});
  const [slots, setSlots] = useState<MiSlotSummary[]>([]);
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [manualPart, setManualPart] = useState("");
  const [manualText, setManualText] = useState("");

  const origin = useMemo(() => portalPreviewOrigin(), []);
  const iframeSrc = `${origin}${path}?${MI_EDIT_QUERY}=1`;

  const filteredPages = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return PAGES;
    return PAGES.filter(
      (p) => p.label.toLowerCase().includes(q) || p.href.toLowerCase().includes(q),
    );
  }, [filter]);

  const postToFrame = useCallback(
    (msg: object) => {
      iframeRef.current?.contentWindow?.postMessage(msg, origin);
    },
    [origin],
  );

  useEffect(() => {
    function onMessage(ev: MessageEvent) {
      if (ev.origin !== origin) return;
      const data = ev.data as MiIframeMessage;
      if (data?.type === MI_SELECT_SLOT) {
        setSelected({
          slotKey: data.slotKey,
          field: data.field,
          label: data.label,
          text: data.value,
        });
      }
      if (data?.type === MI_SLOTS) {
        setSlots(data.slots);
      }
      if (data?.type === MI_SLOT_DRAFT) {
        setPending((prev) => ({ ...prev, [data.slotKey]: data.value }));
        setSelected({
          slotKey: data.slotKey,
          field: "body",
          label: data.slotKey,
          text: data.value,
        });
        setDraft(data.value);
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [origin]);

  useEffect(() => {
    postToFrame({ type: MI_DRAFT_OVERRIDES, overrides: pending });
  }, [pending, postToFrame]);

  useEffect(() => {
    if (!selected) return;
    setDraft(pending[selected.slotKey] ?? selected.text);
  }, [selected, pending]);

  useEffect(() => {
    setSelected(null);
    setDraft("");
    setSlots([]);
    const t = window.setTimeout(() => postToFrame({ type: MI_REQUEST_SLOTS }), 800);
    return () => window.clearTimeout(t);
  }, [path, postToFrame]);

  function queueChange(value: string) {
    if (!selected) return;
    setDraft(value);
    setPending((prev) => ({ ...prev, [selected.slotKey]: value }));
  }

  function addManualSlot() {
    const part = manualPart.trim();
    const value = manualText.trim();
    if (!part || !value) {
      setStatus("Manual slot needs a part id (e.g. card.hero.title) and text.");
      return;
    }
    const slotKey = siteContentSlot(path, part);
    setPending((prev) => ({ ...prev, [slotKey]: value }));
    setSelected({ slotKey, field: "body", label: part, text: value });
    setDraft(value);
    setStatus(`Queued manual slot ${slotKey}`);
  }

  async function applyChanges() {
    const batch = Object.entries(pending).map(([slot_key, value]) => ({ slot_key, value }));
    if (!batch.length) {
      setStatus("No pending edits.");
      return;
    }
    setBusy(true);
    setStatus("");
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ batch }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setPending({});
      setStatus(`Live — ${batch.length} slot(s) updated.`);
      postToFrame({ type: MI_CONTENT_SAVED });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function resetSlot() {
    if (!selected) return;
    setBusy(true);
    try {
      const res = await fetch("/api/admin/content", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_key: selected.slotKey, reset: true }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Reset failed");
      }
      setPending((prev) => {
        const next = { ...prev };
        delete next[selected.slotKey];
        return next;
      });
      setDraft("");
      setStatus("Slot reset to default.");
      postToFrame({ type: MI_CONTENT_SAVED });
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Reset failed");
    } finally {
      setBusy(false);
    }
  }

  const pendingCount = Object.keys(pending).length;

  return (
    <div className="flex h-[calc(100vh-3rem)] min-h-[640px] flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Live editor</h1>
          <p className="text-sm text-gray-500">
            Click or type directly in preview (blue outline) — or edit in sidebar — then Apply. Dashed blocks are CMS slots.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/admin/pages" className="text-sm text-blue-600 hover:underline">
            Portal pages
          </Link>
          <button
            type="button"
            disabled={busy || pendingCount === 0}
            onClick={() => void applyChanges()}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
            Apply changes
            {pendingCount > 0 ? ` (${pendingCount})` : ""}
          </button>
        </div>
      </div>

      {status ? <p className="text-sm text-gray-600">{status}</p> : null}

      <div className="flex min-h-0 flex-1 gap-3">
        <aside className="flex w-56 shrink-0 flex-col rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-200 p-2">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 px-2 py-1.5">
              <Search className="size-3.5 text-gray-400" />
              <input
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Find page…"
                className="w-full bg-transparent text-sm outline-none"
              />
            </div>
          </div>
          <ul className="flex-1 overflow-y-auto p-1 text-sm">
            {filteredPages.map((p) => (
              <li key={p.href}>
                <button
                  type="button"
                  onClick={() => setPath(p.href)}
                  className={cn(
                    "w-full rounded-md px-2 py-1.5 text-left",
                    path === p.href ? "bg-blue-600/10 font-bold text-blue-700" : "text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <span className="block truncate">{p.label}</span>
                  <span className="block truncate text-xs text-gray-400">{p.href}</span>
                </button>
              </li>
            ))}
          </ul>
        </aside>

        <div className="min-w-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-gray-100">
          <iframe
            ref={iframeRef}
            title="Live site preview"
            src={iframeSrc}
            className="h-full w-full bg-white"
            onLoad={() => postToFrame({ type: MI_REQUEST_SLOTS })}
          />
        </div>

        <aside className="flex w-72 shrink-0 flex-col rounded-lg border border-gray-200 bg-white p-3">
          <h2 className="text-sm font-bold text-gray-900">Selection</h2>
          {selected ? (
            <>
              <p className="mt-1 text-xs text-gray-500">{selected.label}</p>
              <p className="mt-0.5 break-all text-xs text-gray-400">{selected.slotKey}</p>
              <label className="mt-3 block text-xs font-semibold text-gray-600">Content</label>
              <textarea
                value={draft}
                onChange={(e) => queueChange(e.target.value)}
                rows={8}
                className="mt-1 w-full resize-y rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-blue-500"
              />
              <button
                type="button"
                onClick={() => void resetSlot()}
                disabled={busy}
                className="mt-2 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-800"
              >
                <RotateCcw className="size-3" />
                Reset to default
              </button>
            </>
          ) : (
            <p className="mt-2 text-sm text-gray-500">
              Click any dashed text in the preview, pick from the list below, or add a manual slot.
            </p>
          )}

          <div className="mt-4 border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-600">Manual slot</p>
            <p className="mt-0.5 text-xs text-gray-400">Part id must match EditableCopy in code (e.g. card.hero.title).</p>
            <input
              value={manualPart}
              onChange={(e) => setManualPart(e.target.value)}
              placeholder={`Part id on ${path}`}
              className="mt-2 w-full rounded-md border border-gray-200 px-2 py-1.5 text-xs outline-none focus:border-blue-500"
            />
            <textarea
              value={manualText}
              onChange={(e) => setManualText(e.target.value)}
              rows={3}
              placeholder="New text…"
              className="mt-1 w-full resize-y rounded-md border border-gray-200 p-2 text-xs outline-none focus:border-blue-500"
            />
            <button
              type="button"
              onClick={addManualSlot}
              className="mt-2 w-full rounded-md border border-gray-200 py-1.5 text-xs font-medium hover:bg-gray-50"
            >
              Queue manual slot
            </button>
          </div>

          <div className="mt-auto border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-600">Editable on this page ({slots.length})</p>
            <ul className="mt-1 max-h-40 overflow-y-auto text-xs text-gray-500">
              {slots.map((s) => (
                <li key={s.slotKey}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelected(s);
                      setDraft(pending[s.slotKey] ?? s.text);
                    }}
                    className={cn(
                      "w-full truncate rounded px-1 py-0.5 text-left hover:bg-gray-100",
                      selected?.slotKey === s.slotKey && "bg-blue-50 font-medium text-blue-800",
                    )}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
