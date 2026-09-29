"use client";

import { useAuth } from "@/components/providers/auth-provider";
import { isGuestReadablePortalPath } from "@/lib/seo/public-routes";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { user, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const isPublicPortal = isGuestReadablePortalPath(pathname);

  useEffect(() => {
    if (isPublicPortal) return;
    if (ready && !user) {
      const next = encodeURIComponent(window.location.pathname + window.location.search);
      router.replace(`/login?next=${next}`);
    }
  }, [ready, user, router, isPublicPortal]);

  if (isPublicPortal) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm tracking-widest text-muted-foreground">
        OPENING TERMINAL…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background text-sm text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return <>{children}</>;
}
