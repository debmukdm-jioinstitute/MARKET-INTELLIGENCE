import type { ReactNode } from "react";

/** World Monitor upstream visual language (dark tactical + neon green). Google Sans via inheritance. */
export function WorldMonitorPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#1a2e1a] bg-[#070807] text-[#e4e8e4] shadow-[0_0_40px_rgba(57,255,20,0.06)]">
      <div className="border-b border-[#1a2e1a] bg-[#0a0d0a] px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-[#39ff14]/40 bg-[#39ff14]/10">
              <span className="text-lg font-bold text-[#39ff14]" aria-hidden>
                ◉
              </span>
            </div>
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-[#39ff14]">Monitor</p>
              <h1 className="text-xl font-bold tracking-tight text-white sm:text-2xl">Global Intelligence Dashboard</h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-md border border-[#39ff14]/30 bg-[#39ff14]/10 px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-[#39ff14]">
              <span className="h-2 w-2 rounded-full bg-[#39ff14] shadow-[0_0_8px_#39ff14]" aria-hidden />
              Live
            </span>
            <span className="hidden rounded-md border border-[#2a3a2a] bg-[#111411] px-2.5 py-1 text-xs text-[#8a948a] sm:inline">
              Finance variant
            </span>
          </div>
        </div>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#9aa89a]">
          Maps, geopolitical layers, country instability (CII), and cross-asset radar — proxied on Market Intelligence.
          India portfolio and macro tools stay in the main menu.
        </p>
      </div>
      <div className="p-4 sm:p-6">{children}</div>
    </div>
  );
}
