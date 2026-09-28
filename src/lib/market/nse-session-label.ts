/** Human-readable next NSE cash session open (IST, weekdays 9:15). Holidays not modeled here — badge adds holiday copy. */
export function nextNseOpenLabel(ist: Date): string {
  const day = ist.getDay();
  const minutes = ist.getHours() * 60 + ist.getMinutes();
  const openMinutes = 9 * 60 + 15;
  const closeMinutes = 15 * 60 + 30;

  const weekday = ist.toLocaleDateString("en-IN", { weekday: "long" });

  if (day >= 1 && day <= 5 && minutes < openMinutes) {
    return `back at 9:15 AM ${weekday}`;
  }

  if (day >= 1 && day <= 5 && minutes >= openMinutes && minutes <= closeMinutes) {
    return "open now";
  }

  const next = new Date(ist);
  next.setDate(next.getDate() + 1);
  while (next.getDay() === 0 || next.getDay() === 6) {
    next.setDate(next.getDate() + 1);
  }
  const nextDay = next.toLocaleDateString("en-IN", { weekday: "long" });
  return `back at 9:15 AM ${nextDay}`;
}

export function formatHolidayShort(isoDate: string): string {
  const d = new Date(`${isoDate}T12:00:00`);
  return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}
