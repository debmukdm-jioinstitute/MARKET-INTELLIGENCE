import Link from "next/link";

export function SignInRequiredBanner({
  feature,
  nextPath,
}: {
  feature: string;
  nextPath: string;
}) {
  return (
    <div className="rounded-lg border border-dashed border-border bg-card p-4 text-sm text-muted-foreground">
      <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="font-semibold text-blue-600 hover:underline">
        Sign in
      </Link>{" "}
      to use {feature}. Guest sessions cannot load this data.
    </div>
  );
}
