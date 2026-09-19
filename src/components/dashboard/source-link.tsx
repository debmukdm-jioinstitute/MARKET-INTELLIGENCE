import type { FieldSource } from "@/lib/feeds/india/types";

export function SourceLink({ source, className }: { source: FieldSource; className?: string }) {
  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className={className ?? "text-[10px] text-primary hover:underline"}
      title={source.asOf ? `As of ${source.asOf}` : source.provider}
    >
      {source.provider}
    </a>
  );
}
