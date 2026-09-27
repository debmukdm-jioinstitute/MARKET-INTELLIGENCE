/**
 * Controlled pick from a list that can shrink or reorder (portal nav, option expiries, etc.).
 *
 * **Root cause (React #185):** syncing with `useEffect` + `setState` when `!list.includes(selected)`
 * re-triggers every time the list reference flickers → infinite updates.
 *
 * **Fix:** derive in render via `useMemo(() => pickControlledListItem(list, selected), [list, selected])`.
 */
export function pickControlledListItem<T>(
  items: readonly T[],
  selected: T,
  equals: (a: T, b: T) => boolean = Object.is,
): T {
  if (!items.length) return selected;
  return items.some((item) => equals(item, selected)) ? selected : items[0]!;
}

/** String keys (tab titles, expiry ISO dates). */
export function pickControlledString(items: readonly string[], selected: string): string {
  return pickControlledListItem(items, selected, (a, b) => a === b);
}
