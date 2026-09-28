"use client";

import { usePortalPages } from "@/components/providers/portal-page-provider";
import { isAllowedHref, PORTAL_PATH_IN_TEXT } from "@/lib/site-assistant/site-map";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, type ReactNode } from "react";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean };

function extractPrimaryPath(text: string, canNavigate: (href: string) => boolean): string | null {
  const matches = text.match(PORTAL_PATH_IN_TEXT);
  if (!matches) return null;
  for (const m of matches) {
    if (canNavigate(m)) return m;
  }
  return null;
}

function renderInline(
  text: string,
  onNavigate: (href: string) => void,
  canNavigate: (href: string) => boolean,
): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\/[a-zA-Z0-9/_-]+(?:\?[a-zA-Z0-9_=&%-]+)?)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) nodes.push(text.slice(last, m.index));
    const token = m[0];
    if (token.startsWith("**") && token.endsWith("**")) {
      nodes.push(
        <strong key={k++} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>,
      );
    } else if (token.startsWith("`") && token.endsWith("`")) {
      const inner = token.slice(1, -1);
      nodes.push(
        <code key={k++} className="rounded bg-accent/80 px-1 py-0.5 text-[11px] text-accent-foreground">
          {inner}
        </code>,
      );
    } else if (token.startsWith("/") && canNavigate(token)) {
      nodes.push(
        <Link
          key={k++}
          href={token}
          onClick={(e) => {
            e.preventDefault();
            onNavigate(token);
          }}
          className="font-semibold text-primary underline underline-offset-2 hover:text-primary/90"
        >
          {token}
        </Link>,
      );
    } else {
      nodes.push(token);
    }
    last = m.index + token.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes.length ? nodes : [text];
}

/** Split legacy one-line "a — b — c" assistant dumps into list items when needed. */
function normalizeDenseParagraph(text: string): Block[] {
  if (text.length < 120) return [{ type: "paragraph", text }];
  const parts = text.split(/\s+[-–—]\s+/);
  if (parts.length >= 3 && parts.some((p) => p.includes("**") || p.includes("/"))) {
    return [{ type: "list", items: parts.map((p) => p.trim()).filter(Boolean) }];
  }
  return [{ type: "paragraph", text }];
}

export function parseAssistantBlocks(raw: string): Block[] {
  const blocks: Block[] = [];
  const lines = raw.replace(/\r\n/g, "\n").split("\n");
  let listItems: string[] = [];
  let ordered = false;

  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "list", items: [...listItems], ordered });
      listItems = [];
      ordered = false;
    }
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) {
      flushList();
      continue;
    }
    if (/^#{1,3}\s+/.test(line)) {
      flushList();
      blocks.push({ type: "heading", text: line.replace(/^#{1,3}\s+/, "") });
      continue;
    }
    if (/^[-*•]\s+/.test(line)) {
      listItems.push(line.replace(/^[-*•]\s+/, ""));
      continue;
    }
    if (/^\d+\.\s+/.test(line)) {
      ordered = true;
      listItems.push(line.replace(/^\d+\.\s+/, ""));
      continue;
    }
    flushList();
    blocks.push(...normalizeDenseParagraph(line));
  }
  flushList();
  return blocks;
}

export function AssistantMessageBody({ text }: { text: string }) {
  const router = useRouter();
  const { hrefAllowed } = usePortalPages();
  const onNavigate = (href: string) => router.push(href);
  const canNavigate = useCallback(
    (href: string) => isAllowedHref(href) && hrefAllowed(href),
    [hrefAllowed],
  );
  const blocks = parseAssistantBlocks(text.trim());

  if (!blocks.length) return null;

  return (
    <div className="assistant-prose space-y-2.5 text-sm leading-relaxed text-foreground">
      {blocks.map((block, i) => {
        if (block.type === "heading") {
          return (
            <p key={i} className="pt-0.5 text-[11px] font-bold uppercase tracking-wide text-primary">
              {block.text}
            </p>
          );
        }
        if (block.type === "paragraph") {
          return (
            <p key={i} className="text-sm leading-relaxed text-foreground/95">
              {renderInline(block.text, onNavigate, canNavigate)}
            </p>
          );
        }
        const ListTag = block.ordered ? "ol" : "ul";
        return (
          <ListTag
            key={i}
            className={cn(
              "space-y-1.5 pl-0",
              block.ordered && "list-decimal pl-4 marker:text-primary marker:font-semibold",
            )}
          >
            {block.items.map((item, j) => {
              const path = extractPrimaryPath(item, canNavigate);
              const tileCls = cn(
                "list-none w-full rounded-lg border border-border/75 bg-background/80 px-2.5 py-2.5 text-left shadow-sm transition touch-manipulation min-h-[44px]",
                path && "border-primary/15 bg-accent/20 hover:border-primary/35 hover:bg-accent/35",
              );
              if (path) {
                return (
                  <li key={j} className="list-none">
                    <Link
                      href={path}
                      className={cn(tileCls, "block text-inherit no-underline hover:no-underline active:scale-[0.99]")}
                    >
                      <div className="text-[13px] leading-snug">{renderInline(item, onNavigate, canNavigate)}</div>
                      <span className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary underline-offset-2 group-hover:underline">
                        Open page
                        <ArrowRight className="size-3" aria-hidden />
                      </span>
                    </Link>
                  </li>
                );
              }
              return (
                <li key={j} className={tileCls}>
                  <div className="text-[13px] leading-snug">{renderInline(item, onNavigate, canNavigate)}</div>
                </li>
              );
            })}
          </ListTag>
        );
      })}
    </div>
  );
}
