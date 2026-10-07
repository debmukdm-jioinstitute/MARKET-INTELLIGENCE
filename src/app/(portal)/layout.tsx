import { AuthGate } from "@/components/providers/auth-gate";
import { PortalPageProvider } from "@/components/providers/portal-page-provider";
import { SiteContentProvider } from "@/components/providers/site-content-provider";
import { AppShell } from "@/components/layout/app-shell";
import { LiveEditOverlay } from "@/components/site/live-edit-overlay";
import { HeartbeatMount } from "@/components/gamification/heartbeat-mount";
import { Suspense } from "react";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background text-foreground">
      <AuthGate>
        <HeartbeatMount />
        <PortalPageProvider>
          <Suspense
            fallback={
              <div className="min-h-dvh bg-background px-4 py-8">
                <div className="portal-skeleton mx-auto max-w-[1600px] space-y-4">
                  <div className="h-8 w-48 rounded-lg" />
                  <div className="h-12 w-full max-w-xl rounded-lg" />
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="h-40 rounded-xl" />
                    <div className="h-40 rounded-xl" />
                  </div>
                </div>
              </div>
            }
          >
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
