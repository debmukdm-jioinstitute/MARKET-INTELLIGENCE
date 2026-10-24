import { redirect } from "next/navigation";

/** Canonical calendar lives on India macro (`?view=calendar`). */
export default function MacroCalendarRedirectPage() {
  redirect("/economy?section=calendar");
}
