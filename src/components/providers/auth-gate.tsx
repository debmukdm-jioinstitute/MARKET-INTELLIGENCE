"use client";

import { GlassLoader } from "@/components/ui/glass-loader";

import { useAuth } from "@/components/providers/auth-provider";
import { isGuestReadablePortalPath } from "@/lib/seo/public-routes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready, isGuest, requireAccount } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const isPublicPortal = !requireAccount && isGuestReadablePortalPath(pathname);
  const allowed = Boolean(user) && !(requireAccount && isGuest);

  useEffect(() => {
    if (isPublicPortal) return;
    if (ready && !allowed) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(requireAccount ? `/signup?next=${next}` : `/login?next=${next}`);
    }
  }, [ready, allowed, router, isPublicPortal, requireAccount]);

  if (isPublicPortal) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <GlassLoader
        variant="fullscreen"
        message="Initializing Market Intelligence Terminal..."
        detail="Validating authentication tokens & establishing encrypted data feeds"
        statusBadge="SECURITY GATEWAY ACTIVE"
      />
    );
  }

  if (!allowed) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
