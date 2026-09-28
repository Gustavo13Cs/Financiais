"use client";

import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Transaction } from "@/types/finance";
import NewTransactionModal from "@/components/NewTransactionModal";

const WEEKDAYS = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const MONTHS = [
  "Janeiro","Fevereiro","Março","Abril","Maio","Junho",
  "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro",
];

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function getFirstWeekday(year: number, month: number) {
  return new Date(year, month - 1, 1).getDay();
}

export default function CalendarioPage() {
  const { transactions: allTransactions, isLoading } = useFinance();
  const { selectedMonth, prevMonth, nextMonth } = usePeriod();
  const [selectedDay, setSelectedDay] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [year, monthNum] = selectedMonth.split("-").map(Number);
  const daysInMonth = getDaysInMonth(year, monthNum);
  const firstWeekday = getFirstWeekday(year, monthNum);
  const todayStr = new Date().toISOString().slice(0, 10);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Group transactions by day
  const txByDay = useMemo(() => {
    const map: Record<number, Transaction[]> = {};
    allTransactions.forEach((t) => {
      const txMonth = t.competence_month || t.date?.slice(0, 7);
      if (txMonth !== selectedMonth) return;
      const day = parseInt(t.date?.slice(8, 10) || "1", 10);
      if (!map[day]) map[day] = [];
      map[day].push(t);
    });
    return map;
  }, [allTransactions, selectedMonth]);

  // Day summary
  const daySummary = useMemo(() => {
    const map: Record<number, { income: number; expense: number; extra: number; count: number }> = {};
    Object.entries(txByDay).forEach(([dayStr, txs]) => {
      const day = parseInt(dayStr, 10);
      let income = 0, expense = 0, extra = 0;
      txs.forEach((t) => {
        if (t.nature === "EXTRA") extra += t.amount;
        else if (t.kind === "INCOME") income += t.amount;
        else expense += t.amount;
      });
      map[day] = { income, expense, extra, count: txs.length };
    });
    return map;
  }, [txByDay]);

  // Monthly totals
  const monthTotals = useMemo(() => {
    let income = 0, expense = 0, extra = 0;
    Object.values(txByDay).flat().forEach((t) => {
      if (t.nature === "EXTRA") extra += t.amount;
      else if (t.kind === "INCOME") income += t.amount;
      else expense += t.amount;
    });
    return { income, expense, extra, balance: income + extra - expense };
  }, [txByDay]);

  const selectedTxs = selectedDay ? (txByDay[selectedDay] || []) : [];

  // Build calendar grid
  const cells: (number | null)[] = [
    ...Array(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  const totalCells = Math.ceil(cells.length / 7) * 7;
  while (cells.length < totalCells) cells.push(null);

  const dateStr = (day: number) =>
    `${year}-${String(monthNum).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs">
            <span className="text-primary text-label-sm uppercase tracking-wider font-semibold">Visualização</span>
            <span className="text-text-muted text-label-sm">•</span>
            <span className="text-text-secondary text-label-sm">Calendário Financeiro</span>
          </div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">
            Calendário Financeiro
          </h1>
          <p className="text-body-md text-text-secondary">
            Visualize seus lançamentos organizados por dia do mês.
          </p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white px-space-md py-space-xs rounded-xl text-headline-sm font-semibold transition-all shadow-glow active:scale-95 cursor-pointer self-start"
          type="button"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Novo Lançamento
        </button>
      </div>

      {/* Month Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
        {[
          { label: "Entradas", value: monthTotals.income, color: "text-income-emerald", bg: "bg-income-emerald/10", icon: "arrow_downward_alt" },
          { label: "Extras", value: monthTotals.extra, color: "text-extra-violet", bg: "bg-extra-violet/10", icon: "bolt" },
          { label: "Gastos", value: monthTotals.expense, color: "text-expense-rose", bg: "bg-expense-rose/10", icon: "arrow_upward_alt" },
          {
            label: "Saldo",
            value: monthTotals.balance,
            color: monthTotals.balance >= 0 ? "text-income-emerald" : "text-expense-rose",
            bg: monthTotals.balance >= 0 ? "bg-income-emerald/10" : "bg-expense-rose/10",
            icon: "account_balance_wallet",
          },
        ].map((card) => (
          <div key={card.label} className="rounded-2xl bg-surface-card p-space-md shadow-card border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center gap-space-xs mb-space-xs">
              <span className={`material-symbols-outlined text-base ${card.color}`}>{card.icon}</span>
              <span className="text-label-sm text-text-muted">{card.label}</span>
            </div>
            <span className={`text-headline-sm font-bold tabular-nums ${card.color}`}>
              {fmt(card.value)}
            </span>
          </div>
        ))}
      </div>

      {/* Calendar + Detail Panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-space-lg">

        {/* Calendar Grid */}
        <div className="xl:col-span-2 rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">

          {/* Month Navigation */}
          <div className="flex items-center justify-between px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)]">
            <button
              onClick={prevMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-container text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_left</span>
            </button>
            <h2 className="text-headline-sm font-bold text-text-primary">
              {MONTHS[monthNum - 1]} {year}
            </h2>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-container text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">chevron_right</span>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 border-b border-[rgba(255,255,255,0.04)]">
            {WEEKDAYS.map((d) => (
              <div key={d} className="py-space-sm text-center text-label-xs font-semibold text-text-muted uppercase tracking-wider">
                {d}
              </div>
            ))}
          </div>

          {/* Days */}
          {isLoading ? (
            <div className="flex items-center justify-center h-64 text-text-muted text-body-md">
              Carregando...
            </div>
          ) : (
            <div className="grid grid-cols-7">
              {cells.map((day, idx) => {
                if (day === null) {
                  return <div key={`empty-${idx}`} className="min-h-[80px] border-b border-r border-[rgba(255,255,255,0.03)]" />;
                }
                const summary = daySummary[day];
                const isToday = dateStr(day) === todayStr;
                const isSelected = selectedDay === day;
                const net = summary ? (summary.income + summary.extra - summary.expense) : 0;

                return (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[80px] p-1.5 flex flex-col gap-0.5 border-b border-r border-[rgba(255,255,255,0.03)] transition-all cursor-pointer relative text-left
                      ${isSelected ? "bg-primary/10 ring-1 ring-inset ring-primary/40" : "hover:bg-surface-container-lowest/80"}
                    `}
                  >
                    {/* Day number */}
                    <span className={`text-label-sm font-bold self-start w-6 h-6 flex items-center justify-center rounded-full transition-colors leading-none
                      ${isToday ? "bg-primary text-on-primary" : isSelected ? "text-primary" : "text-text-secondary"}
                    `}>
                      {day}
                    </span>

                    {/* Transaction indicators */}
                    {summary && (
                      <div className="flex flex-col gap-px mt-auto w-full">
                        {summary.income > 0 && (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-income-emerald shrink-0" />
                            <span className="text-[9px] text-income-emerald font-bold tabular-nums truncate leading-none">
                              +{fmt(summary.income).replace(/R\$\s?/, "")}
                            </span>
                          </div>
                        )}
                        {summary.extra > 0 && (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-extra-violet shrink-0" />
                            <span className="text-[9px] text-extra-violet font-bold tabular-nums truncate leading-none">
                              +{fmt(summary.extra).replace(/R\$\s?/, "")}
                            </span>
                          </div>
                        )}
                        {summary.expense > 0 && (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-expense-rose shrink-0" />
                            <span className="text-[9px] text-expense-rose font-bold tabular-nums truncate leading-none">
                              -{fmt(summary.expense).replace(/R\$\s?/, "")}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Net dot */}
                    {summary && (
                      <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${net >= 0 ? "bg-income-emerald" : "bg-expense-rose"}`} />
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center gap-space-md px-space-lg py-space-sm border-t border-[rgba(255,255,255,0.04)] flex-wrap">
            {[
              { color: "bg-income-emerald", label: "Entradas" },
              { color: "bg-extra-violet", label: "Extras" },
              { color: "bg-expense-rose", label: "Gastos" },
            ].map((l) => (
              <div key={l.label} className="flex items-center gap-space-2xs">
                <span className={`w-2 h-2 rounded-full ${l.color}`} />
                <span className="text-label-xs text-text-muted">{l.label}</span>
              </div>
            ))}
            <div className="ml-auto text-label-xs text-text-muted">
              Clique num dia para ver detalhes
            </div>
          </div>
        </div>

        {/* Detail Panel */}
        <div className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] flex flex-col overflow-hidden min-h-[400px]">
          {selectedDay ? (
            <>
              <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
                <div>
                  <h3 className="text-headline-sm font-bold text-text-primary">
                    {String(selectedDay).padStart(2, "0")} de {MONTHS[monthNum - 1]}
                  </h3>
                  <span className="text-label-sm text-text-muted">
                    {selectedTxs.length} {selectedTxs.length === 1 ? "lançamento" : "lançamentos"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedDay(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-lowest hover:bg-surface-container text-text-muted hover:text-text-primary transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-base">close</span>
                </button>
              </div>

              {/* Day net */}
              {selectedTxs.length > 0 && (() => {
                const inc = selectedTxs.filter(t => t.kind === "INCOME").reduce((s, t) => s + t.amount, 0);
                const exp = selectedTxs.filter(t => t.kind !== "INCOME").reduce((s, t) => s + t.amount, 0);
                const net = inc - exp;
                return (
                  <div className={`mx-space-md mt-space-md rounded-xl px-space-md py-space-sm flex items-center justify-between ${net >= 0 ? "bg-income-emerald/10 border border-income-emerald/20" : "bg-expense-rose/10 border border-expense-rose/20"}`}>
                    <span className="text-label-sm text-text-secondary">Saldo do dia</span>
                    <span className={`text-headline-sm font-bold tabular-nums ${net >= 0 ? "text-income-emerald" : "text-expense-rose"}`}>
                      {net >= 0 ? "+" : ""}{fmt(net)}
                    </span>
                  </div>
                );
              })()}

              <div className="flex-1 overflow-y-auto px-space-md py-space-md space-y-space-xs">
                {selectedTxs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-40 gap-space-sm">
                    <span className="material-symbols-outlined text-4xl text-text-muted">event_busy</span>
                    <span className="text-body-md text-text-muted">Nenhum lançamento</span>
                  </div>
                ) : (
                  [...selectedTxs]
                    .sort((a, b) => (b.kind === "INCOME" ? 1 : -1) - (a.kind === "INCOME" ? 1 : -1))
                    .map((t) => {
                      const isExtra = t.nature === "EXTRA";
                      const isExpense = t.kind !== "INCOME";
                      return (
                        <div key={t.id} className="flex items-center gap-space-sm rounded-xl bg-surface-container-lowest px-space-md py-space-sm">
                          <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0
                            ${isExtra ? "bg-extra-violet/15" : isExpense ? "bg-expense-rose/10" : "bg-income-emerald/10"}
                          `}>
                            <span className={`material-symbols-outlined text-base
                              ${isExtra ? "text-extra-violet" : isExpense ? "text-expense-rose" : "text-income-emerald"}
                            `}>
                              {isExtra ? "bolt" : isExpense ? "arrow_upward_alt" : "arrow_downward_alt"}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-label-md font-semibold text-text-primary truncate">{t.description}</p>
                            <p className="text-label-xs text-text-muted">{t.category_name || "Geral"}</p>
                          </div>
                          <span className={`text-label-md font-bold tabular-nums shrink-0
                            ${isExtra ? "text-extra-violet" : isExpense ? "text-expense-rose" : "text-income-emerald"}
                          `}>
                            {isExpense ? "-" : "+"}{fmt(t.amount)}
                          </span>
                        </div>
                      );
                    })
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-space-md text-center p-space-lg">
              <div className="w-16 h-16 rounded-2xl bg-surface-container-lowest flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl text-text-muted">calendar_today</span>
              </div>
              <div>
                <p className="text-headline-sm font-semibold text-text-primary mb-1">Selecione um dia</p>
                <p className="text-body-md text-text-muted max-w-[200px]">
                  Clique em qualquer dia para ver os lançamentos
                </p>
              </div>

              {/* Quick access to days with transactions */}
              {Object.keys(daySummary).length > 0 && (
                <div className="w-full mt-space-sm space-y-space-xs">
                  <p className="text-label-xs text-text-muted text-left mb-space-xs">Dias com lançamentos</p>
                  {Object.entries(daySummary)
                    .sort(([a], [b]) => parseInt(a) - parseInt(b))
                    .slice(0, 5)
                    .map(([day, s]) => {
                      const net = s.income + s.extra - s.expense;
                      return (
                        <button
                          key={day}
                          type="button"
                          onClick={() => setSelectedDay(parseInt(day))}
                          className="w-full flex items-center justify-between px-space-md py-space-xs rounded-xl bg-surface-container-lowest hover:bg-surface-container transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-space-xs">
                            <span className="text-label-sm font-bold text-text-primary w-8">
                              Dia {day}
                            </span>
                            <span className="text-label-xs text-text-muted">{s.count} lanç.</span>
                          </div>
                          <span className={`text-label-sm font-bold tabular-nums ${net >= 0 ? "text-income-emerald" : "text-expense-rose"}`}>
                            {net >= 0 ? "+" : ""}{fmt(net)}
                          </span>
                        </button>
                      );
                    })}
                  {Object.keys(daySummary).length > 5 && (
                    <p className="text-label-xs text-text-muted text-center">
                      +{Object.keys(daySummary).length - 5} outros dias
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
}
