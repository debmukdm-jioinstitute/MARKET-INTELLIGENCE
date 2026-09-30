/** Plain-English "what this means for you" summary box. Renders nothing when text is null —
 * used for HF summarizer output that may be unavailable (page then looks exactly as before). */
export function TldrBox({ text }: { text: string | null }) {
  if (!text) return null;
  return (
    <div className="mb-6 rounded-xl border border-primary/25 bg-primary/5 p-4 text-sm">
      <p className="mb-1 text-xs font-bold uppercase tracking-wide text-primary">What this means for you</p>
      <p className="leading-relaxed text-foreground">{text}</p>
    </div>
  );
}
