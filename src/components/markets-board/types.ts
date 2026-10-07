export type MarketsBoardTab = {
  id: string;
  label: string;
};

export type MarketsBoardRow = {
  id: string;
  label: string;
  subtitle: string;
  /** Filter dropdown value (country, sector, region). */
  region: string;
  /** Flag lookup; defaults to region. */
  flagRegion?: string;
  symbol: string;
  /** Yahoo symbol for 6-month history expand. */
  yahooSymbol?: string;
  tab: string;
  price: number | null;
  change: number | null;
  changePct: number | null;
  volume: number | null;
  dayLow: number | null;
  dayHigh: number | null;
  week52Low: number | null;
  week52High: number | null;
  decimals: number;
  formattedPrice: string;
  href?: string;
  sourceUrl?: string;
};

export type MarketsBoardProps = {
  title: string;
  tabs: readonly MarketsBoardTab[];
  activeTab: string;
  onTabChange: (id: string) => void;
  rows: readonly MarketsBoardRow[];
  loading?: boolean;
  error?: string | null;
  fetchedAt?: string | null;
  onRefresh?: () => void;
  searchPlaceholder?: string;
  filterLabel?: string;
  allFilterLabel?: string;
  universeAllLabel?: string;
  watchlistLabel?: string;
  noun?: string;
  changeSuffix?: string;
  watchStorageKey: string;
  delayedNote?: string;
  /** Return true to skip default navigation. */
  onOpenOverview?: (row: MarketsBoardRow) => boolean | void;
};
