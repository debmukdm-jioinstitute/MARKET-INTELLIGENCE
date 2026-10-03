import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import { AlphaPortfolio } from "@/components/competition/portfolio";
export const dynamic = "force-dynamic";
export default async function Page() {
  const user = await getSessionUser();
  if (!user || user.guest) redirect("/login?next=/alpha-league/portfolio");
  return <AlphaPortfolio />;
}
