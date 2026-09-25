/** Brand + legal constants for the Excel export. Colours match the site's Google-Material theme; the font is the site's only typeface. */
export const BRAND = {
  name: "Market Intelligence",
  site: "https://getmarketintelligence.in",
  email: "Deb@getmarketintelligence.in",
  font: "Google Sans",
  primary: "1A73E8", // Google blue used for charts and accents
  primaryDark: "174EA6",
  ink: "202124",
  muted: "5F6368",
  band: "E8F0FE", // light blue band
  zebra: "F8F9FA",
  border: "DADCE0",
  good: "188038",
  bad: "D93025",
} as const;

export const DISCLAIMER_SHORT = `Strictly for personal use · No commercial use · Licensed data and assets — not for reproduction unless authorised · Commercial use or any clarification: ${BRAND.email}`;

export const DISCLAIMER_LINES: string[] = [
  "STRICTLY FOR PERSONAL USE. No commercial use of any kind.",
  `For commercial use, please contact us first: ${BRAND.email}`,
  "LICENSED DATA AND ASSETS. This workbook and everything in it are protected. Not for reproduction, redistribution, resale or republication (in whole or in part, in any medium) unless authorised in writing.",
  "Third-party data (exchanges, regulators, central banks, data vendors and publishers) remains the property of its respective owners and is subject to their own terms; source links are provided in each sheet.",
  "Informational purposes only. This is not investment, tax or legal advice and no offer or solicitation. Data may be delayed, incomplete or inaccurate; verify with the original source before relying on it. Past performance and back-tested results do not predict future results.",
  `In case of any issues or clarifications, email us at ${BRAND.email}`,
];
