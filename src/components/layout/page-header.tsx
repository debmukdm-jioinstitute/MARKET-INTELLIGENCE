export function PageHeader({
  kicker,
  title,
  subtitle,
}: {
  kicker: string;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-6">
      <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-primary">{kicker}</p>
      <h2 className="mt-1 font-heading text-2xl font-semibold tracking-tight">{title}</h2>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

export function Panel({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className ?? ""}`}>
      <div className="border-b border-border px-4 py-3">
        <h3 className="text-sm font-semibold">{title}</h3>
        {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}
