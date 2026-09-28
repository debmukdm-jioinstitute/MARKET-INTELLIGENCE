import { WorldMonitorFreeDashboard } from "@/components/worldmonitor/world-monitor-free-dashboard";
import { WorldMonitorPageShell } from "@/components/worldmonitor/world-monitor-page-shell";

export const metadata = {
  title: "World Monitor · Global intelligence · Market Intelligence",
  description:
    "Global intelligence on Market Intelligence — free RSS news, world indices, macro, earnings, and liquidity from open feeds.",
};

export default function WorldMonitorPage() {
  return (
    <WorldMonitorPageShell>
      <WorldMonitorFreeDashboard />
    </WorldMonitorPageShell>
  );
}
