"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

export default function PortalLoading() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 sm:p-6">
      <GlassLoader
        variant="page"
        message="Loading market intelligence..."
        detail="Synchronizing institutional flows, real-time analytics & intelligence models"
        statusBadge="INTELLIGENCE ENGINE ACTIVE"
      />
    </div>
  );
}
