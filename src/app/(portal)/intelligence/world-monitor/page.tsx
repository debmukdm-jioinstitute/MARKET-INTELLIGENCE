import { WorldMonitorFrame } from "@/components/worldmonitor/world-monitor-frame";
import { WorldMonitorPageShell } from "@/components/worldmonitor/world-monitor-page-shell";

export const metadata = {
  title: "World Monitor · Global intelligence · Market Intelligence",
  description:
    "World Monitor global intelligence dashboard — maps, CII, news, and finance radar on Market Intelligence.",
};

export default function WorldMonitorPage() {
  return (
    <WorldMonitorPageShell>
      <WorldMonitorFrame variant="finance" />
    </WorldMonitorPageShell>
  );
}
