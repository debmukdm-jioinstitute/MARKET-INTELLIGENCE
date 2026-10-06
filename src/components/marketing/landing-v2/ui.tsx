import { cn } from "@/lib/utils";
import Link from "next/link";
import type { ReactNode } from "react";
import { landingSignClass } from "@/lib/sign-color";
import { SignedText } from "@/components/ui/signed";

export function LandingShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing-v2 min-h-screen bg-[#f7f4ef] text-[#141414] selection:bg-[#c45c26]/20">
      {children}
    </div>
  );
}

export function Eyebrow(_props: { children: ReactNode; className?: string }) {
  return null;
}

export function SectionTitle({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-[clamp(1.75rem,3.2vw,2.65rem)] font-semibold leading-[1.12] tracking-tight text-[#141414]", className)}>
      {children}
    </h2>
  );
}

export function BodyCopy({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cn("text-[17px] leading-[1.65] text-[#3d3d3d]", className)}>{children}</p>;
}

export function MicroBullet({ children }: { children: ReactNode }) {
  return <li className="text-sm text-[#0d6b5c]">{children}</li>;
}

export function PrimaryButton({
  href,
  children,
  onClick,
  className,
}: {
  href?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center justify-center rounded-none bg-[#141414] px-6 py-3 text-[15px] font-medium text-white transition hover:bg-[#2a2a2a] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141414]",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function SecondaryButton({
  href,
  children,
  onClick,
  className,
}: {
  href?: string;
  children: ReactNode;
  onClick?: () => void;
  className?: string;
}) {
  const cls = cn(
    "inline-flex items-center justify-center rounded-none border border-[#141414] bg-transparent px-6 py-3 text-[15px] font-medium text-[#141414] transition hover:bg-[#141414]/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#141414]",
    className,
  );
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button type="button" onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

export function SourceLine({ source, fetched, prefix }: { source: string; fetched: string; prefix?: string }) {
  if (!source) {
    return fetched && fetched !== "—" ? (
      <p className="text-xs text-[#6b6b6b]">Last stored · {fetched} IST</p>
    ) : (
      <p className="text-xs text-[#6b6b6b]">Loading live feeds…</p>
    );
  }
  return (
    <p className="text-xs text-[#6b6b6b]">
      {prefix ? `${prefix} ` : null}
      Source: {source}
      {fetched && fetched !== "—" ? ` · Fetched ${fetched} IST` : null}
    </p>
  );
}

export function DataCell({ label, value, change }: { label: string; value: string; change?: string }) {
  return (
    <div className="border border-[#dcd6cc] bg-[#f7f4ef] px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[#6b6b6b]">{label}</p>
      <p className="mt-1 text-sm font-semibold tabular-nums text-[#141414]">{value ? <SignedText text={value} palette="landing" /> : "—"}</p>
      {change ? (
        <p className={cn("text-xs tabular-nums", landingSignClass(change))}>{change}</p>
      ) : null}
    </div>
  );
}

export function PaperChart({ path }: { path: string }) {
  return (
    <svg className="h-full w-full" preserveAspectRatio="none" viewBox="0 0 400 80" aria-hidden>
      {[20, 40, 60].map((y) => (
        <line key={y} x1="0" y1={y} x2="400" y2={y} stroke="rgba(20,20,20,0.08)" strokeWidth="1" />
      ))}
      <path d={path} fill="none" stroke="#c45c26" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}
