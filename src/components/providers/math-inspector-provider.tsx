"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { MathInspectorDrawer, type MathInspectorRequest } from "@/components/my-portfolio/math-inspector-drawer";

interface MathInspectorContextType {
  openInspector: (request: MathInspectorRequest) => void;
  closeInspector: () => void;
  isOpen: boolean;
  activeRequest: MathInspectorRequest | null;
}

const MathInspectorContext = createContext<MathInspectorContextType | null>(null);

export function MathInspectorProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeRequest, setActiveRequest] = useState<MathInspectorRequest | null>(null);

  const openInspector = useCallback((req: MathInspectorRequest) => {
    setActiveRequest(req);
    setIsOpen(true);
  }, []);

  const closeInspector = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <MathInspectorContext.Provider
      value={{
        openInspector,
        closeInspector,
        isOpen,
        activeRequest,
      }}
    >
      {children}
      <MathInspectorDrawer
        isOpen={isOpen}
        onClose={closeInspector}
        request={activeRequest}
      />
    </MathInspectorContext.Provider>
  );
}

export function useMathInspector() {
  const ctx = useContext(MathInspectorContext);
  if (!ctx) {
    // Graceful fallback if invoked outside provider
    return {
      openInspector: () => {},
      closeInspector: () => {},
      isOpen: false,
      activeRequest: null,
    };
  }
  return ctx;
}
