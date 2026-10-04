import { DISCLAIMER } from "@/lib/competition/config";
import { PublicHeader } from "@/components/layout/public-header";
import { AlphaNav, CoBrand, PulseLine } from "@/components/competition/brand";
export default function AlphaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="alpha-brand min-h-screen bg-background text-foreground">
      <PublicHeader backHref="/" backLabel="Home" />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <CoBrand />
          <AlphaNav />
        </div>
        <PulseLine className="mb-6" />
        <p className="mb-8 rounded-xl border border-border bg-muted/40 px-4 py-3 text-xs leading-5 text-muted-foreground">
          {DISCLAIMER}
        </p>
        {children}
        <footer className="mt-16 border-t border-border pt-6">
          <CoBrand className="mb-4" />
          <p className="text-xs leading-5 text-muted-foreground">
            {DISCLAIMER}
          </p>
        </footer>
      </main>
    </div>
  );
}
