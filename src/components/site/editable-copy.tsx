"use client";

import { useSiteContent } from "@/components/providers/site-content-provider";
import { siteContentSlot } from "@/lib/site-content";
import { cn } from "@/lib/utils";
import { usePathname } from "next/navigation";
import type { ComponentPropsWithoutRef, ElementType } from "react";

type EditableCopyProps<T extends ElementType> = {
  /** Stable id under this pathname, e.g. `hero-india.kicker` */
  id: string;
  as?: T;
  children: string;
  label?: string;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "children" | "className">;

export function EditableCopy<T extends ElementType = "span">({
  id,
  as,
  children,
  label,
  className,
  ...rest
}: EditableCopyProps<T>) {
  const path = usePathname();
  const slot = siteContentSlot(path, id);
  const text = useSiteContent(slot, children);
  const Tag = (as ?? "span") as ElementType;

  return (
    <Tag
      {...rest}
      data-mi-slot={slot}
      data-mi-field="body"
      data-mi-label={label ?? id}
      className={cn(className)}
      suppressContentEditableWarning
    >
      {text}
    </Tag>
  );
}
