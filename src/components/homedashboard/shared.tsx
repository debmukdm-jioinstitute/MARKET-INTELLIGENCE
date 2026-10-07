import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

export const cardClass =
  "rounded-3xl border border-[#dadce0] bg-white p-5 shadow-[0_1px_2px_rgba(60,64,67,0.15)] transition-shadow duration-200 hover:shadow-[0_1px_3px_rgba(60,64,67,0.3),0_4px_8px_3px_rgba(60,64,67,0.15)] sm:p-6";
export const linkClass =
  "inline-flex min-h-10 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-[#1a73e8] transition-colors hover:bg-[#e8f0fe] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1a73e8]";
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
  title,
  detail,
  action,
}: {
  title: string;
  detail: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="text-2xl font-medium tracking-tight text-[#202124] sm:text-[28px]">
          {title}
        </h2>
        <p className="mt-1 text-sm text-[#5f6368]">{detail}</p>
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
