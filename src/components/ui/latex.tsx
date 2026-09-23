"use client";

import React, { useMemo } from "react";
import katex from "katex";
import { cn } from "@/lib/utils";

interface LatexProps {
  math: string;
  block?: boolean;
  className?: string;
}

export function Latex({ math, block = false, className }: LatexProps) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        strict: false,
        trust: true,
      });
    } catch (err) {
      console.warn("KaTeX render error:", err);
      return `<span class="font-mono text-xs text-blue-600">${math}</span>`;
    }
  }, [math, block]);

  if (block) {
    return (
      <div
        className={cn(
          "my-2 overflow-x-auto py-2 px-3 rounded-lg bg-muted border border-border/60 text-blue-700 font-mono text-sm leading-relaxed",
          className
        )}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={cn("inline-block align-middle font-mono text-blue-600/90", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
