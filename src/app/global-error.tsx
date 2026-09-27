"use client";

/** Next.js root error UI — keep Google Sans and a path home when RSC/client throws. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
          <p className="text-sm font-bold uppercase tracking-wider text-primary">Market Intelligence</p>
          <h1 className="text-xl font-semibold">This page couldn&apos;t load</h1>
          <p className="text-sm text-muted-foreground">
            Something failed while rendering. Try again, or return to the dashboard.
          </p>
          <div className="flex flex-wrap justify-center gap-2 pt-2">
            <button
              type="button"
              onClick={() => reset()}
              className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90"
            >
              Reload
            </button>
            <a
              href="/Home"
              className="rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-accent"
            >
              Go to Home
            </a>
          </div>
        </div>
      </body>
    </html>
  );
}
