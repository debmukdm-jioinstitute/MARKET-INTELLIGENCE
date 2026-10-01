"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

export default function RootLoading() {
  return (
    <GlassLoader
      variant="fullscreen"
      message="Loading live market intelligence..."
      detail="Establishing real-time terminal connection, order feeds & analytical series"
      statusBadge="QUANT TERMINAL LIVE"
    />
  );
}
