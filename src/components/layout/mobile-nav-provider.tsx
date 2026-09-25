"use client";

import { createContext, useContext, useState } from "react";

type Ctx = {
  open: boolean;
  setOpen: (open: boolean) => void;
  /** Section to expand when the full menu opens (used by the mobile bottom bar). */
  section: string | null;
  openSection: (title: string | null) => void;
};

const MobileNavContext = createContext<Ctx | null>(null);

export function MobileNavProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<string | null>(null);
  return (
    <MobileNavContext.Provider
      value={{
        open,
        setOpen,
        section,
        openSection: (title) => {
          setSection(title);
          setOpen(title !== null);
        },
      }}
    >
      {children}
    </MobileNavContext.Provider>
  );
}

export function useMobileNav() {
  const ctx = useContext(MobileNavContext);
  if (!ctx) throw new Error("useMobileNav must be used within MobileNavProvider");
  return ctx;
}
