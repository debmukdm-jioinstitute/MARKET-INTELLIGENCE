import Link from "next/link";
import type { ReactNode } from "react";

export function SignInRequiredBanner({
  feature,
  nextPath,
  children,
}: {
  feature?: string;
  nextPath: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
      {children ?? (
        <>
          <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-blue-600 hover:underline">
            Sign in
          </Link>{" "}
          to use {feature ?? "this feature"}.
        </>
      )}
    </div>
  );
}
