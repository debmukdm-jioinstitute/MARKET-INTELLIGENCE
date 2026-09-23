export function SetupBanner({ message }: { message: string }) {
  return (
    <div className="rounded-md border border-blue-600/30 bg-blue-600/10 px-3 py-2 text-sm text-blue-600">
      {message}
    </div>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return <p className="text-sm text-rose-600">{message}</p>;
}
