import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export const cardClass =
  "rounded-2xl border border-stone-200 bg-white p-5 shadow-sm sm:p-6";
export const linkClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-lg text-sm font-semibold text-teal-600 transition-colors hover:text-teal-800 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-teal-600";
export const fetchOptions = {
  revalidateOnFocus: false,
  refreshInterval: 0,
  shouldRetryOnError: false,
  dedupingInterval: 60_000,
};
export async function homeJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { signal: AbortSignal.timeout(25_000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json() as Promise<T>;
}
export function SectionHeading({
  number,
  title,
  detail,
  action,
}: {
  number: string;
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-teal-600">
          {number}
        </p>
        <h2 className="text-xl font-semibold tracking-tight text-stone-900 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-stone-500">{detail}</p>
      </div>
      {action}
    </div>
  );
}
export function HomeLink({
  href,
  children,
  onClick,
}: {
  href: string;
  children: ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link prefetch={false} href={href} onClick={onClick} className={linkClass}>
      {children}
      <ArrowUpRight aria-hidden className="size-4" />
    </Link>
  );
}
export function rupees(value: number) {
  return `₹${Math.abs(value).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
}
