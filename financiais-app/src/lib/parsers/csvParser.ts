import { ParsedTransaction, autoCategorize } from "./ofxParser";

/**
 * Parses a banking CSV string into normalized transactions.
 */
export function parseCSV(csvContent: string): ParsedTransaction[] {
  const lines = csvContent
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return [];

  // Detect delimiter (, or ; or \t)
  const headerLine = lines[0];
  let delimiter = ",";
  const semicolons = (headerLine.match(/;/g) || []).length;
  const commas = (headerLine.match(/,/g) || []).length;
  const tabs = (headerLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons > tabs) delimiter = ";";
  else if (tabs > commas && tabs > semicolons) delimiter = "\t";

  // Parse header columns
  const rawHeaders = splitCSVLine(headerLine, delimiter).map((h) =>
    h.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim()
  );

  // Identify column indices
  let dateIdx = -1;
  let descIdx = -1;
  let amountIdx = -1;
  let categoryIdx = -1;

  rawHeaders.forEach((h, i) => {
    if (dateIdx === -1 && (h.includes("data") || h.includes("date"))) {
      dateIdx = i;
    } else if (descIdx === -1 && (h.includes("desc") || h.includes("hist") || h.includes("memo") || h.includes("titul") || h.includes("lancamento"))) {
      descIdx = i;
    } else if (amountIdx === -1 && (h.includes("valor") || h.includes("amount") || h.includes("quantia"))) {
      amountIdx = i;
    } else if (categoryIdx === -1 && (h.includes("categ") || h.includes("rubrica"))) {
      categoryIdx = i;
    }
  });

  // Fallbacks if headers didn't match standard naming
  if (dateIdx === -1) dateIdx = 0;
  if (descIdx === -1) descIdx = rawHeaders.length > 1 ? 1 : 0;
  if (amountIdx === -1) amountIdx = rawHeaders.length > 2 ? 2 : rawHeaders.length - 1;

  const transactions: ParsedTransaction[] = [];

  for (let i = 1; i < lines.length; i++) {
    const row = splitCSVLine(lines[i], delimiter);
    if (row.length <= Math.max(dateIdx, descIdx, amountIdx)) continue;

    const rawDate = row[dateIdx]?.trim();
    const rawDesc = row[descIdx]?.trim() || "Transação Importada";
    const rawAmount = row[amountIdx]?.trim();
    const explicitCat = categoryIdx >= 0 ? row[categoryIdx]?.trim() : undefined;

    if (!rawDate || !rawAmount) continue;

    // Parse amount
    const parsedAmount = parseAmount(rawAmount);
    if (isNaN(parsedAmount) || parsedAmount === 0) continue;

    const isExpense = parsedAmount < 0;
    const absAmount = Math.abs(parsedAmount);
    const kind = isExpense ? "EXPENSE" : "INCOME";

    // Parse date
    const dateFormatted = parseDate(rawDate);
    if (!dateFormatted) continue;

    const competenceMonth = dateFormatted.slice(0, 7);
    const suggestedCategory = explicitCat || autoCategorize(rawDesc, !isExpense);

    transactions.push({
      id: `tx-csv-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 6)}`,
      date: dateFormatted,
      competence_month: competenceMonth,
      description: rawDesc,
      amount: absAmount,
      kind,
      suggestedCategory,
    });
  }

  return transactions;
}

function splitCSVLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let insideQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      insideQuotes = !insideQuotes;
    } else if (char === delimiter && !insideQuotes) {
      result.push(current.trim().replace(/^["']|["']$/g, ""));
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current.trim().replace(/^["']|["']$/g, ""));
  return result;
}

function parseAmount(val: string): number {
  let clean = val.replace(/[R$\s]/g, "").trim();

  // If format is Brazilian (e.g. 1.250,50)
  if (clean.includes(",") && clean.includes(".")) {
    if (clean.lastIndexOf(",") > clean.lastIndexOf(".")) {
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      clean = clean.replace(/,/g, "");
    }
  } else if (clean.includes(",")) {
    clean = clean.replace(",", ".");
  }

  return parseFloat(clean);
}

function parseDate(val: string): string | null {
  const clean = val.replace(/["']/g, "").trim();

  // Format: YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) {
    return clean;
  }

  // Format: DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = clean.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, "0");
    const month = dmyMatch[2].padStart(2, "0");
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // Fallback try Date.parse
  const timestamp = Date.parse(clean);
  if (!isNaN(timestamp)) {
    return new Date(timestamp).toISOString().slice(0, 10);
  }

  return null;
}
