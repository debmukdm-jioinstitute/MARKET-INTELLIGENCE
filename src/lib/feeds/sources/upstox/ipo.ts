import { feedFetch } from "@/lib/feeds/http";
import { UPSTOX_BASE_URL, upstoxHeaders } from "@/lib/feeds/sources/upstox/client";
import type { IpoDetail, IpoListing, IpoStatus } from "@/lib/feeds/ipo/types";

type UpstoxIpoRow = {
  id: string;
  symbol: string;
  name: string;
  status: string;
  isin: string;
  issue_type: "regular" | "sme";
  issue_size: number;
  industry: string;
  minimum_price: number;
  maximum_price: number;
  bidding_start_date: string;
  bidding_end_date: string;
  total_subscription: string | null;
};

type UpstoxIpoListResponse = { status: string; data?: UpstoxIpoRow[] };

function toListing(row: UpstoxIpoRow): IpoListing {
  return {
    id: row.id,
    symbol: row.symbol,
    name: row.name,
    status: row.status,
    isin: row.isin,
    issueType: row.issue_type,
    issueSize: row.issue_size,
    industry: row.industry,
    minPrice: row.minimum_price,
    maxPrice: row.maximum_price,
    biddingStartDate: row.bidding_start_date,
    biddingEndDate: row.bidding_end_date,
    totalSubscription: row.total_subscription,
  };
}

export async function fetchUpstoxIpoList(status: IpoStatus = "open"): Promise<IpoListing[]> {
  const headers = upstoxHeaders();
  if (!headers) return [];

  const url = `${UPSTOX_BASE_URL}/v2/ipos?status=${status}&records=30`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox IPO list HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxIpoListResponse;
  if (json.status !== "success" || !json.data) return [];
  return json.data.map(toListing);
}

type UpstoxIpoDetailRow = UpstoxIpoRow & {
  face_value: number | null;
  lot_size: number | null;
  minimum_quantity: number | null;
  cut_off_price: number | null;
  listing_price: number | null;
  listing_exchange: string | null;
  rhp_url: string | null;
  drhp_url: string | null;
  timeline?: {
    pre_apply_start_date?: string;
    application_start_date?: string;
    application_end_date?: string;
    allotment_start_date?: string;
    allotment_date?: string;
    refund_initiation_date?: string;
    listing_date?: string;
    mandate_end_date?: string;
  };
  registrar_info?: {
    name: string;
    email?: string;
    contact_name?: string;
    contact_number?: string;
    website?: string;
  };
};

type UpstoxIpoDetailResponse = { status: string; data?: UpstoxIpoDetailRow };

export async function fetchUpstoxIpoDetail(id: string): Promise<IpoDetail | null> {
  const headers = upstoxHeaders();
  if (!headers) return null;

  const url = `${UPSTOX_BASE_URL}/v2/ipos/${encodeURIComponent(id)}`;
  const res = await feedFetch(url, { headers });
  if (!res.ok) throw new Error(`Upstox IPO detail HTTP ${res.status}`);
  const json = (await res.json()) as UpstoxIpoDetailResponse;
  if (json.status !== "success" || !json.data) return null;

  const row = json.data;
  return {
    ...toListing(row),
    faceValue: row.face_value ?? null,
    lotSize: row.lot_size ?? null,
    minimumQuantity: row.minimum_quantity ?? null,
    cutOffPrice: row.cut_off_price ?? null,
    listingPrice: row.listing_price ?? null,
    listingExchange: row.listing_exchange ?? null,
    rhpUrl: row.rhp_url ?? null,
    drhpUrl: row.drhp_url ?? null,
    timeline: {
      preApplyStartDate: row.timeline?.pre_apply_start_date,
      applicationStartDate: row.timeline?.application_start_date,
      applicationEndDate: row.timeline?.application_end_date,
      allotmentStartDate: row.timeline?.allotment_start_date,
      allotmentDate: row.timeline?.allotment_date,
      refundInitiationDate: row.timeline?.refund_initiation_date,
      listingDate: row.timeline?.listing_date,
      mandateEndDate: row.timeline?.mandate_end_date,
    },
    registrar: row.registrar_info
      ? {
          name: row.registrar_info.name,
          email: row.registrar_info.email,
          contactName: row.registrar_info.contact_name,
          contactNumber: row.registrar_info.contact_number,
          website: row.registrar_info.website,
        }
      : null,
  };
}
