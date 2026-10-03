import { readFile } from "node:fs/promises";
import PDFDocument from "pdfkit";
import { DISCLAIMER } from "./config";
export async function certificatePdf(input: {
  id: string;
  name: string;
  kind: string;
  season: string;
}) {
  const path = process.env.COMPETITION_GOOGLE_SANS_FONT_PATH;
  if (!path) throw new Error("Certificate font needs owner input.");
  await readFile(path);
  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      layout: "landscape",
      margin: 48,
      font: path,
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("error", reject);
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.rect(25, 25, 792, 545).lineWidth(2).strokeColor("#1a73e8").stroke();
    doc
      .fillColor("#1a73e8")
      .fontSize(16)
      .text("MARKET INTELLIGENCE × JIO INSTITUTE", 48, 65, { align: "center" });
    doc
      .fillColor("#202124")
      .fontSize(32)
      .text(input.season, 48, 125, { align: "center" });
    doc
      .fontSize(22)
      .text(
        `Certificate of ${input.kind === "Champion" ? "Championship" : input.kind}`,
        48,
        190,
        { align: "center" },
      );
    doc.fontSize(14).text("Awarded to", 48, 245, { align: "center" });
    doc.fontSize(28).text(input.name, 48, 275, { align: "center" });
    doc
      .fontSize(12)
      .text("One trading week · Virtual portfolio championship", 48, 340, {
        align: "center",
      });
    doc
      .fontSize(10)
      .text(`Verification ID: ${input.id}`, 48, 405, { align: "center" });
    doc.text(`Verify at /alpha-league/verify/${input.id}`, 48, 425, {
      align: "center",
    });
    doc
      .fontSize(9)
      .fillColor("#5f6368")
      .text(DISCLAIMER, 70, 495, { align: "center", width: 702 });
    doc.end();
  });
}
