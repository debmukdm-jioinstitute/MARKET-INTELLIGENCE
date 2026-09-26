import { AuthGate } from "@/components/providers/auth-gate";
import { PortalPageProvider } from "@/components/providers/portal-page-provider";
import { SiteContentProvider } from "@/components/providers/site-content-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LiveEditOverlay } from "@/components/site/live-edit-overlay";
import { Suspense } from "react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background text-foreground">
      <AuthGate>
        <PortalPageProvider>
          <Suspense fallback={<div className="min-h-screen bg-background" />}>
            <SiteContentProvider>
              <AppShell>{children}</AppShell>
              <LiveEditOverlay />
            </SiteContentProvider>
          </Suspense>
        </PortalPageProvider>
      </AuthGate>
    </div>
  );
}
