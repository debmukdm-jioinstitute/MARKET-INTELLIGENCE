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
        subtitle="Real-time global news, maps, country instability (CII), and finance radar — integrated from koala73/worldmonitor. India macro and portfolio tools remain in Market Intelligence menus."
      />
      <WorldMonitorFrame variant="finance" />
    </div>
  );
}
