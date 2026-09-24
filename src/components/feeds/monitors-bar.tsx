"use client";

import { useMonitors } from "@/hooks/use-monitors";
import { X } from "lucide-react";
import { useState } from "react";

export function MonitorsBar() {
  const { monitors, add, remove } = useMonitors();
  const [text, setText] = useState("");
  return (
    <div className="rounded-xl border border-border bg-card p-3 text-sm">
      <form
        className="flex flex-wrap items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          add(text);
          setText("");
        }}
      >
        <label className="font-semibold text-foreground" htmlFor="monitor-input">My monitors</label>
        <input
          id="monitor-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="keywords, comma separated (e.g. repo, RBI, crude)"
          className="min-w-[16rem] flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-foreground"
        />
        <button type="submit" className="rounded-lg bg-blue-600 px-3 py-1.5 font-semibold text-white">Add</button>
      </form>
      {monitors.length ? (
        <ul className="mt-2 flex flex-wrap gap-2">
          {monitors.map((m) => (
            <li key={m.id} className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5" style={{ borderColor: m.color, color: m.color }}>
              {m.keywords.join(", ")}
              <button type="button" aria-label="Remove monitor" onClick={() => remove(m.id)}><X className="size-3" /></button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-1 text-xs text-muted-foreground">Headlines containing your keywords are highlighted in every news list. Saved only in this browser.</p>
      )}
    </div>
  );
}
