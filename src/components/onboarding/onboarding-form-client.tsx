"use client";

import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";
import { downloadOnboardingFormHtml, renderOnboardingFormHtml } from "@/lib/onboarding/render-form-html";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "mi_onboarding_catalog_version";

export function OnboardingFormClient({
  next,
  autoDownload,
}: {
  next: string;
  autoDownload?: boolean;
}) {
  const [model, setModel] = useState<OnboardingFormModel | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const runDownload = useCallback((data: OnboardingFormModel) => {
    downloadOnboardingFormHtml(data);
    try {
      localStorage.setItem(STORAGE_KEY, data.catalogVersion);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/onboarding/form");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error ?? "Could not load form");
        if (cancelled) return;
        setModel(json as OnboardingFormModel);
        const stored = localStorage.getItem(STORAGE_KEY);
        const shouldAuto =
          autoDownload || (stored && stored !== json.catalogVersion) || !stored;
        if (shouldAuto) {
          runDownload(json as OnboardingFormModel);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [autoDownload, runDownload]);

  if (loading) {
    return <p className="text-sm text-muted-foreground">Preparing your onboarding form…</p>;
  }

  if (error || !model) {
    return (
      <p className="text-sm text-destructive">{error || "Form unavailable."}</p>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5 text-sm leading-6 text-muted-foreground">
        <p>
          Customer ID <strong className="text-foreground">{model.customer.customerId}</strong> · Catalog{" "}
          <strong className="text-foreground">{model.catalogVersion}</strong>
        </p>
        <p className="mt-2">
          {model.productFeatures.length} product features · {model.subscribedServices.length} subscribed services ·
          Privacy accepted {model.customer.privacyAcceptedAt ? "on record" : "—"}
        </p>
        <p className="mt-2 text-xs">
          Download or print this form anytime from here or your profile. Catalog auto-updates when we add navigation
          items — grab a fresh copy after major releases.
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => runDownload(model)}
          className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-sm)] hover:bg-primary/90"
        >
          Download onboarding form
        </button>
        <button
          type="button"
          onClick={() => {
            const w = window.open("", "_blank");
            if (w) {
              w.document.write(renderOnboardingFormHtml(model));
              w.document.close();
              w.focus();
              w.print();
            }
          }}
          className="rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          Print / save as PDF
        </button>
        <Link
          href={next}
          className="inline-flex items-center rounded-full border border-border px-5 py-2.5 text-sm font-medium hover:bg-muted"
        >
          Continue to terminal →
        </Link>
      </div>
      <p className="text-xs text-muted-foreground">
        Privacy:{" "}
        <Link href="/privacy" className="text-primary hover:underline">
          {model.legalLinks.privacy}
        </Link>
        {" · "}
        <Link href="/terms" className="text-primary hover:underline">
          Terms
        </Link>
      </p>
    </div>
  );
}
