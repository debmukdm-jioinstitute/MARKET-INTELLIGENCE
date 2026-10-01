"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

export default function ResearchLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <GlassLoader
        variant="page"
        message="Loading equity research & analyst coverage..."
        detail="Aggregating institutional notes, consensus estimates & financial filings"
        statusBadge="ANALYST TERMINAL READY"
        icon="layers"
      />
    </div>
  );
}
