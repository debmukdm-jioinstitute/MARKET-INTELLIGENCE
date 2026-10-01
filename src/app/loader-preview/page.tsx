"use client";

import { useState } from "react";
import { GlassLoader } from "@/components/ui/glass-loader";

export default function LoaderPreviewPage() {
  const [variant, setVariant] = useState<"page" | "card" | "fullscreen" | "inline">("page");
  const [message, setMessage] = useState("Loading live NAVs from AMFI...");
  const [statusBadge, setStatusBadge] = useState("AMFI LIVE STREAM ACTIVE");

  return (
    <div className="space-y-8 p-6 max-w-5xl mx-auto">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight">3D Glassmorphic Loader Showcase</h1>
        <p className="text-sm text-muted-foreground">
          Site-wide animated 3D glassmorphic loading experience featuring rotating gyroscopic core, ambient mesh glow, and transitioning quotes of stock market legends.
        </p>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        {(["page", "card", "inline"] as const).map((v) => (
          <button
            key={v}
            onClick={() => setVariant(v)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all ${
              variant === v
                ? "bg-primary text-primary-foreground shadow-sm"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {v} Variant
          </button>
        ))}

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => {
              setMessage("Loading live NAVs from AMFI...");
              setStatusBadge("AMFI NAV CRAWLER ACTIVE");
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/80 text-foreground font-medium"
          >
            AMFI Live NAVs
          </button>
          <button
            onClick={() => {
              setMessage("Synchronizing Institutional Smart Money...");
              setStatusBadge("FII / DII ACCUMULATION RADAR");
            }}
            className="px-3 py-1.5 rounded-lg text-xs bg-muted hover:bg-muted/80 text-foreground font-medium"
          >
            Smart Money
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-border/60 bg-muted/20 p-6 flex justify-center">
        <GlassLoader
          variant={variant}
          message={message}
          detail="Streaming real-time order depth, fund NAVs and quantitative factors directly from regulatory endpoints."
          statusBadge={statusBadge}
        />
      </div>
    </div>
  );
}
