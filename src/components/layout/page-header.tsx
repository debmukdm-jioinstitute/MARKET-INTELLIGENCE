"use client";

import { useSiteContent } from "@/components/providers/site-content-provider";
import { siteContentSlot } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";

export function PageHeader({
  kicker,
  title,
  subtitle,
  className,
  titleAs: TitleTag = "h2",
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  className?: string;
  titleAs?: "h1" | "h2";
}) {
  const path = usePathname();
  const kickerSlot = siteContentSlot(path, "page-header.kicker");
  const titleSlot = siteContentSlot(path, "page-header.title");
  const subtitleSlot = siteContentSlot(path, "page-header.subtitle");

  const displayKicker = useSiteContent(kickerSlot, kicker ?? "");
  const displayTitle = useSiteContent(titleSlot, title);
  const displaySubtitle = useSiteContent(subtitleSlot, subtitle ?? "");

  const showKicker = Boolean(displayKicker || kicker);

  return (
    <div className={cn("mb-4", className)}>
      {showKicker ? (
        <p
          data-mi-slot={kickerSlot}
          data-mi-field="kicker"
          data-mi-label="Kicker"
          className="text-sm uppercase tracking-[0.28em] text-blue-600 font-bold"
        >
          {displayKicker || kicker}
        </p>
      ) : (
        <span
          data-mi-slot={kickerSlot}
          data-mi-field="kicker"
          data-mi-label="Kicker"
          className="hidden"
          aria-hidden
        />
      )}
      <TitleTag
        data-mi-slot={titleSlot}
        data-mi-field="title"
        data-mi-label="Page title"
        className={cn("font-heading text-2xl font-bold tracking-tight text-foreground", showKicker ? "mt-1" : "")}
      >
        {displayTitle}
      </TitleTag>
      {(displaySubtitle || subtitle) ? (
        <p
          data-mi-slot={subtitleSlot}
          data-mi-field="subtitle"
          data-mi-label="Page subtitle"
          className="mt-1 max-w-3xl text-sm text-muted-foreground"
        >
          {displaySubtitle || subtitle}
        </p>
      ) : (
        <span
          data-mi-slot={subtitleSlot}
          data-mi-field="subtitle"
          data-mi-label="Page subtitle"
          className="hidden"
          aria-hidden
        />
      )}
    </div>
  );
}

function panelSlot(path: string, id: string | undefined, title: React.ReactNode, suffix: string) {
  const key = id ?? String(title).slice(0, 40).replace(/\s+/g, "-").toLowerCase();
  return siteContentSlot(path, `panel.${key}.${suffix}`);
}

export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  id,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  const path = usePathname();
  const titleStr = typeof title === "string" ? title : String(title);
  const subtitleStr = typeof subtitle === "string" ? subtitle : subtitle ? String(subtitle) : "";

  const titleSlot = panelSlot(path, id, titleStr, "title");
  const subSlot = panelSlot(path, id, titleStr, "subtitle");

  const displayTitle = useSiteContent(titleSlot, titleStr);
  const displaySubtitle = useSiteContent(subSlot, subtitleStr);

  return (
    <section id={id} className={`rounded-xl border border-border bg-card shadow-[var(--shadow-sm)] ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3.5">
        <div>
          <h3
            data-mi-slot={titleSlot}
            data-mi-field="title"
            data-mi-label={`Panel: ${titleStr}`}
            className="font-heading text-base font-bold tracking-tight text-foreground"
          >
            {displayTitle}
          </h3>
          {(displaySubtitle || subtitle) ? (
            <div
              data-mi-slot={subSlot}
              data-mi-field="subtitle"
              data-mi-label={`Panel subtitle: ${titleStr}`}
              className="mt-0.5 text-sm leading-snug text-muted-foreground"
            >
              {displaySubtitle || subtitle}
            </div>
          ) : (
            <span
              data-mi-slot={subSlot}
              data-mi-field="subtitle"
              data-mi-label={`Panel subtitle: ${titleStr}`}
              className="hidden"
              aria-hidden
            />
          )}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
