"use client";

import { isAllowedHref } from "@/lib/site-assistant/site-map";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

type Block =
  | { type: "heading"; text: string }
  | { type: "paragraph"; text: string }
  | { type: "list"; items: string[]; ordered?: boolean };

const PATH_IN_TEXT = /(\/[a-zA-Z0-9/_-]+)/g;

function extractPrimaryPath(text: string): string | null {
  const matches = text.match(PATH_IN_TEXT);
  if (!matches) return null;
  for (const m of matches) {
    if (isAllowedHref(m)) return m;
  }
  return null;
}

function renderInline(text: string, onNavigate: (href: string) => void): ReactNode[] {
  const nodes: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|`[^`]+`|\/[a-zA-Z0-9/_-]+)/g;
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
    } else if (token.startsWith("/") && isAllowedHref(token)) {
      nodes.push(
        <button
          key={k++}
          type="button"
          onClick={() => onNavigate(token)}
          className="font-medium text-primary underline-offset-2 hover:underline"
        >
          {token}
        </button>,
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
  const onNavigate = (href: string) => router.push(href);
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
              {renderInline(block.text, onNavigate)}
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
              const path = extractPrimaryPath(item);
              return (
                <li
                  key={j}
                  className={cn(
                    "list-none rounded-lg border border-border/75 bg-background/80 px-2.5 py-2 shadow-sm",
                    path && "border-primary/15 bg-accent/20",
                  )}
                >
                  <div className="text-[13px] leading-snug">{renderInline(item, onNavigate)}</div>
                  {path ? (
                    <button
                      type="button"
                      onClick={() => onNavigate(path)}
                      className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
                    >
                      Open page
                      <ArrowRight className="size-3" aria-hidden />
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ListTag>
        );
      })}
    </div>
  );
}
