import { cn } from "@/lib/utils";

export function PageHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-4">
      {kicker ? (
        <p className="text-sm uppercase tracking-[0.28em] text-blue-600 font-bold">{kicker}</p>
      ) : null}
      <h2 className={cn("font-heading text-2xl font-bold tracking-tight text-foreground", kicker ? "mt-1" : "")}>{title}</h2>
      {subtitle ? <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

export function Panel({
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
    <section id={id} className={`rounded-xl border border-border bg-card shadow-[var(--shadow-sm)] ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2 border-b border-border px-4 py-3.5">
        <div>
          <h3 className="font-heading text-base font-bold tracking-tight text-foreground">{title}</h3>
          {subtitle ? <div className="mt-0.5 text-sm leading-snug text-muted-foreground">{subtitle}</div> : null}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
