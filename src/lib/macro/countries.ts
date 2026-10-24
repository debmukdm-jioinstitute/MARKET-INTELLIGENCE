export type CountryMeta = {
  iso: string;
  iso2: string;
  name: string;
  flag: string;
  currency: string;
  region: string;
};

export const GLOBAL_23_COUNTRIES: CountryMeta[] = [
  { iso: "ind", iso2: "IN", name: "India", flag: "🇮🇳", currency: "INR (₹)", region: "Asia" },
  { iso: "usa", iso2: "US", name: "United States", flag: "🇺🇸", currency: "USD ($)", region: "Americas" },
  { iso: "chn", iso2: "CN", name: "China", flag: "🇨🇳", currency: "CNY (¥)", region: "Asia" },
  { iso: "jpn", iso2: "JP", name: "Japan", flag: "🇯🇵", currency: "JPY (¥)", region: "Asia" },
  { iso: "deu", iso2: "DE", name: "Germany", flag: "🇩🇪", currency: "EUR (€)", region: "Europe" },
  { iso: "gbr", iso2: "GB", name: "United Kingdom", flag: "🇬🇧", currency: "GBP (£)", region: "Europe" },
  { iso: "fra", iso2: "FR", name: "France", flag: "🇫🇷", currency: "EUR (€)", region: "Europe" },
  { iso: "ita", iso2: "IT", name: "Italy", flag: "🇮🇹", currency: "EUR (€)", region: "Europe" },
  { iso: "bra", iso2: "BR", name: "Brazil", flag: "🇧🇷", currency: "BRL (R$)", region: "Americas" },
  { iso: "can", iso2: "CA", name: "Canada", flag: "🇨🇦", currency: "CAD ($)", region: "Americas" },
  { iso: "kor", iso2: "KR", name: "South Korea", flag: "🇰🇷", currency: "KRW (₩)", region: "Asia" },
  { iso: "aus", iso2: "AU", name: "Australia", flag: "🇦🇺", currency: "AUD ($)", region: "Asia-Pacific" },
  { iso: "mex", iso2: "MX", name: "Mexico", flag: "🇲🇽", currency: "MXN ($)", region: "Americas" },
  { iso: "idn", iso2: "ID", name: "Indonesia", flag: "🇮🇩", currency: "IDR (Rp)", region: "Asia" },
  { iso: "sau", iso2: "SA", name: "Saudi Arabia", flag: "🇸🇦", currency: "SAR (﷼)", region: "Middle East" },
  { iso: "tur", iso2: "TR", name: "Turkey", flag: "🇹🇷", currency: "TRY (₺)", region: "Europe/Asia" },
  { iso: "zaf", iso2: "ZA", name: "South Africa", flag: "🇿🇦", currency: "ZAR (R)", region: "Africa" },
  { iso: "arg", iso2: "AR", name: "Argentina", flag: "🇦🇷", currency: "ARS ($)", region: "Americas" },
  { iso: "esp", iso2: "ES", name: "Spain", flag: "🇪🇸", currency: "EUR (€)", region: "Europe" },
  { iso: "nld", iso2: "NL", name: "Netherlands", flag: "🇳🇱", currency: "EUR (€)", region: "Europe" },
  { iso: "che", iso2: "CH", name: "Switzerland", flag: "🇨🇭", currency: "CHF (Fr)", region: "Europe" },
  { iso: "sgp", iso2: "SG", name: "Singapore", flag: "🇸🇬", currency: "SGD ($)", region: "Asia" },
  { iso: "rus", iso2: "RU", name: "Russia", flag: "🇷🇺", currency: "RUB (₽)", region: "Europe/Asia" },
];

export function getCountry(iso: string): CountryMeta | undefined {
  const norm = iso.toLowerCase();
  return GLOBAL_23_COUNTRIES.find((c) => c.iso === norm || c.iso2.toLowerCase() === norm);
}
