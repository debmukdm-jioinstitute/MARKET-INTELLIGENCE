import { defaultSiteUrl, loadOnboardingFormModelForUser } from "@/lib/onboarding/load-form-model";
import { renderOnboardingFormPdf } from "@/lib/onboarding/render-form-pdf";
import { getSessionUser } from "@/lib/session";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/** GET -> the member's onboarding form as a PDF download, generated from the current catalog. */
export async function GET(req: Request) {
  const user = await getSessionUser();
  if (!user || user.guest) return NextResponse.json({ error: "Sign in required." }, { status: 401 });
  const model = await loadOnboardingFormModelForUser(user, defaultSiteUrl(new URL(req.url).origin));
  const pdf = await renderOnboardingFormPdf(model);
  const safeId = model.customer.customerId.replace(/[^a-zA-Z0-9-_]/g, "_");
  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="market-intelligence-onboarding-${safeId}.pdf"`,
      "cache-control": "private, no-store",
    },
  });
}
