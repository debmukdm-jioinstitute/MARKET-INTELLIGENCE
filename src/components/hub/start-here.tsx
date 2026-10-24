import Link from "next/link";
import { START_HERE } from "@/lib/nav-columns";

export function StartHere() {
  return (
    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
      {START_HERE.map((s) => (
        <Link key={s.href} href={s.href} className="flex min-h-14 flex-col justify-center rounded-xl border border-border bg-muted/50 px-3 py-2 transition-colors hover:bg-accent touch-manipulation">
          <span className="text-sm text-muted-foreground">{s.label}</span>
          <span className="text-sm font-semibold text-primary">{s.cta} →</span>
        </Link>
      ))}
    </div>
  );
}
