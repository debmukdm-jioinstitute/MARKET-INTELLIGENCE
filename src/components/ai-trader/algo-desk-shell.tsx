"use client";

/** Wraps algo page content — layout supplies GroupTabs + AlgoDeskControls. */
export function AlgoDeskShell({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={className ?? "space-y-4 pb-8"}>{children}</div>;
}
