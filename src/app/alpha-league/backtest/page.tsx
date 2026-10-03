import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AlphaBacktest } from "@/components/competition/backtest";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.guest) redirect("/login?next=/alpha-league/backtest");
  return <AlphaBacktest />;
}
