import { defaultSiteUrl, loadOnboardingFormModelForUser } from "@/lib/onboarding/load-form-model";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) {
    return NextResponse.json({ error: "Sign in to generate your onboarding form." }, { status: 401 });
  }

  const model = await loadOnboardingFormModelForUser(user, defaultSiteUrl(new URL(req.url).origin));
  return NextResponse.json(model, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
