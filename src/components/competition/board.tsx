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
      <h1 className="text-3xl font-bold">One league. One leaderboard.</h1>
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
      <div className="overflow-x-auto rounded-xl border border-border">
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
                <TableCell>{r.rank ?? "—"}</TableCell>
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
        <p className="text-muted-foreground">No participants yet.</p>
      ) : null}
    </div>
  );
}
