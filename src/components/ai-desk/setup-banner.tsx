export function SetupBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
      {message}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <p className="text-xs text-rose-400">{message}</p>;
}
