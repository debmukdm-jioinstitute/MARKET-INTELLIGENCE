import { getAllBrokerResearchReports } from "../broker-research/database";
import { getAllPromoterActivities } from "../promoters/database";
import { getAllCreditActivities } from "../credit/database";
import { getAllMutualFunds } from "../funds/database";
import { getAllRetailSentimentData } from "../reddit-sentiment/database";
import type { NewEvent } from "./types";

export async function detectFeedUpdates(): Promise<NewEvent[]> {
  const events: NewEvent[] = [];

  // 1. Broker Research Revisions
  try {
    const reports = getAllBrokerResearchReports();
    for (const r of reports) {
      if (r.targetChangePct >= 8 || r.changeType === "UPGRADED_RATING") {
        events.push({
          key: `broker:${r.id}:${r.date}`,
          category: "broker",
          severity: "high",
          title: `${r.broker} raised ${r.symbol} target price to ₹${r.targetPrice.toLocaleString("en-IN")} (+${r.targetChangePct.toFixed(1)}%)`,
          body: `Rating: ${r.rating} · Analyst: ${r.analyst} · CMP ₹${r.cmp.toLocaleString("en-IN")} (${r.upsidePct > 0 ? "+" : ""}${r.upsidePct.toFixed(1)}% upside). Thesis: ${r.thesis}`,
          href: "/research",
        });
      } else if (r.targetChangePct >= 5 || r.changeType === "TARGET_RAISED") {
        events.push({
          key: `broker:${r.id}:${r.date}`,
          category: "broker",
          severity: "medium",
          title: `${r.broker} increased ${r.symbol} target price to ₹${r.targetPrice.toLocaleString("en-IN")}`,
          body: `Rating: ${r.rating} · Previous target ₹${r.previousTarget.toLocaleString("en-IN")} (+${r.targetChangePct.toFixed(1)}%). Thesis: ${r.thesis}`,
          href: "/research",
        });
      } else if (r.targetChangePct <= -5 || r.changeType === "TARGET_CUT" || r.changeType === "DOWNGRADED_RATING") {
        events.push({
          key: `broker:${r.id}:${r.date}`,
          category: "broker",
          severity: "high",
          title: `${r.broker} cut ${r.symbol} target price to ₹${r.targetPrice.toLocaleString("en-IN")} (${r.targetChangePct.toFixed(1)}%)`,
          body: `Rating: ${r.rating} · Key risk: ${r.keyRisks[0] ?? "Operational headwinds"}.`,
          href: "/research",
        });
      }
    }
  } catch (e) {
    console.error("Broker feed notification detection error", e);
  }

  // 2. Promoter & Insider Activity
  try {
    const acts = getAllPromoterActivities();
    for (const p of acts) {
      if ((p.category === "PROMOTER_BUYING" || p.category === "INSIDER_BUYING") && p.transactionValueCr >= 50) {
        events.push({
          key: `promoter:${p.id}:${p.transactionDate}`,
          category: "promoter",
          severity: "high",
          title: `Promoter buying: ₹${p.transactionValueCr.toFixed(1)} Cr in ${p.symbol}`,
          body: `${p.personName} (${p.personCategory}) acquired ${p.sharesCount.toLocaleString("en-IN")} shares in ${p.companyName}. Stake increased to ${p.stakePctAfter}%.`,
          href: "/intelligence/promoters",
        });
      } else if ((p.category === "PROMOTER_BUYING" || p.category === "INSIDER_BUYING") && p.transactionValueCr >= 10) {
        events.push({
          key: `promoter:${p.id}:${p.transactionDate}`,
          category: "promoter",
          severity: "medium",
          title: `Insider buy: ₹${p.transactionValueCr.toFixed(1)} Cr in ${p.symbol}`,
          body: `${p.personName} bought ${p.sharesCount.toLocaleString("en-IN")} shares at ₹${p.transactionPriceInr}.`,
          href: "/intelligence/promoters",
        });
      } else if (p.category === "PLEDGE_DECREASE") {
        events.push({
          key: `promoter:${p.id}:${p.transactionDate}`,
          category: "promoter",
          severity: "medium",
          title: `${p.symbol}: Promoters de-pledged ${Math.abs(p.stakePctChange).toFixed(1)}% equity`,
          body: `Controlling promoters reduced pledge commitments, improving balance sheet security for ${p.companyName}.`,
          href: "/intelligence/promoters",
        });
      } else if (p.category === "PLEDGE_INCREASE") {
        events.push({
          key: `promoter:${p.id}:${p.transactionDate}`,
          category: "promoter",
          severity: "high",
          title: `Governance Alert: Promoter pledge increased in ${p.symbol}`,
          body: `Promoters encumbered additional equity. Total pledged holding at ${p.pledgePctOfTotalEquity?.toFixed(1) ?? "elevated"}%.`,
          href: "/intelligence/promoters",
        });
      } else if ((p.category === "BLOCK_DEAL" || p.category === "BULK_DEAL") && p.transactionValueCr >= 100) {
        events.push({
          key: `promoter:${p.id}:${p.transactionDate}`,
          category: "promoter",
          severity: "high",
          title: `Major Block Deal: ₹${p.transactionValueCr.toFixed(0)} Cr in ${p.symbol}`,
          body: `${p.personName} transacted ${p.sharesCount.toLocaleString("en-IN")} shares at ₹${p.transactionPriceInr}.`,
          href: "/intelligence/promoters",
        });
      }
    }
  } catch (e) {
    console.error("Promoter feed notification detection error", e);
  }

  // 3. Credit Rating Actions
  try {
    const credits = getAllCreditActivities();
    for (const c of credits) {
      if (c.action === "RATING_UPGRADE") {
        events.push({
          key: `credit:${c.id}:${c.actionDate}`,
          category: "credit",
          severity: c.ratedDebtAmountCr >= 500 ? "high" : "medium",
          title: `${c.agency} upgraded ${c.symbol} credit rating to ${c.ratingAfter}`,
          body: `${c.companyName} (${c.instrument}) · Was ${c.ratingBefore}. Rated debt quantum: ₹${c.ratedDebtAmountCr.toLocaleString("en-IN")} Cr. Liquidity: ${c.liquidityAssessment}.`,
          href: "/intelligence/credit",
        });
      } else if (c.action === "RATING_DOWNGRADE" || c.action === "CREDIT_WATCH") {
        events.push({
          key: `credit:${c.id}:${c.actionDate}`,
          category: "credit",
          severity: "high",
          title: `Credit Warning: ${c.agency} ${c.action === "RATING_DOWNGRADE" ? "downgraded" : "flagged on watch"} ${c.symbol}`,
          body: `Rating: ${c.ratingAfter} (${c.outlookAfter}). ${c.agencyRationale}`,
          href: "/intelligence/credit",
        });
      }
    }
  } catch (e) {
    console.error("Credit feed notification detection error", e);
  }

  // 4. Mutual Fund Smart Money Accumulation
  try {
    const funds = getAllMutualFunds();
    for (const f of funds) {
      for (const h of f.holdings) {
        if ((h.changeStatus === "ACCUMULATED" || h.changeStatus === "NEW") && h.sharesChangePct >= 8) {
          events.push({
            key: `fund:${f.id}:${h.symbol}:${f.disclosureDate}`,
            category: "funds",
            severity: "medium",
            title: `${f.shortName} accumulated ${h.symbol} (+${h.sharesChangePct.toFixed(1)}%)`,
            body: `Added ${h.sharesChangeCount ? h.sharesChangeCount.toLocaleString("en-IN") + " shares" : "fresh shares"} (Weight ${h.weightPct.toFixed(2)}%). Category: ${f.category}.`,
            href: "/funds",
          });
        }
      }
    }
  } catch (e) {
    console.error("Mutual fund feed notification detection error", e);
  }

  // 5. Retail Sentiment Surges (Reddit)
  try {
    const reddit = getAllRetailSentimentData();
    for (const c of reddit.companies) {
      if (c.mentionChangePct7D >= 80) {
        events.push({
          key: `reddit:${c.symbol}:${c.sentimentMomentum}`,
          category: "ai",
          severity: c.mentionChangePct7D >= 120 ? "high" : "medium",
          title: `Retail mention surge: ${c.symbol} (+${c.mentionChangePct7D}% discussions)`,
          body: `${c.totalMentions7D} Reddit mentions across r/IndianStreetBets and r/IndiaInvestments. Net sentiment: ${c.netSentimentScore > 0 ? "+" : ""}${c.netSentimentScore.toFixed(1)}.`,
          href: "/intelligence/reddit",
        });
      }
    }
  } catch (e) {
    console.error("Reddit sentiment notification detection error", e);
  }

  return events;
}
