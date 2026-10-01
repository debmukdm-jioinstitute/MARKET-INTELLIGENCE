"use client";

import type { RazorpayPlanId } from "@/lib/payments/plans";
import { cn } from "@/lib/utils";
import Script from "next/script";
import { useCallback, useState } from "react";

type RazorpayHandlerResponse = {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
};

type RazorpayConstructor = new (options: Record<string, unknown>) => { open: () => void };

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

export function RazorpayCheckoutButton({
  planId,
  keyId,
  label,
  className,
  disabled,
}: {
  planId: RazorpayPlanId;
  keyId: string;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [scriptReady, setScriptReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);

  const pay = useCallback(async () => {
    if (!scriptReady || !window.Razorpay) {
      setStatus("Checkout script still loading…");
      return;
    }
    setBusy(true);
    setStatus(null);
    try {
      const orderRes = await fetch("/api/payments/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId }),
      });
      const orderJson = (await orderRes.json()) as {
        error?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        planName?: string;
      };
      if (!orderRes.ok || !orderJson.orderId) {
        throw new Error(orderJson.error ?? "Could not create order");
      }

      const rzp = new window.Razorpay({
        key: keyId,
        amount: orderJson.amount,
        currency: orderJson.currency ?? "INR",
        name: "Market Intelligence",
        description: orderJson.planName ?? "Pro subscription",
        order_id: orderJson.orderId,
        theme: { color: "#1a73e8" },
        handler: async (response: RazorpayHandlerResponse) => {
          const verifyRes = await fetch("/api/payments/razorpay/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const verifyJson = (await verifyRes.json()) as { error?: string; message?: string };
          if (!verifyRes.ok) {
            setStatus(verifyJson.error ?? "Verification failed");
            return;
          }
          setStatus(verifyJson.message ?? "Payment successful");
        },
        modal: {
          ondismiss: () => setBusy(false),
        },
      });
      rzp.open();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Checkout failed");
    } finally {
      setBusy(false);
    }
  }, [keyId, planId, scriptReady]);

  return (
    <div className="space-y-2">
      <Script
        src="https://checkout.razorpay.com/v1/checkout.js"
        strategy="lazyOnload"
        onReady={() => setScriptReady(true)}
      />
      <button
        type="button"
        disabled={disabled || busy || !scriptReady}
        onClick={() => void pay()}
        className={cn(
          "inline-flex w-full items-center justify-center rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50",
          className,
        )}
      >
        {busy ? "Opening checkout…" : label}
      </button>
      {status ? <p className="text-xs text-muted-foreground">{status}</p> : null}
    </div>
  );
}
