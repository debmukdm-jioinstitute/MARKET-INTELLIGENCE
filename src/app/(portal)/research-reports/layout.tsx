/** Listing shell is static; report rows load client-side from /api/research-reports (cron + SWR). */
export const revalidate = 3600;

export default function ResearchReportsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
