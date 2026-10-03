import { landingSignClass, signClass, splitSigned } from "@/lib/sign-color";
import { cn } from "@/lib/utils";

type Palette = "portal" | "landing";
const cls = (p: Palette, v: string | number | null | undefined) => (p === "landing" ? landingSignClass(v) : signClass(v));

/** A whole formatted value coloured by its sign: red when negative, green when positive, neutral at zero. */
export function Signed({ value, children, palette = "portal", className }: { value: string | number | null | undefined; children?: React.ReactNode; palette?: Palette; className?: string }) {
  return <span className={cn(cls(palette, value), className)}>{children ?? (typeof value === "number" ? String(value) : value)}</span>;
}

/** Free text in which only explicitly signed numbers are coloured ("FII −9,484 Cr · DII +10,042 Cr"). */
export function SignedText({ text, palette = "portal" }: { text: string; palette?: Palette }) {
  const parts = splitSigned(text);
  return (
    <>
      {parts.map((p, i) => (p.tone === "flat" ? <span key={i}>{p.text}</span> : <span key={i} className={cls(palette, p.text)}>{p.text}</span>))}
    </>
  );
}
