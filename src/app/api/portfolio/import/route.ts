import { guardExpensive } from "@/lib/api-guard";
import {
  parseExcelBuffer,
  parseStatementRows,
  textToRows,
} from "@/lib/brokers/universal-statement-parser";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const blocked = await guardExpensive(req, {
    name: "import-statement",
    flag: "broker-import",
    max: 40,
    windowSec: 3600,
  });
  if (blocked) return blocked;

  const contentType = req.headers.get("content-type") || "";

  try {
    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file");
      const brokerHint = (formData.get("brokerHint") as string) || undefined;
      const defaultMarket =
        (formData.get("defaultMarket") as "IN" | "US") || undefined;

      if (!file || !(file instanceof Blob)) {
        return NextResponse.json(
          { error: "Please upload a statement or holdings file." },
          { status: 400 }
        );
      }

      const fileName = file.name.toLowerCase();
      let rows: string[][] = [];
      let rawText = "";

      if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
        const buffer = await file.arrayBuffer();
        const parsedExcel = await parseExcelBuffer(buffer);
        rows = parsedExcel.rows;
        rawText = `${fileName} sheet:${parsedExcel.sheetName}`;
      } else {
        rawText = await file.text();
        rows = textToRows(rawText);
      }

      const result = await parseStatementRows(rows, `${fileName} ${rawText}`, {
        brokerHint,
        defaultMarket,
      });

      return NextResponse.json({
        ...result,
        fileName: file.name,
      });
    } else {
      // JSON body (pasted text)
      let body: { text?: string; brokerHint?: string; defaultMarket?: "IN" | "US" };
      try {
        body = await req.json();
      } catch {
        return NextResponse.json(
          { error: "Invalid JSON payload." },
          { status: 400 }
        );
      }

      const text = body.text?.trim();
      if (!text) {
        return NextResponse.json(
          { error: "Statement or CSV text cannot be empty." },
          { status: 400 }
        );
      }

      const rows = textToRows(text);
      const result = await parseStatementRows(rows, text, {
        brokerHint: body.brokerHint,
        defaultMarket: body.defaultMarket,
      });

      return NextResponse.json(result);
    }
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Failed to parse statement / holdings";
    console.error("Brokerage statement import failed:", err);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
