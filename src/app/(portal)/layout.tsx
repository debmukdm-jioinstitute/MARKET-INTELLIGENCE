import { AuthGate } from "@/components/providers/auth-gate";
import { AppShell } from "@/components/layout/app-shell";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-background text-foreground">
      <AuthGate>
        <AppShell>{children}</AppShell>
      </AuthGate>
    </div>
  );
}
