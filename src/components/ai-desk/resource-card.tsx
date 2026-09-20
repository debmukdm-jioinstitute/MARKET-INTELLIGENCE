import { Code2, ExternalLink, FileText } from "lucide-react";

export function ResourceCard({
  title,
  tagline,
  paperUrl,
  paperLabel,
  codeUrl,
  codeLabel,
  extraUrl,
  extraLabel,
}: {
  title: string;
  tagline: string;
  paperUrl: string;
  paperLabel: string;
  codeUrl: string;
  codeLabel: string;
  extraUrl?: string;
  extraLabel?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <h3 className="font-heading text-sm font-semibold">{title}</h3>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{tagline}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        <a
          href={paperUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
        >
          <FileText className="size-3.5" /> {paperLabel}
        </a>
        <a
          href={codeUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
        >
          <Code2 className="size-3.5" /> {codeLabel}
        </a>
        {extraUrl ? (
          <a
            href={extraUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-1 text-[11px] text-muted-foreground hover:border-primary hover:text-primary"
          >
            <ExternalLink className="size-3.5" /> {extraLabel}
          </a>
        ) : null}
      </div>
    </div>
  );
}
