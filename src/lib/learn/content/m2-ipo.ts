import type { LearnModule } from "../types";

export const IPO_PRIMARY: LearnModule = {
  slug: "ipo-primary-market",
  title: "IPOs & Primary Market",
  tagline: "New listings, GMP, bonds, rights and buybacks",
  description:
    "How companies raise money from the public, how to read an IPO, and how to track bonds, rights issues, buybacks and offers for sale.",
  level: "Beginner",
  navSection: "Stocks",
  accent: { text: "text-orange-600", bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500" },
  chapters: [
    {
      slug: "what-is-an-ipo",
      title: "What is an IPO and how does it work?",
      summary: "From DRHP to listing day: the full journey of an initial public offering.",
      minutes: 6,
      sections: [
        {
          paragraphs: [
            "An initial public offering (IPO) is when a private company sells shares to the public for the first time and lists on NSE and BSE. The money raised may fund growth, repay debt, or let early investors sell (an offer for sale).",
          ],
        },
        {
          heading: "The journey",
          paragraphs: [],
          bullets: [
            "Company files a draft prospectus (DRHP) with SEBI.",
            "SEBI observations, then the final prospectus (RHP) with the price band.",
            "Anchor investors are allotted shares a day before the issue opens.",
            "Subscription window of about three days: retail, non-institutional and institutional categories.",
            "Basis of allotment, refunds, then listing on T+3 after the issue closes.",
          ],
        },
        {
          heading: "Fresh issue vs offer for sale",
          paragraphs: [
            "A fresh issue creates new shares and the company receives the money. In an offer for sale (OFS), existing shareholders sell and the company gets nothing. A high OFS share can mean insiders are cashing out.",
          ],
        },
      ],
      takeaways: [
        "IPO = first public sale of shares; read the RHP before bidding.",
        "Fresh issue funds the company; OFS funds selling shareholders.",
        "Listing happens a few days after the issue closes.",
      ],
      tools: [
        { label: "IPO Pipeline", href: "/research/ipo", blurb: "Upcoming IPOs, GMP and subscription tracking." },
        { label: "Search Trends", href: "/intelligence/search-trends", blurb: "See which IPOs are drawing search interest." },
      ],
      related: ["ipo-primary-market/ipo-price-band-explained", "ipo-primary-market/what-is-ipo-gmp"],
    },
    {
      slug: "ipo-price-band-explained",
      legacySlug: "ipo-price-band-explained",
      title: "How to read an IPO price band",
      summary: "The price band is the min to max issue price. Your bid must sit inside it, or use the cut-off.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Companies publish a floor and cap price, for example ₹100 to ₹105. Retail investors bid at a price in the band or tick cut-off to accept whatever final issue price is set. The application amount is lot size × bid price.",
            "The final issue price is decided after book-building, once demand across the band is known. Bidding at cut-off means you take the final price, which is the top of the band if demand is strong.",
          ],
        },
        {
          heading: "Retail limits",
          paragraphs: [
            "Retail applications are capped at ₹2 lakh per PAN. You apply in lots, so check lot size and the minimum amount before bidding. UPI mandates block funds until allotment is final.",
          ],
        },
        {
          paragraphs: [
            "Pre-apply, where offered, lets you place the bid before the window opens. It is not the same as a confirmed allotment.",
          ],
        },
      ],
      takeaways: [
        "Bid inside the band or at cut-off.",
        "Application amount = lot size × price; retail cap is ₹2 lakh.",
        "Pre-apply does not guarantee an allotment.",
      ],
      tools: [
        { label: "IPO Pipeline", href: "/research/ipo", blurb: "Price bands, lot sizes and dates for open and upcoming issues." },
      ],
      related: ["ipo-primary-market/ipo-subscription-allotment-listing"],
    },
    {
      slug: "what-is-ipo-gmp",
      legacySlug: "what-is-ipo-gmp",
      title: "What is IPO GMP?",
      summary: "Grey market premium is an unofficial sentiment signal for listing demand, not a price or a promise.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Grey market premium (GMP) is the unofficial price investors quote for shares before listing. It reflects over-the-counter sentiment, not the price band set by the company or bids on NSE/BSE.",
            "A positive GMP often means buyers expect a listing above the issue price; a negative GMP suggests the opposite. GMP can change quickly and can be wrong on listing day.",
          ],
        },
        {
          heading: "Why it matters, and its limits",
          paragraphs: [
            "Retail investors use GMP as one input alongside the DRHP, financials and subscription data. It is unregulated and should never be treated as a promise of listing gains.",
          ],
          bullets: [
            "Estimated listing price ≈ issue price + GMP.",
            "GMP moves with subscription numbers and market mood.",
            "Weak markets can erase a high GMP before listing.",
          ],
        },
      ],
      takeaways: [
        "GMP is an unofficial sentiment gauge, not a guarantee.",
        "Use it alongside fundamentals and subscription data.",
        "Listing gain is not the same as long-term return.",
      ],
      tools: [
        { label: "IPO Pipeline", href: "/research/ipo", blurb: "Live GMP, subscription status and listing dates." },
        { label: "Retail Sentiment", href: "/intelligence/reddit", blurb: "How retail investors are talking about new issues." },
      ],
      related: ["ipo-primary-market/ipo-subscription-allotment-listing", "sentiment-and-ai/retail-sentiment-reddit"],
    },
    {
      slug: "ipo-subscription-allotment-listing",
      title: "Subscription, allotment and listing day",
      summary: "What a subscription multiple means, how allotment works and what to expect on day one.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Subscription shows how many times the shares on offer were bid for. A 40x retail subscription means retail investors bid for forty times the quota. Categories are tracked separately: QIB (institutions), NII (non-institutional) and retail.",
          ],
        },
        {
          heading: "Allotment",
          paragraphs: [
            "If a category is oversubscribed, allotment is by lottery among valid applicants, so heavy demand lowers your odds. Funds for unallotted bids are unblocked after the basis of allotment is finalised.",
          ],
        },
        {
          heading: "Listing day",
          paragraphs: [
            "New listings open after a special pre-open session and are subject to circuit bands. Listing price versus issue price is the listing gain; what happens after depends on the business, valuation and market.",
          ],
        },
      ],
      takeaways: [
        "Subscription multiple signals demand by category.",
        "Oversubscription means a lottery; demand is not allotment.",
        "Listing gain and long-term return are different things.",
      ],
      tools: [
        { label: "IPO Pipeline", href: "/research/ipo", blurb: "Day-by-day subscription tracking." },
        { label: "AI Desk", href: "/research/ai-desk", blurb: "Have the AI analysts debate a recently listed stock." },
      ],
      related: ["ipo-primary-market/what-is-ipo-gmp"],
    },
    {
      slug: "bonds-rights-buybacks",
      title: "Bonds, rights issues, buybacks and OFS",
      summary: "The other ways companies raise or return capital, and what each means for you.",
      minutes: 6,
      sections: [
        {
          heading: "Debentures and bonds",
          paragraphs: [
            "Companies issue debentures or bonds to borrow from investors for a fixed term at a stated coupon. Credit rating matters: it estimates the chance the issuer pays on time.",
          ],
        },
        {
          heading: "Rights issue",
          paragraphs: [
            "Existing shareholders are offered new shares, usually at a discount, in proportion to holdings. You can subscribe, sell the entitlement or let it lapse (which dilutes your stake).",
          ],
        },
        {
          heading: "Buyback",
          paragraphs: [
            "The company buys its own shares, often at a premium, shrinking the share count. Acceptance ratio decides how many of your tendered shares are bought. Tender-route buybacks have specific record dates.",
          ],
        },
        {
          heading: "Offer for sale (OFS)",
          paragraphs: [
            "Promoters sell stock through a special exchange window, often to meet minimum public shareholding rules. Price is usually at a discount to market.",
          ],
        },
      ],
      takeaways: [
        "Bonds pay interest; check the rating and tenure.",
        "Rights dilute you if ignored; buybacks may add a premium.",
        "Always check record dates and entitlement ratios.",
      ],
      tools: [
        { label: "Bonds, Rights & Buybacks", href: "/research/offers", blurb: "Debenture, rights, buyback and OFS calendars." },
        { label: "Credit Radar", href: "/intelligence/credit", blurb: "Rating changes for bond issuers." },
      ],
      related: ["ownership-and-risk/credit-ratings-explained"],
    },
  ],
};
