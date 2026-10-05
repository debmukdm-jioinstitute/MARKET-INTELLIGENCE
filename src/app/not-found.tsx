import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-background px-5 py-16 text-center">
      <h1 className="font-heading text-4xl font-bold tracking-tight text-foreground">Page not found</h1>
      <p className="mt-3 max-w-md text-sm text-muted-foreground">
        That URL is not on this site. Check the address, or start from the home page or help guide.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-600/90"
        >
          Home
        </Link>
        <Link
          href="/help"
          className="rounded-full border border-border bg-card px-6 py-2.5 text-sm font-semibold text-foreground transition hover:bg-accent"
        >
          Help &amp; navigation
        </Link>
      </div>
    </div>
  );
}
