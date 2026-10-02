"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

type CommandPaletteContextValue = {
  open: boolean;
  setOpen: (open: boolean | ((prev: boolean) => boolean)) => void;
};

const CommandPaletteContext = createContext<CommandPaletteContextValue | null>(null);

/** Reads the shared open/close state — used by the TopBar trigger and the dialog itself. */
export function useCommandPalette() {
  const ctx = useContext(CommandPaletteContext);
  if (!ctx) throw new Error("useCommandPalette must be used within CommandPaletteProvider");
  return ctx;
}

/**
 * Owns the palette open state and universal keyboard shortcuts:
 * - Cmd+K on Mac / iOS
 * - Ctrl+K on Windows / Linux / Android / Chromebook
 * - "/" (forward slash) when not typing in an input
 * - Spacebar when nothing is focused
 */
export function CommandPaletteProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      // 1. Universal Cmd+K (Mac) or Ctrl+K (Windows/Linux) shortcut — works from anywhere
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        setOpen((prev) => !prev);
        return;
      }

      // Check if user is currently interacting with an input/textarea/select/contenteditable
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const isInput =
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        tag === "SELECT" ||
        Boolean(target?.isContentEditable);

      if (isInput) return;

      // 2. Universal forward slash "/" trigger when not typing
      if (e.key === "/" && !e.metaKey && !e.ctrlKey && !e.altKey) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // 3. Spacebar quick open when body is active
      if (
        e.code === "Space" &&
        !open &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        document.activeElement === document.body
      ) {
        e.preventDefault();
        setOpen(true);
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <CommandPaletteContext.Provider value={{ open, setOpen }}>
      {children}
    </CommandPaletteContext.Provider>
  );
}
