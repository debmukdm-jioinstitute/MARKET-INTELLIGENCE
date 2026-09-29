import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    agencies: [
      {
        name: "CRISIL Ratings Limited",
        group: "An S&P Global Company",
        websiteUrl: "https://www.crisilratings.com/",
        coverage: "Largest credit rating agency in India covering large corporates, infrastructure, and financial sector.",
      },
      {
        name: "ICRA Limited",
        group: "A Moody's Investors Service Company",
        websiteUrl: "https://www.icra.in/",
        coverage: "Deep focus on banks, NBFCs, corporate debt, structured finance, and municipal bonds.",
      },
      {
        name: "CARE Ratings Limited",
        group: "CARE Edge",
        websiteUrl: "https://www.careratings.com/",
        coverage: "Pioneering Indian ratings agency with strong presence in mid-market corporates and infrastructure.",
      },
      {
        name: "India Ratings and Research Private Limited",
        group: "A Fitch Group Company",
        websiteUrl: "https://www.indiaratings.co.in/",
        coverage: "Corporate finance, financial institutions, public finance, and structured finance ratings.",
      },
      {
        name: "Acuité Ratings & Research Limited",
        group: "SEBI Registered & RBI Accredited",
        websiteUrl: "https://www.acuite.in/",
        coverage: "Fast-growing credit agency covering corporate entities, SMEs, and bond issuances.",
      },
      {
        name: "Brickwork Ratings India Private Limited",
        group: "SEBI Registered & RBI Accredited",
        websiteUrl: "https://www.brickworkratings.com/",
        coverage: "Bank loan ratings, capital market instruments, and municipal bonds.",
      }
    ],
    regulations: {
      sebiCRA: "SEBI (Credit Rating Agencies) Regulations, 1999 (amended 2024)",
      rbiBasel: "RBI Guidelines on Implementation of Basel III Capital Regulations (External Credit Assessment Institutions)",
      mandate: "Credit rating agencies must publish rating actions and comprehensive rationale on their websites immediately upon committee approval.",
    },
    asOf: "September 2026",
  });
}
