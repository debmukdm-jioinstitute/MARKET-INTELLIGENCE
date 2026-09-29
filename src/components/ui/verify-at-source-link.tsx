import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { VerificationLink } from "@/lib/intelligence/verification-links";

export function VerifyAtSourceLink({
  href,
  label,
  className,
}: VerificationLink & { className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1 text-xs font-semibold text-primary hover:text-primary/80 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 rounded-sm",
        className,
      )}
    >
      <span>{label}</span>
      <ExternalLink className="size-3 shrink-0" aria-hidden />
    </a>
  );
}

export function IntelligenceSourceStrip({
  sources,
  className,
}: {
  sources: VerificationLink[];
  className?: string;
}) {
  if (!sources.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px]", className)}>
      <span className="text-muted-foreground font-semibold uppercase tracking-wide">Verify at source</span>
      {sources.map((source) => (
        <VerifyAtSourceLink key={`${source.href}-${source.label}`} {...source} />
      ))}
    </div>
  );
}
