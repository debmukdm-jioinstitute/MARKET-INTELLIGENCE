import { WorldMonitorFrame } from "@/components/worldmonitor/world-monitor-frame";
import { WorldMonitorPageShell } from "@/components/worldmonitor/world-monitor-page-shell";

export const metadata = {
  title: "World Monitor · Global intelligence · Market Intelligence",
  description:
    "World Monitor global intelligence dashboard — live map, CII, news, and geopolitical layers proxied from worldmonitor.app.",
};

export default function WorldMonitorPage() {
  return (
    <WorldMonitorPageShell>
      <WorldMonitorFrame variant="global" />
    </WorldMonitorPageShell>
  );
}
