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
    <div className="-mx-3 -mt-3 mb-0 flex min-h-[calc(100dvh-8.5rem)] min-w-0 flex-col bg-[#F6F5F1] p-2 sm:-mx-4 sm:-mt-4 sm:p-2 md:-mx-5 md:-mt-5 md:p-2 min-[1100px]:h-[calc(100dvh-10.75rem)] min-[1100px]:max-h-[calc(100dvh-10.75rem)] min-[1100px]:overflow-hidden">
      {loading && !data && !isFixtureMode ? (
        <div className="w-full space-y-3 pt-2">
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
