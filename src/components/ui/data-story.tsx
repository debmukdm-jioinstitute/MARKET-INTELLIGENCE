import { formatDate } from "@/lib/format";

/** Tipsheet-style lede: a headline written from today's numbers, a one-line deck, and how to read what follows. */
export function DataStory({
  headline,
  deck,
  howToRead,
  asOf,
  kicker = "Today",
}: {
  headline: string | null;
  deck?: string | null;
  howToRead?: string;
  asOf?: string | Date | null;
  kicker?: string;
}) {
  if (!headline) return null;
  return (
    <section aria-label="Summary" className="mb-4 rounded-xl border border-border bg-card px-4 py-3.5">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
        {kicker}
        {asOf ? ` · ${formatDate(asOf)}` : ""}
      </p>
      <h2 className="mt-1 font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">{headline}</h2>
      {deck ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{deck}</p> : null}
      {howToRead ? <p className="mt-2 max-w-3xl text-xs text-muted-foreground/80">How to read it: {howToRead}</p> : null}
    </section>
  );
}
