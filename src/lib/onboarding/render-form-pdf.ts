import type { OnboardingFormModel } from "@/lib/onboarding/build-form-model";
import PDFDocument from "pdfkit";

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

/** Server-side PDF mirror of the onboarding form (Google Sans on web; Helvetica in PDF for portability). */
export function renderOnboardingFormPdf(model: OnboardingFormModel): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ margin: 48, size: "A4" });
    const chunks: Buffer[] = [];
    doc.on("data", (c) => chunks.push(c as Buffer));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const blue = "#1a73e8";
    doc.fillColor(blue).fontSize(18).text("Market Intelligence", { continued: false });
    doc.fontSize(9).fillColor("#5f6368").text("getmarketintelligence.in · Customer onboarding form");
    doc.moveDown(0.5);
    doc.fillColor(blue).fontSize(12).text("Part I — Account & service schedule");
    doc.fontSize(8).fillColor("#5f6368").text(`Catalog ${model.catalogVersion} · Generated ${formatDate(model.generatedAt)}`);
    doc.moveDown();

    doc.fillColor("#202124").fontSize(10).text("Applicant details", { underline: true });
    doc.fontSize(9);
    doc.text(`Customer ID: ${model.customer.customerId}`);
    doc.text(`Name: ${model.customer.name}`);
    doc.text(`Email: ${model.customer.email}`);
    doc.text(`Account opened: ${formatDate(model.customer.accountOpenedAt)}`);
    doc.text(`Privacy accepted: ${formatDate(model.customer.privacyAcceptedAt)}`);
    doc.text(`Plan: Individual · Free beta · Role: ${model.customer.role}`);
    doc.moveDown();

    doc.fontSize(10).text("Subscribed services", { underline: true });
    doc.fontSize(8);
    for (const s of model.subscribedServices) {
      doc.text(`• ${s.name} [${s.status}] — ${s.description}`);
    }
    doc.moveDown();

    doc.fontSize(10).text("Product feature catalog", { underline: true });
    doc.fontSize(7);
    let section = "";
    for (const f of model.productFeatures) {
      if (f.section !== section) {
        section = f.section;
        doc.moveDown(0.3).fillColor(blue).text(section).fillColor("#202124");
      }
      doc.text(`  ${f.group} · ${f.label}${f.badge ? ` (${f.badge})` : ""} — ${f.href}`);
      doc.fillColor("#5f6368").text(`    ${f.description}`, { width: 500 }).fillColor("#202124");
    }
    doc.moveDown();

    doc.fontSize(10).text("Disclaimers", { underline: true });
    doc.fontSize(8);
    for (const d of model.disclaimers) {
      doc.text(`${d.title}. ${d.body}`, { width: 500 });
      doc.moveDown(0.2);
    }

    doc.moveDown();
    doc.fontSize(9).text(
      `Undertaking: I confirm this schedule reflects my account at generation time. Privacy: ${model.legalLinks.privacy} · Terms: ${model.legalLinks.terms}. Not investment advice.`,
      { width: 500 },
    );
    doc.text(`Signed: ${model.customer.name} · ${formatDate(model.generatedAt)}`);

    doc.end();
  });
}
