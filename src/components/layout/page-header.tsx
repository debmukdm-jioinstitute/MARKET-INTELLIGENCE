"use client";

import { useSiteContent } from "@/components/providers/site-content-provider";
import { siteContentSlot } from "@/lib/site-content";
import { TrustNote } from "@/components/ui/trust-note";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ComponentProps } from "react";
import { useId, useState } from "react";

type TrustProps = ComponentProps<typeof TrustNote>;

export function PageHeader({
  kicker,
  title,
  subtitle,
  className,
  titleAs: TitleTag = "h2",
  trust,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
  className?: string;
  titleAs?: "h1" | "h2";
  /** Source / freshness / methodology line shown under the subtitle. */
  trust?: TrustProps;
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
    <div className={cn("portal-header-enter mb-4 sm:mb-5", className)}>
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
      {trust ? <TrustNote {...trust} className="mt-1.5" /> : null}
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
  trust,
  collapsible = true,
  defaultOpen,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
  /** Renders a source / freshness / methodology / disclaimer line under the panel body. */
  trust?: TrustProps;
  /** Click header to expand/collapse body. Default true sitewide. */
  collapsible?: boolean;
  /** Initial open state when collapsible. Default true — user can collapse. */
  defaultOpen?: boolean;
}) {
  const path = usePathname();
  const titleStr = typeof title === "string" ? title : "Panel";
  const subtitleStr = typeof subtitle === "string" ? subtitle : "";
  const bodyId = useId();
  const [open, setOpen] = useState(defaultOpen ?? true);

  const titleSlot = panelSlot(path, id, titleStr, "title");
  const subSlot = panelSlot(path, id, titleStr, "subtitle");

  const displayTitle = useSiteContent(titleSlot, titleStr);
  const displaySubtitle = useSiteContent(subSlot, subtitleStr);

  const headerInner = (
    <>
      <div className="min-w-0 flex-1">
        <h3
          data-mi-slot={titleSlot}
          data-mi-field="title"
          data-mi-label={`Panel: ${titleStr}`}
          className="font-heading text-base font-bold tracking-tight text-foreground normal-case [font-variant-ligatures:none]"
        >
          {typeof title === "string" ? displayTitle : title}
        </h3>
        {(displaySubtitle || subtitle) ? (
          <div
            data-mi-slot={subSlot}
            data-mi-field="subtitle"
            data-mi-label={`Panel subtitle: ${titleStr}`}
            className="mt-0.5 text-sm leading-snug text-muted-foreground"
          >
            {typeof subtitle === "string" ? displaySubtitle || subtitle : subtitle}
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
      {collapsible ? (
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-muted-foreground transition-transform duration-200",
            open && "rotate-180",
          )}
          aria-hidden
        />
      ) : null}
    </>
  );

  return (
    <section id={id} className={cn("portal-panel-enter rounded-xl border border-border bg-card shadow-[var(--shadow-sm)]", className)}>
      <div
        className={cn(
          "flex items-start justify-between gap-2 border-b border-border px-4 py-3.5",
          !open && collapsible && "border-b-0",
        )}
      >
        {collapsible ? (
          <button
            type="button"
            className="flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-2 rounded-lg text-left outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            aria-expanded={open}
            aria-controls={bodyId}
            onClick={() => setOpen((v) => !v)}
          >
            {headerInner}
          </button>
        ) : (
          <div className="flex min-w-0 flex-1 items-start justify-between gap-2">{headerInner}</div>
        )}
        {action ? (
          <div className="shrink-0" onClick={(e) => e.stopPropagation()}>
            {action}
          </div>
        ) : null}
      </div>
      {(!collapsible || open) && (
        <>
          <div id={bodyId} className="p-4">
            {children}
          </div>
          {trust ? <TrustNote {...trust} className="border-t border-border px-4 py-2.5" /> : null}
        </>
      )}
    </section>
  );
}
