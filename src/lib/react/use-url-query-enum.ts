"use client";

import { pickControlledString } from "@/lib/react/pick-controlled-list-item";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

/** Sync a string enum to `?key=` without effect loops (see pickControlledString). */
export function useUrlQueryEnum<const T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): { value: T; setValue: (next: T) => void } {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const raw = searchParams.get(key);

  const parsed = useMemo((): T => {
    if (raw && (allowed as readonly string[]).includes(raw)) return raw as T;
    return fallback;
  }, [raw, allowed, fallback]);

  const value = useMemo(() => pickControlledString(allowed as readonly string[], parsed) as T, [allowed, parsed]);

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams.toString());
      if (next === fallback) params.delete(key);
      else params.set(key, next);
      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [fallback, key, pathname, router, searchParams],
  );

  return { value, setValue };
}
