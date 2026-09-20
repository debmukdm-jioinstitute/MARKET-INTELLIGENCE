export type IpoStatus = "open" | "closed" | "listed" | "upcoming";

export type IpoListing = {
  id: string;
  symbol: string;
  name: string;
  status: string;
  isin: string;
  issueType: "regular" | "sme";
  issueSize: number;
  industry: string;
  minPrice: number;
  maxPrice: number;
  biddingStartDate: string;
  biddingEndDate: string;
  totalSubscription: string | null;
};

export type IpoTimeline = {
  preApplyStartDate?: string;
  applicationStartDate?: string;
  applicationEndDate?: string;
  allotmentStartDate?: string;
  allotmentDate?: string;
  refundInitiationDate?: string;
  listingDate?: string;
  mandateEndDate?: string;
};

export type IpoRegistrar = {
  name: string;
  email?: string;
  contactName?: string;
  contactNumber?: string;
  website?: string;
};

export type IpoDetail = IpoListing & {
  faceValue: number | null;
  lotSize: number | null;
  minimumQuantity: number | null;
  cutOffPrice: number | null;
  listingPrice: number | null;
  listingExchange: string | null;
  rhpUrl: string | null;
  drhpUrl: string | null;
  timeline: IpoTimeline;
  registrar: IpoRegistrar | null;
};
