import Link from "next/link";

/**
 * Required footer for any AI-generated output: evidence date, where agents disagree,
 * what the confidence figures mean, and the not-advice reminder.
 */
export function AiOutputNote({
  evidenceAsOf,
  disagreement,
  className,
}: {
  /** Human-readable date/time of the newest evidence used. */
  evidenceAsOf?: string | null;
  /** Short statement of where agents disagreed, if they did. */
  disagreement?: string | null;
  className?: string;
}) {
  return (
    <div className={className}>
      <ul className="space-y-1 rounded-lg border border-border bg-muted/30 p-3 text-xs leading-5 text-muted-foreground">
        <li><span className="font-medium text-foreground">Evidence date:</span> {evidenceAsOf ?? "not provided for this run"}</li>
        {disagreement ? <li><span className="font-medium text-foreground">Agents disagree:</span> {disagreement}</li> : null}
        <li>
          <span className="font-medium text-foreground">Uncertainty:</span> confidence figures are the model&apos;s own
          estimate, not a calibrated probability. AI output can be wrong or out of date.
        </li>
        <li>
          Research information only, not investment advice.{" "}
          <Link href="/methodology#ai" className="underline-offset-2 hover:underline">How the AI works</Link>
        </li>
      </ul>
    </div>
  );
}
