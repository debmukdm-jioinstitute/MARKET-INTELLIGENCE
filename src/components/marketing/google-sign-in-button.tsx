"use client";

const btnClass =
  "flex h-12 w-full items-center justify-center gap-3 rounded-full border border-border bg-white text-sm font-semibold text-foreground shadow-[var(--shadow-sm)] transition hover:bg-muted disabled:opacity-50";

export function GoogleSignInButton({ next, disabled }: { next: string; disabled?: boolean }) {
  const dest = next.startsWith("/") ? next : "/Home";
  const href = `/api/auth/google?next=${encodeURIComponent(dest)}`;

  if (disabled) {
    return (
      <button type="button" disabled className={btnClass}>
        <GoogleIcon />
        Continue with Google
      </button>
    );
  }

  return (
    <a href={href} className={btnClass}>
      <GoogleIcon />
      Continue with Google
    </a>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.083 36 24 36c-5.522 0-10-4.477-10-10s4.478-10 10-10c2.427 0 4.652.867 6.375 2.301l6.063-6.063C34.046 9.835 29.268 8 24 8 12.955 8 4 16.955 4 28s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 12 24 12c2.427 0 4.652.867 6.375 2.301l6.063-6.063C34.046 9.835 29.268 8 24 8 16.318 8 9.656 12.337 6.306 14.691z"
      />
      <path
        fill="#4CAF50"
        d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 39.091 26.715 40 24 40c-5.177 0-9.593-3.317-11.283-7.946l-6.522 5.025C9.505 43.556 16.227 48 24 48z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l6.19 5.238C42.022 35.026 44 30.755 44 24c0-1.341-.138-2.651-.389-3.917z"
      />
    </svg>
  );
}
