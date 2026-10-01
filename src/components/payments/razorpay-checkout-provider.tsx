"use client";

import Script from "next/script";
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const RazorpayReadyContext = createContext(false);

export function RazorpayCheckoutProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  const markReady = useCallback(() => {
    setReady(true);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Razorpay) {
      setReady(true);
    }
  }, []);

  return (
    <RazorpayReadyContext.Provider value={ready}>
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="afterInteractive"
        onReady={markReady}
        onLoad={markReady}
      />
      {children}
    </RazorpayReadyContext.Provider>
  );
}

export function useRazorpayCheckoutReady(): boolean {
  const fromProvider = useContext(RazorpayReadyContext);
  const [detected, setDetected] = useState(false);

  useEffect(() => {
    if (fromProvider || detected) return;
    if (typeof window !== "undefined" && window.Razorpay) {
      setDetected(true);
      return;
    }
    const id = window.setInterval(() => {
      if (window.Razorpay) {
        setDetected(true);
        window.clearInterval(id);
      }
    }, 250);
    return () => window.clearInterval(id);
  }, [fromProvider, detected]);

  return fromProvider || detected;
}
