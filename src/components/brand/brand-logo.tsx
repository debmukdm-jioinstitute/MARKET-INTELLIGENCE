import { cn } from "@/lib/utils";
import Link from "next/link";

const HEIGHT = {
  xs: "h-6",
  sm: "h-7",
  md: "h-8",
  lg: "h-10",
  xl: "h-12",
} as const;

type BrandLogoProps = {
  /** Full wordmark lockup, or Mi mark only in tight chrome. */
  variant?: "lockup" | "mark";
  size?: keyof typeof HEIGHT;
  href?: string | null;
  className?: string;
  /** Invert mark/lockup on dark portal surfaces. */
  invertOnDark?: boolean;
  priority?: boolean;
  onClick?: () => void;
};

export function BrandLogo({
  variant = "lockup",
  size = "md",
  href = "/",
  className,
  invertOnDark = true,
  priority = false,
  onClick,
}: BrandLogoProps) {
  const src = variant === "mark" ? "/logo-mark.png" : "/logo.png";
  const img = (
    <img
      src={src}
      alt="Market intelligence"
      width={variant === "mark" ? 128 : 480}
      height={variant === "mark" ? 128 : 83}
      decoding="async"
      loading={priority ? "eager" : "lazy"}
      className={cn(
        "w-auto shrink-0 object-contain object-left",
        HEIGHT[size],
        variant === "lockup" && "mix-blend-multiply",
        invertOnDark && "dark:invert dark:mix-blend-normal",
        className,
      )}
    />
  );

  if (href == null) return img;

  return (
    <Link
      href={href}
      onClick={onClick}
      className="inline-flex min-w-0 items-center rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2"
    >
      {img}
    </Link>
  );
}
