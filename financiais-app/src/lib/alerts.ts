import { Transaction, Category, Settings, FinanceAlert } from "@/types/finance";

const fmt = (v: number, currency: string = "BRL") =>
  v.toLocaleString("pt-BR", { style: "currency", currency });

const formatDate = (dateStr: string) => {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dateStr;
};

export interface AlertComputeParams {
  transactions: Transaction[];
  categories: Category[];
  settings: Settings;
  readAlertIds?: string[];
  referenceDate?: string; // YYYY-MM-DD, defaults to today
}

export function computeFinanceAlerts({
  transactions,
  categories,
  settings,
  readAlertIds = [],
  referenceDate,
}: AlertComputeParams): FinanceAlert[] {
  const alerts: FinanceAlert[] = [];
  const readSet = new Set(readAlertIds);

  const refDateStr = referenceDate || new Date().toISOString().slice(0, 10);
  const currentCompetence = refDateStr.slice(0, 7); // YYYY-MM
  const todayMs = new Date(refDateStr).setHours(0, 0, 0, 0);

  // 1. LIMITE DE CATEGORIA (TETO ORÇAMENTÁRIO)
  if (settings.alert_limit !== false) {
    const currentMonthExpenses = transactions.filter(
      (t) =>
        t.kind === "EXPENSE" &&
        (t.competence_month === currentCompetence || (!t.competence_month && t.date?.startsWith(currentCompetence)))
    );

    // Sum expenses by category
    const expenseByCat: Record<string, number> = {};
    for (const t of currentMonthExpenses) {
      const key = t.category_id || t.category_name || "Outros";
      expenseByCat[key] = (expenseByCat[key] || 0) + Number(t.amount);
    }

    for (const cat of categories) {
      if (!cat.monthly_limit || cat.monthly_limit <= 0) continue;

      const spent = (expenseByCat[cat.id] || 0) + (expenseByCat[cat.name] || 0);
      const ratio = spent / cat.monthly_limit;

      if (ratio >= 1.0) {
        const alertId = `limit-exceeded-${cat.id}-${currentCompetence}`;
        alerts.push({
          id: alertId,
          type: "BUDGET_EXCEEDED",
          title: `Teto Ultrapassado: ${cat.name}`,
          message: `Gastos de ${fmt(spent, settings.currency)} atingiram ${Math.round(ratio * 100)}% do limite de ${fmt(cat.monthly_limit, settings.currency)}.`,
          severity: "danger",
          amount: spent,
          categoryName: cat.name,
          read: readSet.has(alertId),
          link: "/categorias",
        });
      } else if (ratio >= 0.8) {
        const alertId = `limit-warning-${cat.id}-${currentCompetence}`;
        alerts.push({
          id: alertId,
          type: "BUDGET_WARNING",
          title: `Atenção ao Teto: ${cat.name}`,
          message: `Você já consumiu ${Math.round(ratio * 100)}% (${fmt(spent, settings.currency)}) do teto estipulado de ${fmt(cat.monthly_limit, settings.currency)}.`,
          severity: "warning",
          amount: spent,
          categoryName: cat.name,
          read: readSet.has(alertId),
          link: "/categorias",
        });
      }
    }
  }

  // 2. VENCIMENTOS PRÓXIMOS E CONTAS EM ATRASO
  if (settings.alert_due_date !== false) {
    const pendingExpenses = transactions.filter(
      (t) => t.status === "PENDING" && t.kind === "EXPENSE" && Boolean(t.date)
    );

    for (const t of pendingExpenses) {
      const dueDateMs = new Date(t.date).setHours(0, 0, 0, 0);
      const diffMs = dueDateMs - todayMs;
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

      if (diffDays < 0) {
        const alertId = `overdue-${t.id}`;
        const daysPast = Math.abs(diffDays);
        alerts.push({
          id: alertId,
          type: "OVERDUE",
          title: `Conta Atrasada: ${t.description}`,
          message: `Venceu em ${formatDate(t.date)} (${daysPast} ${daysPast === 1 ? "dia" : "dias"} atrás) no valor de ${fmt(t.amount, settings.currency)}.`,
          severity: "danger",
          date: t.date,
          amount: t.amount,
          categoryName: t.category_name,
          read: readSet.has(alertId),
          link: "/lancamentos",
        });
      } else if (diffDays <= 3) {
        const alertId = `due-soon-${t.id}`;
        const dueText =
          diffDays === 0
            ? "Vence hoje!"
            : diffDays === 1
            ? "Vence amanhã!"
            : `Vence em ${diffDays} dias`;

        alerts.push({
          id: alertId,
          type: "DUE_SOON",
          title: `${dueText}: ${t.description}`,
          message: `Programado para ${formatDate(t.date)} no valor de ${fmt(t.amount, settings.currency)}.`,
          severity: "warning",
          date: t.date,
          amount: t.amount,
          categoryName: t.category_name,
          read: readSet.has(alertId),
          link: "/lancamentos",
        });
      }
    }
  }

  // Sort: Danger first, then Warning, then by date/title
  return alerts.sort((a, b) => {
    const severityScore = { danger: 3, warning: 2, info: 1 };
    const scoreDiff = severityScore[b.severity] - severityScore[a.severity];
    if (scoreDiff !== 0) return scoreDiff;
    return a.title.localeCompare(b.title);
  });
}
