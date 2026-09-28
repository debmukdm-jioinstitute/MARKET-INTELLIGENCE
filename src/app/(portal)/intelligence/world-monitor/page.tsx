import { WorldMonitorFrame } from "@/components/worldmonitor/world-monitor-frame";
import { PageHeader } from "@/components/layout/page-header";

export const metadata = {
  title: "World Monitor · Global intelligence · Market Intelligence",
  description:
    "Embedded World Monitor finance dashboard — geopolitical news, maps, country instability, and cross-asset radar.",
};

export default function WorldMonitorPage() {
  return (
    <div className="space-y-6 pb-10">
      <PageHeader
        kicker="Global intelligence"
        title="World Monitor"
        subtitle="Global news, maps, and finance radar — click Open World Monitor (loads on /worldmonitor/dashboard)."
      />
      <WorldMonitorFrame variant="finance" />
    </div>
  );
}
