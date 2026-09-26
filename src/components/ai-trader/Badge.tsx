"use client";

import { cn } from "@/lib/utils";

type Variant = "green" | "red" | "yellow" | "blue" | "purple" | "gray";

const variantClass: Record<Variant, string> = {
  green: "border-chart-2/35 text-chart-2 bg-chart-2/10",
  red: "border-destructive/35 text-destructive bg-destructive/10",
  yellow: "border-chart-3/35 text-chart-3 bg-chart-3/10",
  blue: "border-primary/35 text-primary bg-primary/10",
  purple: "border-chart-5/35 text-chart-5 bg-chart-5/10",
  gray: "border-border text-muted-foreground bg-muted",
};

export default function Badge({ label, variant = "gray" }: { label: string; variant?: Variant }) {
  return <span className={cn("t-badge", variantClass[variant])}>{label}</span>;
}
