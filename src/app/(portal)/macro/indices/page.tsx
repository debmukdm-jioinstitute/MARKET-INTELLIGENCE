"use client";

import { GlobalMarketsDashboard } from "@/components/macro/global-markets/global-markets-dashboard";
import { MacroTapeSkeleton } from "@/components/macro/macro-tape-skeleton";
import { useWorldIndices } from "@/hooks/use-world-indices";
import { parseIndexFocusParam } from "@/lib/macro/indices-universe";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

export default function WorldIndicesPage() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data, loading, error, reload } = useWorldIndices();

  const isFixtureMode =
    searchParams.get("preview") === "fixtures" || searchParams.get("mockup") === "1";

  const rawFocus = searchParams.get("focus");
  const focusFromUrl = rawFocus === "volatility" ? "volatility" : parseIndexFocusParam(rawFocus);
  const [focus, setFocusState] = useState<string>(focusFromUrl ?? "americas");

  useEffect(() => {
    const raw = searchParams.get("focus");
    const parsed = raw === "volatility" ? "volatility" : parseIndexFocusParam(raw);
    if (parsed) setFocusState(parsed);
  }, [searchParams]);

  const setFocus = useCallback(
    (next: string) => {
      setFocusState(next);
      const params = new URLSearchParams(searchParams.toString());
      if (next === "americas") params.delete("focus");
      else params.set("focus", next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  return (
    <div className="-m-3 min-h-[calc(100vh-64px)] bg-[#F6F5F1] p-3 sm:-m-4 sm:p-4 md:-m-5 md:p-6 lg:p-8">
      {loading && !data && !isFixtureMode ? (
        <div className="mx-auto max-w-[1600px] space-y-4 pt-4">
          <MacroTapeSkeleton count={6} />
        </div>
      ) : (
        <GlobalMarketsDashboard
          quotes={data?.indices ?? []}
          fetchedAt={data?.fetchedAt}
          loading={loading}
          error={error}
          onRefresh={reload}
          initialFocus={focus}
          onFocusChange={setFocus}
          isFixtureMode={isFixtureMode}
        />
      )}
    </div>
  );
}
