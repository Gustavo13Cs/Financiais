"use client";

import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { usePeriod } from "@/contexts/PeriodContext";
import NewTransactionModal from "@/components/NewTransactionModal";

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

export default function MesPage() {
  const { transactions, deleteTransaction, editTransaction, isLoading } = useFinance();
  const { selectedMonth, monthLabel, isCurrentMonth, viewMode } = usePeriod();

  const [activeWeek, setActiveWeek] = useState("all");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const getWeekNumber = (dateStr: string): string => {
    let day = 1;
    if (dateStr.includes("-")) {
      const parts = dateStr.split("-");
      day = parseInt(parts[2], 10) || 1;
    } else if (dateStr.includes("/")) {
      const parts = dateStr.split("/");
      day = parseInt(parts[0], 10) || 1;
    }
    if (day <= 7) return "1";
    if (day <= 14) return "2";
    if (day <= 21) return "3";
    return "4";
  };

  // Derive month info from selectedMonth
  const [selYear, selMonthNum] = selectedMonth.split("-").map(Number);

  // Week ranges for the selected month
  const lastDay = new Date(selYear, selMonthNum, 0).getDate();
  const weekRanges = [
    { label: "Semana 1", value: "1", range: `01–07/${String(selMonthNum).padStart(2, "0")}` },
    { label: "Semana 2", value: "2", range: `08–14/${String(selMonthNum).padStart(2, "0")}` },
    { label: "Semana 3", value: "3", range: `15–21/${String(selMonthNum).padStart(2, "0")}` },
    { label: "Semana 4", value: "4", range: `22–${lastDay}/${String(selMonthNum).padStart(2, "0")}` },
  ];

  // Filter transactions by selectedMonth and search
  const monthTransactions = useMemo(() => {
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const matchMonth = (t.competence_month || t.date?.slice(0, 7)) === selectedMonth;
      const matchSearch =
        !search ||
        t.description.toLowerCase().includes(q) ||
        (t.category_name || "").toLowerCase().includes(q);
      return matchMonth && matchSearch;
    });
  }, [transactions, selectedMonth, search]);

  const weekSubtotals = useMemo(() => ({
    "1": monthTransactions.filter((t) => getWeekNumber(t.date) === "1" && t.kind === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    "2": monthTransactions.filter((t) => getWeekNumber(t.date) === "2" && t.kind === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    "3": monthTransactions.filter((t) => getWeekNumber(t.date) === "3" && t.kind === "EXPENSE").reduce((s, t) => s + t.amount, 0),
    "4": monthTransactions.filter((t) => getWeekNumber(t.date) === "4" && t.kind === "EXPENSE").reduce((s, t) => s + t.amount, 0),
  }), [monthTransactions]);

  const weeks = [
    { label: "Mês inteiro", value: "all" },
    ...weekRanges.map((w) => ({
      ...w,
      subtotal: fmt(weekSubtotals[w.value as "1" | "2" | "3" | "4"]),
    })),
  ];

  // If viewMode is "semanal", default to current week when first rendered
  const effectiveWeek = useMemo(() => {
    if (viewMode === "semanal" && activeWeek === "all") {
      // Auto-select current week
      const today = new Date();
      const day = today.getDate();
      if (day <= 7) return "1";
      if (day <= 14) return "2";
      if (day <= 21) return "3";
      return "4";
    }
    return activeWeek;
  }, [viewMode, activeWeek]);

  const filtered =
    effectiveWeek === "all"
      ? monthTransactions
      : monthTransactions.filter((t) => getWeekNumber(t.date) === effectiveWeek);

  const totalIn = filtered.filter((t) => t.kind === "INCOME").reduce((s, t) => s + t.amount, 0);
  const totalOut = filtered.filter((t) => t.kind === "EXPENSE").reduce((s, t) => s + t.amount, 0);
  const balance = totalIn - totalOut;

  const formatDate = (d: string) => {
    if (!d) return "—";
    if (d.includes("/")) return d.slice(0, 5);
    const parts = d.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}`;
    return d;
  };

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-space-md pt-space-xs">
        <div className="flex flex-wrap items-center gap-space-sm">
          <div className="flex items-center gap-space-xs bg-surface-card px-space-md py-space-xs rounded-2xl shadow-sm border border-[rgba(255,255,255,0.05)]">
            <span className="material-symbols-outlined text-goal-sky text-base">calendar_month</span>
            <span className="text-headline-sm font-semibold text-text-primary tracking-tight">{monthLabel}</span>
            {isCurrentMonth && (
              <span className="inline-flex items-center gap-1 ml-space-xs px-2 py-0.5 rounded-full text-label-sm bg-income-emerald/10 text-income-emerald">
                <span className="w-1.5 h-1.5 rounded-full bg-income-emerald animate-pulse" /> Mês Vigente
              </span>
            )}
          </div>
          {viewMode === "semanal" && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-label-sm bg-goal-sky/10 text-goal-sky">
              <span className="material-symbols-outlined text-xs">view_week</span>
              Visão Semanal
            </span>
          )}
        </div>
        <div className="flex items-center flex-wrap gap-space-xs sm:gap-space-sm">
          <div className="relative flex-1 sm:w-64">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg pointer-events-none">search</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-surface-card text-text-primary pl-9 pr-space-sm py-space-xs rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/30 placeholder:text-text-muted shadow-sm border border-[rgba(255,255,255,0.05)]"
              placeholder="Filtrar por nome, tag..."
              type="text"
            />
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white px-space-md py-space-xs rounded-xl text-headline-sm font-semibold transition-all shadow-glow active:scale-95"
            type="button"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Adicionar linha</span>
          </button>
        </div>
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-space-md">
        <div className="bg-surface-card rounded-2xl p-space-md shadow-sm border border-[rgba(255,255,255,0.05)]">
          <span className="text-label-md text-text-secondary uppercase tracking-wider">Entradas Totais</span>
          <div className="text-display-currency font-extrabold text-income-emerald tracking-tight tabular-nums mt-space-xs">{fmt(totalIn)}</div>
        </div>
        <div className="bg-surface-card rounded-2xl p-space-md shadow-sm border border-[rgba(255,255,255,0.05)]">
          <span className="text-label-md text-text-secondary uppercase tracking-wider">Saídas Totais</span>
          <div className="text-display-currency font-extrabold text-expense-rose tracking-tight tabular-nums mt-space-xs">{fmt(totalOut)}</div>
        </div>
        <div className="bg-surface-card rounded-2xl p-space-md shadow-sm border border-[rgba(255,255,255,0.05)] relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-goal-sky/10 blur-xl" />
          <span className="text-label-md text-text-secondary uppercase tracking-wider">Saldo do Mês</span>
          <div className={`text-display-currency font-extrabold tracking-tight tabular-nums mt-space-xs ${balance >= 0 ? "text-income-emerald" : "text-expense-rose"}`}>{fmt(balance)}</div>
          <span className={`text-label-sm px-space-xs py-space-2xs rounded-full mt-space-xs inline-block ${
            balance >= 0 ? "text-goal-sky bg-goal-sky/10" : "text-expense-rose bg-expense-rose/10"
          }`}>
            {balance >= 0
              ? (totalIn > 0 ? `Economia: ${Math.round((balance / totalIn) * 100)}%` : "Saldo estável")
              : "Déficit no período"}
          </span>
        </div>
      </div>

      {/* Week Tabs */}
      <div className="flex items-center gap-space-xs flex-wrap">
        {weeks.map((w) => (
          <button
            key={w.value}
            onClick={() => setActiveWeek(w.value)}
            className={`px-space-md py-space-xs rounded-full text-label-sm font-semibold transition-all ${
              effectiveWeek === w.value
                ? "bg-income-emerald text-white shadow-glow"
                : "bg-surface-card text-text-secondary hover:bg-surface-card-elevated border border-[rgba(255,255,255,0.06)]"
            }`}
            type="button"
          >
            {w.label}
            {"subtotal" in w && w.subtotal && <span className="ml-space-xs opacity-70">({w.subtotal})</span>}
          </button>
        ))}
      </div>

      {/* Spreadsheet Table */}
      <div className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-lowest text-text-secondary uppercase text-label-sm tracking-wider">
                <th className="py-space-sm px-space-lg font-semibold w-24">Data</th>
                <th className="py-space-sm px-space-md font-semibold">Descrição</th>
                <th className="py-space-sm px-space-md font-semibold">Categoria</th>
                <th className="py-space-sm px-space-md font-semibold">Tipo</th>
                <th className="py-space-sm px-space-md font-semibold text-right">Valor</th>
                <th className="py-space-sm px-space-md font-semibold text-center">Status</th>
                <th className="py-space-sm px-space-lg font-semibold text-right w-20">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">Carregando dados do mês...</td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-text-muted">
                    Nenhum lançamento registrado para {monthLabel}{effectiveWeek !== "all" ? `, Semana ${effectiveWeek}` : ""}.
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => {
                  const isExtra = t.nature === "EXTRA";
                  const isExpense = t.kind === "EXPENSE";
                  return (
                    <tr
                      key={t.id}
                      className={`h-11 transition-colors group cursor-pointer ${
                        i % 2 === 0 ? "bg-surface-card" : "bg-surface-table-row-alt"
                      } hover:bg-surface-card-elevated/70 ${isExtra ? "extra-row-indicator" : ""}`}
                    >
                      <td className="py-space-sm px-space-lg text-text-secondary whitespace-nowrap text-table-data">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-space-sm px-space-md text-text-primary font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-space-xs">
                          {t.nature === "FIXED" && (
                            <span className="material-symbols-outlined text-xs text-text-muted" title="Recorrente">autorenew</span>
                          )}
                          <span
                            className="editable-cell"
                            contentEditable={editingId === t.id}
                            onDoubleClick={() => setEditingId(t.id)}
                            onBlur={(e) => {
                              setEditingId(null);
                              const newText = e.currentTarget.textContent?.trim();
                              if (newText && newText !== t.description) {
                                editTransaction(t.id, { description: newText });
                              }
                            }}
                            suppressContentEditableWarning
                          >
                            {t.description}
                          </span>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-md whitespace-nowrap">
                        <span className={`inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-lg text-label-sm font-semibold ${
                          isExtra ? "bg-extra-violet/15 text-extra-violet" :
                          isExpense ? "bg-expense-rose/10 text-expense-rose" :
                          "bg-income-emerald/10 text-income-emerald"
                        }`}>
                          {t.category_name || "Geral"}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-md whitespace-nowrap">
                        <span className={`text-label-sm font-semibold px-space-xs py-space-2xs rounded-lg ${
                          !isExpense ? (isExtra ? "text-extra-violet bg-extra-violet/10" : "text-income-emerald bg-income-emerald/10") :
                          "text-expense-rose bg-expense-rose/10"
                        }`}>
                          {isExtra ? "Entrada Extra" : isExpense ? "Gasto" : t.nature === "FIXED" ? "Entrada Fixa" : "Entrada"}
                        </span>
                      </td>
                      <td className={`py-space-sm px-space-md text-table-data-currency font-bold text-right whitespace-nowrap tabular-nums ${
                        !isExpense ? (isExtra ? "text-extra-violet" : "text-income-emerald") : "text-expense-rose"
                      }`}>
                        {!isExpense ? "+" : "-"}{fmt(t.amount)}
                      </td>
                      <td className="py-space-sm px-space-md text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-space-2xs text-label-sm ${
                          t.status === "PENDING" ? "text-warning-amber" : "text-income-emerald"
                        }`}>
                          <span className="material-symbols-outlined text-xs">{t.status === "PENDING" ? "schedule" : "check_circle"}</span>
                          {t.status === "PENDING" ? "Pendente" : "Pago / Recebido"}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-lg text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-space-2xs opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteTransaction(t.id)}
                            aria-label="Excluir"
                            className="text-text-muted hover:text-expense-rose p-space-2xs rounded-lg hover:bg-expense-rose/10 transition-colors"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-base leading-none">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
              {/* Add row button */}
              <tr
                onClick={() => setIsModalOpen(true)}
                className="h-11 bg-surface-container-lowest border-t border-[rgba(255,255,255,0.05)] hover:bg-surface-container transition-colors cursor-pointer group"
              >
                <td colSpan={7} className="py-space-sm px-space-lg">
                  <div className="flex items-center gap-space-xs text-text-muted group-hover:text-text-secondary transition-colors">
                    <span className="material-symbols-outlined text-base">add</span>
                    <span className="text-label-md">+ Adicionar lançamento</span>
                  </div>
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr className="bg-surface-container-lowest border-t border-[rgba(255,255,255,0.08)]">
                <td colSpan={4} className="py-space-sm px-space-lg text-label-sm text-text-muted font-semibold">
                  {filtered.length} lançamentos no período
                </td>
                <td className="py-space-sm px-space-md text-right text-table-data-currency font-bold tabular-nums">
                  <span className={balance >= 0 ? "text-income-emerald" : "text-expense-rose"}>{fmt(balance)}</span>
                </td>
                <td colSpan={2} />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
