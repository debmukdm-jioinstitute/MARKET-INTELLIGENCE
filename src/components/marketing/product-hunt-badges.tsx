const PRODUCT_HUNT_PRODUCT_URL =
  "https://www.producthunt.com/products/get-market-intelligence-in";

const FEATURED_BADGE_URL = `${PRODUCT_HUNT_PRODUCT_URL}?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-get-market-intelligence-in`;

const EMBED_POST_URL = `${PRODUCT_HUNT_PRODUCT_URL}?embed=true&utm_source=embed&utm_medium=post_embed`;

/** Served from /public — avoids ad blockers on Product Hunt CDNs */
const FEATURED_BADGE_IMG = "/product-hunt/featured.svg";
const PRODUCT_LOGO = "/product-hunt/product-logo.png";

export function ProductHuntFeaturedBadge() {
  return (
    <a
      href={FEATURED_BADGE_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-block shrink-0"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- Product Hunt widget SVG */}
      <img
        alt="Get Market Intelligence.in - Institutional-grade insights. now Simplified. | Product Hunt"
        width={250}
        height={54}
        src={FEATURED_BADGE_IMG}
        loading="eager"
        decoding="async"
        className="h-auto w-[250px] max-w-full"
      />
    </a>
  );
}

export function ProductHuntEmbedCard() {
  return (
    <div className="max-w-[500px] rounded-xl border border-border bg-card p-5 shadow-[0_2px_8px_rgba(0,0,0,0.05)]">
      <div className="flex items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element -- Product Hunt CDN logo */}
        <img
          alt="Get Market Intelligence.in"
          src={PRODUCT_LOGO}
          width={64}
          height={64}
          className="size-16 shrink-0 rounded-lg object-cover"
        />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-lg font-semibold leading-snug text-foreground">
            Get Market Intelligence.in
          </h3>
          <p className="mt-1 line-clamp-2 text-sm leading-snug text-muted-foreground">
            Institutional-grade insights. now Simplified.
          </p>
        </div>
      </div>
      <a
        href={EMBED_POST_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-3 inline-flex items-center gap-1 rounded-full bg-[#ff6154] px-4 py-2 text-base font-semibold leading-normal text-white no-underline transition-opacity hover:opacity-90"
      >
        Check it out on Product Hunt →
      </a>
    </div>
  );
}

export function ProductHuntBadges() {
  return (
    <div className="flex flex-col gap-6 sm:flex-row sm:flex-wrap sm:items-start">
      <ProductHuntFeaturedBadge />
      <ProductHuntEmbedCard />
    </div>
  );
}
