import { NextRequest, NextResponse } from "next/server";
import { parseOFX } from "@/lib/parsers/ofxParser";
import { parseCSV } from "@/lib/parsers/csvParser";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;

      if (!file) {
        return NextResponse.json({ error: "Nenhum arquivo enviado" }, { status: 400 });
      }

      const text = await file.text();
      const fileName = file.name.toLowerCase();

      let transactions = [];
      if (fileName.endsWith(".ofx") || text.includes("<OFX>") || text.includes("<STMTTRN>")) {
        transactions = parseOFX(text);
      } else {
        transactions = parseCSV(text);
      }

      return NextResponse.json({
        success: true,
        fileName: file.name,
        count: transactions.length,
        transactions,
      });
    }

    // JSON payload with raw text
    const body = await req.json();
    const { content, format } = body;

    if (!content) {
      return NextResponse.json({ error: "Conteúdo não informado" }, { status: 400 });
    }

    const transactions = format === "ofx" ? parseOFX(content) : parseCSV(content);

    return NextResponse.json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: "Falha ao processar arquivo de extrato", details: error.message },
      { status: 500 }
    );
  }
}
