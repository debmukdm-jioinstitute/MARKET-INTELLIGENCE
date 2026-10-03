import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/session";
import { AlphaAdmin } from "@/components/competition/admin";
export const dynamic = "force-dynamic";
export default async function Page() {
  if (!(await getAdminUser())) redirect("/admin/login");
  return <AlphaAdmin />;
}
