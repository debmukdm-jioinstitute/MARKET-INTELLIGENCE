export type OfferCategory = "ncd" | "rights" | "buyback" | "ofs" | "ncd-subscription";

export type OfferSource = { provider: string; url: string; asOf: string };

export type OfferRow = {
  id: string;
  name: string;
  category: OfferCategory;
  statusHint: string | null;
  fields: Record<string, string | number | null>;
  detailUrl: string | null;
  source: OfferSource;
};

export type OfferReport = {
  category: OfferCategory;
  title: string;
  year: number;
  rows: OfferRow[];
  source: OfferSource;
};
