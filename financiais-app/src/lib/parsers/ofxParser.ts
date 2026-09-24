export interface ParsedTransaction {
  id: string;
  fitid?: string;
  date: string; // YYYY-MM-DD
  competence_month: string; // YYYY-MM
  description: string;
  amount: number;
  kind: "INCOME" | "EXPENSE";
  suggestedCategory: string;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  Alimentação: [
    "mercado", "supermercado", "carrefour", "pao de acucar", "extra", "atacadao",
    "assai", "ifood", "rappi", "mcdonald", "burger", "restaurante", "padaria",
    "hortifruti", "acougue", "lanchonete", "subway", "bobs", "pizza", "churrascaria"
  ],
  Transporte: [
    "uber", "99app", "99pop", "posto", "combustivel", "gasolina", "etanol",
    "shell", "ipiranga", "br distribuidora", "estapar", "pedagio", "sem parar",
    "veloe", "estacionamento", "auto posto", "corrida"
  ],
  Moradia: [
    "aluguel", "condominio", "imobiliaria", "quintoandar", "loft", "iptu", "taxa condominial"
  ],
  Utilidades: [
    "enel", "cpfl", "sabesp", "copasa", "claro", "vivo", "tim", "oi",
    "internet", "luz", "agua", "gas", "energia", "comgas"
  ],
  Saúde: [
    "farmacia", "drogaria", "drogasil", "droga raia", "pague menos", "hospital",
    "laboratorio", "clinica", "consulta", "medico", "dentista", "smart fit",
    "academia", "bluefit", "gympass", "totalpass", "unimed", "bradesco saude"
  ],
  Assinaturas: [
    "netflix", "spotify", "amazon prime", "disney", "hbo", "max", "youtube",
    "apple.com", "google storage", "deezer", "globo play", "paramount"
  ],
  Educação: [
    "udemy", "alura", "faculdade", "escola", "colegio", "curso", "livraria",
    "hotmart", "eduzz", "idiomas", "ingles"
  ],
  Lazer: [
    "steam", "playstation", "sony", "xbox", "nintendo", "cinema", "ingresso",
    "sympla", "show", "teatro", "parque", "viagem", "hotel", "airbnb", "decolar", "gol", "latam", "azul"
  ],
  Salário: [
    "salario", "pro-labore", "remuneracao", "folha", "pagto salario", "adicional"
  ],
  Rendimentos: [
    "rendimento", "dividendos", "juros", "cdb", "selic", "tesouro", "fundo", "investimento", "b3"
  ],
};

export function autoCategorize(description: string, isIncome: boolean): string {
  const lower = description.toLowerCase();

  if (isIncome) {
    if (lower.includes("salario") || lower.includes("folha") || lower.includes("pro-labore")) {
      return "Salário";
    }
    if (lower.includes("rendimento") || lower.includes("dividendo") || lower.includes("juros")) {
      return "Rendimentos";
    }
    if (lower.includes("freela") || lower.includes("servico") || lower.includes("honorario")) {
      return "Freelance";
    }
    return "Outros";
  }

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        return category;
      }
    }
  }

  return "Outros";
}

/**
 * Parses an OFX (Open Financial Exchange) string into normalized transactions.
 */
export function parseOFX(ofxContent: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Match all <STMTTRN>...</STMTTRN> blocks (handles SGML without closing tags too)
  const stmtTrnRegex = /<STMTTRN>([\s\S]*?)(?:<\/STMTTRN>|(?=<STMTTRN>)|$)/gi;
  let match: RegExpExecArray | null;

  while ((match = stmtTrnRegex.exec(ofxContent)) !== null) {
    const block = match[1];

    const getTagValue = (tagName: string): string => {
      const tagRegex = new RegExp(`<${tagName}>([^<\\r\\n]+)`, "i");
      const tagMatch = block.match(tagRegex);
      return tagMatch ? tagMatch[1].trim() : "";
    };

    const trnType = getTagValue("TRNTYPE");
    const dtPostedRaw = getTagValue("DTPOSTED");
    const trnAmtRaw = getTagValue("TRNAMT");
    const fitid = getTagValue("FITID");
    const memo = getTagValue("MEMO") || getTagValue("NAME") || getTagValue("CHECKNUM") || "Transação Bancária";

    if (!trnAmtRaw || !dtPostedRaw) continue;

    // Parse amount
    const rawVal = parseFloat(trnAmtRaw.replace(",", "."));
    if (isNaN(rawVal)) continue;

    const isExpense = rawVal < 0 || trnType.toUpperCase() === "DEBIT";
    const amount = Math.abs(rawVal);
    const kind = isExpense ? "EXPENSE" : "INCOME";

    // Parse date (OFX dates are typically YYYYMMDDHHMMSS...)
    let dateStr = "";
    if (dtPostedRaw.length >= 8) {
      const year = dtPostedRaw.substring(0, 4);
      const month = dtPostedRaw.substring(4, 6);
      const day = dtPostedRaw.substring(6, 8);
      dateStr = `${year}-${month}-${day}`;
    } else {
      dateStr = new Date().toISOString().slice(0, 10);
    }

    const competenceMonth = dateStr.slice(0, 7);
    const suggestedCategory = autoCategorize(memo, !isExpense);

    transactions.push({
      id: fitid || `tx-ofx-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      fitid,
      date: dateStr,
      competence_month: competenceMonth,
      description: memo,
      amount,
      kind,
      suggestedCategory,
    });
  }

  return transactions;
}
