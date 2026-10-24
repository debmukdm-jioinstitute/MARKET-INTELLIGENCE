"use client";
import { EconomicCalendarSection } from "@/components/dashboard/economic-calendar-section";
import { TsEvents } from "@/components/ts-charts/ts-events";

/** Shared calendar used by Today and Economy: data releases plus stored exchange holidays and corporate actions. */
export default function CalendarSection() {
  return (
    <div className="space-y-6">
      <EconomicCalendarSection />
      <TsEvents days={30} title="Upcoming holidays and corporate actions" />
    </div>
  );
}
