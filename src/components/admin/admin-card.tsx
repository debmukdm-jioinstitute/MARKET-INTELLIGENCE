import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function AdminCard({
  title,
  subtitle,
  action,
  children,
  className,
  id,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-6 rounded-lg border border-gray-200 bg-gray-50 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2 border-b border-gray-200 px-4 py-3">
        <div>
          <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
          {subtitle ? <p className="text-sm text-gray-500">{subtitle}</p> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function AdminStat({
  label,
  value,
  info,
  href,
  onClick,
  external,
  className,
}: {
  label: string;
  value: string | number;
  info?: React.ReactNode;
  href?: string;
  onClick?: () => void;
  external?: boolean;
  className?: string;
}) {
  const isClickable = Boolean(href || onClick);

  return (
    <div
      onClick={!href && onClick ? onClick : undefined}
      role={!href && onClick ? "button" : undefined}
      tabIndex={!href && onClick ? 0 : undefined}
      onKeyDown={
        !href && onClick
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick();
              }
            }
          : undefined
      }
      className={cn(
        "relative rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 transition-all duration-150",
        isClickable && "group cursor-pointer hover:border-blue-400 hover:bg-blue-50/40 hover:shadow-sm",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          prefetch={false}
          target={external ? "_blank" : undefined}
          rel={external ? "noreferrer noopener" : undefined}
          className="absolute inset-0 z-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          aria-label={`${label}: ${value}`}
        />
      ) : null}

      <div className="relative z-10 flex items-start justify-between gap-1 pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-sm uppercase tracking-wider text-gray-500 truncate">{label}</p>
          {isClickable ? (
            <ArrowUpRight
              className="size-3.5 shrink-0 text-gray-400 opacity-60 transition-all duration-150 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-blue-600 group-hover:opacity-100"
              aria-hidden="true"
            />
          ) : null}
        </div>
        {info ? <div className="pointer-events-auto">{info}</div> : null}
      </div>
      <p className="relative z-10 mt-1 text-2xl font-semibold tabular-nums text-gray-900 pointer-events-none">
        {value}
      </p>
    </div>
  );
}
