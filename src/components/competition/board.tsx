"use client";
import useSWR from "swr";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { BoardRow, Competition } from "@/lib/competition/types";
import { loadCompetition, percent, StatusMessage } from "./shared";
type Payload = {
  competition: Competition | null;
  rows: BoardRow[];
  preview: boolean;
  delayed: boolean;
  asOf: string;
};
const loader = (url: string) => loadCompetition<Payload>(url);
export function AlphaBoard() {
  const { data, error, isLoading } = useSWR(
    "/api/competition/leaderboard",
    loader,
    { refreshInterval: 60_000 },
  );
  return (
    <div className="space-y-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-primary">
        Standings
      </p>
      <h1 className="-mt-4 text-4xl font-bold tracking-tight sm:text-5xl">
        One league. One <span className="text-primary">leaderboard.</span>
      </h1>
      <p className="text-muted-foreground">
        Ranked by percentage return.{" "}
        {data?.competition?.status === "ended"
          ? "Final closing values"
          : "Standings refresh approximately every five minutes"}
        . Final prizes require organizer verification.
      </p>
      <StatusMessage error={error} />
      {isLoading ? <p>Loading standings…</p> : null}
      {data?.delayed ? (
        <p role="status" className="text-amber-700">
          Data delayed — unavailable values are shown as —.
        </p>
      ) : null}
      {data?.preview ? (
        <p>
          <Link
            className="text-primary underline"
            href="/login?next=/alpha-league/board"
          >
            Sign in for the full board
          </Link>{" "}
          · Public preview: top 20.
        </p>
      ) : null}
      <div className="overflow-x-auto rounded-2xl border border-border border-t-4 border-t-primary bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              {[
                "Rank",
                "Participant",
                "Return",
                "Symbols traded",
                "Eligibility",
                "Sharpe",
                "Max drawdown",
              ].map((t) => (
                <TableHead key={t}>{t}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {data?.rows.map((r, i) => (
              <TableRow key={`${r.displayName}-${i}`}>
                <TableCell>
                  <span
                    className={
                      r.rank && r.rank <= 3
                        ? "inline-flex size-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                        : "font-semibold"
                    }
                  >
                    {r.rank ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="font-medium">{r.displayName}</TableCell>
                <TableCell className="tabular-nums">
                  {percent(r.returnPct)}
                </TableCell>
                <TableCell>{r.symbolsTraded}/5</TableCell>
                <TableCell>
                  {r.disqualified
                    ? "Disqualified"
                    : r.eligible
                      ? "Activity eligible"
                      : "Ineligible / incomplete"}
                </TableCell>
                <TableCell>{r.sharpe?.toFixed(3) ?? "—"}</TableCell>
                <TableCell>{percent(r.maxDrawdown)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      {data && !data.rows.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-muted/40 p-8 text-center">
          <p className="font-semibold">No participants yet.</p>
          <p className="mt-1 text-sm text-muted-foreground">
            The board fills in once the season opens and participants place
            their first orders.
          </p>
        </div>
      ) : null}
    </div>
  );
}
