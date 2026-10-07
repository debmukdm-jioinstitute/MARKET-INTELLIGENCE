const REGION_ISO: Record<string, string> = {
  "United States": "US",
  India: "IN",
  Canada: "CA",
  Brazil: "BR",
  Mexico: "MX",
  Chile: "CL",
  "United Kingdom": "GB",
  Germany: "DE",
  France: "FR",
  Eurozone: "EU",
  Japan: "JP",
  "Hong Kong": "HK",
  China: "CN",
  Singapore: "SG",
  Australia: "AU",
  "South Korea": "KR",
  Taiwan: "TW",
  Indonesia: "ID",
  Malaysia: "MY",
  "New Zealand": "NZ",
  Switzerland: "CH",
  "South Africa": "ZA",
  Turkey: "TR",
};

function flagEmoji(iso2: string): string {
  return String.fromCodePoint(
    ...[...iso2.toUpperCase()].map((c) => 127397 + c.charCodeAt(0)),
  );
}

export function RegionFlag({ region, className }: { region: string; className?: string }) {
  const iso = REGION_ISO[region];
  const glyph = iso ? flagEmoji(iso) : region === "Global" ? "🌐" : region.slice(0, 2).toUpperCase();
  return (
    <span
      className={
        className ??
        "inline-flex h-[21px] w-[32px] shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-[#151515]/15 text-[14px] leading-none shadow-xs"
      }
      aria-hidden
    >
      {glyph}
    </span>
  );
}
