import Link from "next/link";
import { DISCLAIMER } from "@/lib/competition/config";
import { PublicHeader } from "@/components/layout/public-header";
export default function AlphaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <nav
          aria-label="Alpha League"
          className="mb-8 flex flex-wrap gap-5 text-sm font-semibold"
        >
          {[
            ["/alpha-league", "The league"],
            ["/alpha-league/board", "Leaderboard"],
            ["/alpha-league/portfolio", "My portfolio"],
            ["/alpha-league/backtest", "Research sandbox"],
          ].map(([url, label]) => (
            <Link key={url} className="text-primary hover:underline" href={url}>
              {label}
            </Link>
          ))}
        </nav>
        <p className="mb-6 rounded-lg border border-border bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
          {DISCLAIMER}
        </p>
        {children}
        <footer className="mt-12 border-t border-border pt-6 text-xs text-muted-foreground">
          {DISCLAIMER}
        </footer>
      </main>
    </div>
  );
}
