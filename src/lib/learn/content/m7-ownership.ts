import type { LearnModule } from "../types";

export const OWNERSHIP: LearnModule = {
  slug: "ownership-and-risk",
  title: "Institutional Flows, Ownership & Risk",
  tagline: "Who owns it, who is buying, and what could go wrong",
  description:
    "FII and DII flows, mutual fund positioning, promoter holdings and pledges, credit ratings, and legal and regulatory risk.",
  level: "Intermediate",
  navSection: "Stocks",
  accent: { text: "text-amber-600", bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500" },
  chapters: [
    {
      slug: "fii-dii-data-explained",
      legacySlug: "fii-dii-data-explained",
      title: "FII and DII data explained",
      summary: "Foreign and domestic institutional flows show who is net buying or selling Indian equities.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "FIIs (foreign institutional investors, also called FPIs) and DIIs (domestic institutions such as mutual funds and insurers) report net buy or sell figures for the cash segment. Positive net FII buying means foreigners added exposure that day. In recent cycles, DIIs have often absorbed FII selling.",
            "Daily flows are noisy. Use several sessions together with index price action; flows alone do not predict the next day.",
          ],
        },
        {
          heading: "What drives FII flows",
          paragraphs: [],
          bullets: [
            "US yields and the dollar.",
            "Relative valuation of India versus other emerging markets.",
            "Rupee outlook and earnings growth.",
            "Global risk appetite.",
          ],
        },
      ],
      takeaways: [
        "Net flows show who is absorbing supply, not where price goes next.",
        "Look at multi-day and monthly totals.",
        "DII buying has cushioned FII selling in many phases.",
      ],
      tools: [
        { label: "Institutional Flows", href: "/intelligence/institutional", blurb: "FII/DII cash, MF smart-money and ownership signals." },
        { label: "Daily Brief", href: "/intelligence/brief", blurb: "Flows summarised in the morning read." },
      ],
      related: ["ownership-and-risk/mutual-fund-holdings-and-overlap"],
    },
    {
      slug: "mutual-fund-holdings-and-overlap",
      title: "Mutual fund holdings and portfolio overlap",
      summary: "What fund managers hold, and how owning several funds can mean owning the same stocks.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Mutual funds disclose their holdings monthly. Rising fund ownership of a stock is a signal that professional money is accumulating; falling ownership suggests exits.",
          ],
        },
        {
          heading: "Overlap",
          paragraphs: [
            "Different funds often hold the same large caps. If you own five funds, the overlap can be so high that you are effectively holding one portfolio. Measuring overlap shows how diversified your fund basket truly is.",
          ],
        },
        {
          heading: "Smart-money signals",
          paragraphs: [
            "Look at the number of schemes holding a stock, change in holding, and the quality of the fund house, not just a single month's change.",
          ],
        },
      ],
      takeaways: [
        "Fund holdings are disclosed with a lag.",
        "High overlap means less diversification than it seems.",
        "Trends in ownership matter more than one month's move.",
      ],
      tools: [
        { label: "Institutional Flows", href: "/intelligence/institutional", blurb: "MF smart-money and ownership signals." },
        { label: "Portfolio Allocation", href: "/portfolio/allocation", blurb: "Your actual exposure by holding and sector." },
      ],
      related: ["portfolio-and-risk/diversification-basics"],
    },
    {
      slug: "promoter-holding-and-pledges",
      title: "Promoters: holding, pledges and insider trades",
      summary: "Why the owners' behaviour is among the strongest governance signals.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Promoters are the founding owners who control the company. Their shareholding, changes in it and any pledge of shares for loans say a lot about confidence and financial stress.",
          ],
        },
        {
          heading: "What to track",
          paragraphs: [],
          bullets: [
            "Promoter buying on the open market: often a positive signal.",
            "Promoter selling or dilution: check the reason and size.",
            "Pledged shares as % of holding: a rising pledge raises risk, because lenders can sell if price falls.",
            "Insider trades disclosed under SEBI rules.",
          ],
        },
        {
          paragraphs: ["One data point is a prompt, not a conclusion; check the pattern and the stated reason."],
        },
      ],
      takeaways: [
        "Skin in the game matters; watch for sustained buying.",
        "High and rising pledges raise forced-selling risk.",
        "Insider trades are public; read the reason and context.",
      ],
      tools: [
        { label: "Promoter Tracker", href: "/intelligence/promoters", blurb: "Promoter buying, selling, pledges and insider trades." },
        { label: "Company Page", href: "/intelligence/company", blurb: "Shareholding and disclosures per company." },
      ],
      related: ["ownership-and-risk/credit-ratings-explained"],
    },
    {
      slug: "credit-ratings-explained",
      title: "Credit ratings, upgrades and default watch",
      summary: "How agencies grade a borrower's ability to repay, and what a downgrade means for bonds and stocks.",
      minutes: 5,
      sections: [
        {
          paragraphs: [
            "Credit rating agencies such as CRISIL, ICRA, CARE and India Ratings grade debt from AAA (highest safety) down to D (default). Investment grade is generally BBB- and above.",
          ],
        },
        {
          heading: "Why it matters for equity investors",
          paragraphs: [
            "A downgrade raises borrowing cost and can signal weakening cash flow. Rating outlooks (positive, stable, negative) and watch placements give early warning, often before results show stress.",
          ],
        },
        {
          paragraphs: ["Pay special attention to highly leveraged firms, NBFCs and entities with refinancing needs."],
        },
      ],
      takeaways: [
        "AAA is safest; D means default.",
        "Outlook changes and watch placements are early signals.",
        "Leverage plus a downgrade is a dangerous mix.",
      ],
      tools: [
        { label: "Credit Radar", href: "/intelligence/credit", blurb: "Rating upgrades, downgrades and default watch." },
        { label: "Bonds, Rights & Buybacks", href: "/research/offers", blurb: "Debenture issues and their ratings context." },
      ],
      related: ["ipo-primary-market/bonds-rights-buybacks"],
    },
    {
      slug: "legal-and-regulatory-risk",
      title: "Legal and regulatory risk: NCLT, SEBI and courts",
      summary: "How insolvency cases, regulator orders and litigation can change a company's outlook.",
      minutes: 4,
      sections: [
        {
          paragraphs: [
            "Legal events can alter a company's value fast. The main sources are NCLT insolvency proceedings, SEBI orders (penalties, trading bans, governance actions) and significant court cases.",
          ],
        },
        {
          heading: "Reading the severity",
          paragraphs: [],
          bullets: [
            "Insolvency admission: severe, equity often wiped out.",
            "SEBI order against promoters or auditors: governance red flag.",
            "Tax or regulatory demand: size versus net worth matters.",
            "Pending appeals can reverse an adverse order.",
          ],
        },
      ],
      takeaways: [
        "Match claim size to company size.",
        "Governance orders matter beyond the fine.",
        "Follow case status, not only the headline.",
      ],
      tools: [
        { label: "Legal Risk", href: "/intelligence/legal-risk", blurb: "NCLT, SEBI and court cases involving listed companies." },
        { label: "Company Page", href: "/intelligence/company", blurb: "Disclosures and timeline for a single company." },
      ],
      related: ["fundamental-analysis/company-disclosures-and-concalls"],
    },
  ],
};
