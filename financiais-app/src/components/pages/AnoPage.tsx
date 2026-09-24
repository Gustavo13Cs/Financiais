"use client";

import { useState, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";

const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

function getHeatIntensity(val: number, max: number): string {
  if (val === 0) return "bg-surface-container-lowest text-text-muted";
  const ratio = max > 0 ? val / max : 0;
  if (ratio > 0.85) return "bg-expense-rose/80 text-white font-bold";
  if (ratio > 0.65) return "bg-warning-amber/60 text-text-primary font-semibold";
  if (ratio > 0.4) return "bg-warning-amber/25 text-warning-amber font-semibold";
  return "bg-surface-container text-text-secondary";
}

export default function AnoPage() {
  const { transactions, categories, isLoading } = useFinance();
  const [selectedYear, setSelectedYear] = useState<string>("2026");

  // Determine available years from transactions or fallback to defaults
  const availableYears = useMemo(() => {
    const set = new Set<string>();
    transactions.forEach((t) => {
      const y = (t.competence_month || t.date || "").slice(0, 4);
      if (y && !isNaN(Number(y))) set.add(y);
    });
    set.add("2026");
    set.add("2025");
    return Array.from(set).sort().reverse();
  }, [transactions]);

  // Compute 12-month aggregations for selectedYear
  const monthlyData = useMemo(() => {
    return Array.from({ length: 12 }, (_, i) => {
      const monthPrefix = `${selectedYear}-${String(i + 1).padStart(2, "0")}`;
      const monthTxs = transactions.filter((t) => {
        const comp = t.competence_month || (t.date ? t.date.slice(0, 7) : "");
        return comp.startsWith(monthPrefix);
      });

      const income = monthTxs
        .filter((t) => t.kind === "INCOME")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      const expense = monthTxs
        .filter((t) => t.kind === "EXPENSE")
        .reduce((s, t) => s + Number(t.amount || 0), 0);

      return {
        month: months[i],
        income,
        expense,
        saved: income - expense,
      };
    });
  }, [transactions, selectedYear]);

  // Aggregate category expenses for heatmap
  const categoriesData = useMemo(() => {
    const categoryMap = new Map<string, { name: string; values: number[]; total: number }>();

    // Seed with existing expense categories
    categories
      .filter((c) => c.kind === "EXPENSE")
      .forEach((c) => {
        categoryMap.set(c.name, {
          name: c.name,
          values: new Array(12).fill(0),
          total: 0,
        });
      });

    // Accumulate actual expense transactions in selectedYear
    transactions
      .filter((t) => {
        const year = (t.competence_month || t.date || "").slice(0, 4);
        return t.kind === "EXPENSE" && year === selectedYear;
      })
      .forEach((t) => {
        const catName =
          t.category_name ||
          categories.find((c) => c.id === t.category_id)?.name ||
          "Outros";

        if (!categoryMap.has(catName)) {
          categoryMap.set(catName, {
            name: catName,
            values: new Array(12).fill(0),
            total: 0,
          });
        }

        const dateStr = t.competence_month || t.date || "";
        const parts = dateStr.split("-");
        const monthIdx = parts.length >= 2 ? parseInt(parts[1], 10) - 1 : -1;

        if (monthIdx >= 0 && monthIdx < 12) {
          const item = categoryMap.get(catName)!;
          const amt = Number(t.amount || 0);
          item.values[monthIdx] += amt;
          item.total += amt;
        }
      });

    // Filter categories: keep all registered expense categories or those with expenses
    return Array.from(categoryMap.values()).sort((a, b) => b.total - a.total);
  }, [transactions, categories, selectedYear]);

  const maxByCategory = useMemo(() => {
    return categoriesData.map((c) => Math.max(...c.values, 0));
  }, [categoriesData]);

  const maxBar = useMemo(() => {
    const maxVal = Math.max(
      ...monthlyData.map((m) => Math.max(m.income, m.expense)),
      0
    );
    return maxVal > 0 ? maxVal : 1;
  }, [monthlyData]);

  const totalIncome = monthlyData.reduce((s, m) => s + m.income, 0);
  const totalExpense = monthlyData.reduce((s, m) => s + m.expense, 0);
  const totalSaved = totalIncome - totalExpense;

  const activeMonths = monthlyData.filter((m) => m.expense > 0 || m.income > 0).length;
  const avgMonthly = activeMonths > 0 ? totalExpense / activeMonths : totalExpense / 12;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const hasAnyData = totalIncome > 0 || totalExpense > 0;

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-label-sm text-text-secondary uppercase tracking-wider mb-space-2xs">
            <span className="px-space-xs py-space-2xs bg-goal-sky/15 text-goal-sky rounded text-label-sm uppercase tracking-wider font-semibold">
              Visão Anual
            </span>
            <span className="text-text-muted">•</span>
            <span>{selectedYear}</span>
          </div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">
            Performance Anual {selectedYear}
          </h1>
          <p className="text-body-md text-text-secondary mt-space-2xs">
            Heatmap por categoria e comparativo mensal de fluxo de caixa em tempo real.
          </p>
        </div>
        <select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
          className="bg-surface-card border border-[rgba(255,255,255,0.06)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-goal-sky/30 cursor-pointer self-start md:self-auto"
        >
          {availableYears.map((yr) => (
            <option key={yr} value={yr}>
              {yr}
            </option>
          ))}
        </select>
      </div>

      {/* Annual KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-space-md">
        {[
          {
            label: "Total Ganho",
            value: fmt(totalIncome),
            color: "text-income-emerald",
            icon: "arrow_downward_alt",
            bg: "bg-income-emerald/10",
          },
          {
            label: "Total Gasto",
            value: fmt(totalExpense),
            color: "text-expense-rose",
            icon: "arrow_upward_alt",
            bg: "bg-expense-rose/10",
          },
          {
            label: "Total Economizado",
            value: fmt(totalSaved),
            color: totalSaved >= 0 ? "text-goal-sky" : "text-expense-rose",
            icon: "savings",
            bg: "bg-goal-sky/10",
          },
          {
            label: "Média Mensal",
            value: fmt(avgMonthly),
            color: "text-warning-amber",
            icon: "show_chart",
            bg: "bg-warning-amber/10",
          },
        ].map((kpi) => (
          <div
            key={kpi.label}
            className="rounded-2xl bg-surface-card p-space-md shadow-card border border-[rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center justify-between mb-space-sm">
              <span className="text-label-md text-text-secondary uppercase tracking-wider">
                {kpi.label}
              </span>
              <span className={`w-8 h-8 flex items-center justify-center rounded-xl ${kpi.bg}`}>
                <span className={`material-symbols-outlined text-base ${kpi.color}`}>
                  {kpi.icon}
                </span>
              </span>
            </div>
            <div className={`text-kpi-value font-bold tabular-nums ${kpi.color}`}>{kpi.value}</div>
          </div>
        ))}
      </div>

      {/* Monthly Bar + Chart */}
      <div className="rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
          <div>
            <h2 className="text-headline-sm font-semibold text-text-primary">
              Fluxo Mensal {selectedYear}
            </h2>
            <p className="text-body-md text-text-secondary">Entradas vs Saídas por mês</p>
          </div>
          <div className="flex items-center gap-space-md text-label-sm">
            <div className="flex items-center gap-space-2xs">
              <span className="w-3 h-3 rounded bg-income-emerald" />
              <span className="text-text-secondary">Receitas</span>
            </div>
            <div className="flex items-center gap-space-2xs">
              <span className="w-3 h-3 rounded bg-expense-rose" />
              <span className="text-text-secondary">Despesas</span>
            </div>
          </div>
        </div>

        {!hasAnyData ? (
          <div className="h-48 flex flex-col items-center justify-center text-text-muted text-body-md border border-dashed border-[rgba(255,255,255,0.06)] rounded-xl my-2">
            <span className="material-symbols-outlined text-3xl mb-1 text-text-secondary opacity-60">
              bar_chart
            </span>
            <span>Nenhum lançamento registrado no ano de {selectedYear}.</span>
          </div>
        ) : (
          <div className="grid grid-cols-12 gap-1 sm:gap-2 h-52 items-end pt-4">
            {monthlyData.map((m, i) => {
              const incH = maxBar > 0 ? (m.income / maxBar) * 100 : 0;
              const expH = maxBar > 0 ? (m.expense / maxBar) * 100 : 0;
              const isEmpty = m.income === 0 && m.expense === 0;

              return (
                <div
                  key={i}
                  className={`flex flex-col items-center h-full justify-end group cursor-default relative ${
                    isEmpty ? "opacity-35" : ""
                  }`}
                  title={`${m.month}/${selectedYear} - Receita: ${fmt(m.income)} | Despesa: ${fmt(m.expense)}`}
                >
                  {/* Tooltip on hover */}
                  <div className="absolute -top-12 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity bg-surface-container-highest border border-[rgba(255,255,255,0.1)] rounded-lg px-2 py-1 text-[10px] whitespace-nowrap shadow-modal">
                    <p className="text-income-emerald font-semibold">+{fmt(m.income)}</p>
                    <p className="text-expense-rose font-semibold">-{fmt(m.expense)}</p>
                  </div>

                  <div className="w-full flex items-end justify-center gap-0.5 sm:gap-1 h-40">
                    <div
                      className="flex-1 rounded-t bg-gradient-to-t from-income-emerald/80 to-income-emerald group-hover:brightness-125 transition-all min-h-[2px]"
                      style={{ height: `${incH}%` }}
                    />
                    <div
                      className="flex-1 rounded-t bg-gradient-to-t from-expense-rose/80 to-expense-rose group-hover:brightness-125 transition-all min-h-[2px]"
                      style={{ height: `${expH}%` }}
                    />
                  </div>
                  <span className="block text-[11px] font-semibold mt-2 text-text-secondary group-hover:text-text-primary transition-colors">
                    {months[i]}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Category Heatmap */}
      <div className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="p-space-lg pb-space-md">
          <h2 className="text-headline-sm font-semibold text-text-primary">
            Heatmap de Gastos por Categoria
          </h2>
          <p className="text-body-md text-text-secondary">
            Intensidade de cor baseada no volume de despesas de cada categoria ao longo dos meses.
          </p>
        </div>

        {categoriesData.length === 0 ? (
          <div className="py-12 text-center text-text-muted text-body-md">
            Nenhuma categoria de despesa cadastrada para {selectedYear}.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-label-sm">
              <thead>
                <tr className="bg-surface-container-lowest">
                  <th className="py-space-sm px-space-lg text-left text-text-secondary font-semibold uppercase tracking-wider min-w-[140px]">
                    Categoria
                  </th>
                  {months.map((m) => (
                    <th
                      key={m}
                      className="py-space-sm px-space-xs text-center text-text-secondary font-semibold min-w-[55px]"
                    >
                      {m}
                    </th>
                  ))}
                  <th className="py-space-sm px-space-md text-center text-text-secondary font-semibold min-w-[80px]">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {categoriesData.map((cat, ci) => {
                  return (
                    <tr
                      key={cat.name}
                      className={ci % 2 === 0 ? "bg-surface-card" : "bg-surface-table-row-alt"}
                    >
                      <td className="py-space-sm px-space-lg font-semibold text-text-primary whitespace-nowrap">
                        {cat.name}
                      </td>
                      {cat.values.map((v, mi) => (
                        <td key={mi} className="py-space-xs px-space-xs text-center">
                          <span
                            className={`inline-block px-space-xs py-space-2xs rounded-lg text-[11px] tabular-nums ${getHeatIntensity(
                              v,
                              maxByCategory[ci]
                            )}`}
                          >
                            {v > 0
                              ? v.toLocaleString("pt-BR", {
                                  minimumFractionDigits: 0,
                                  maximumFractionDigits: 0,
                                })
                              : "—"}
                          </span>
                        </td>
                      ))}
                      <td className="py-space-xs px-space-md text-center font-bold text-text-primary tabular-nums">
                        {cat.total > 0
                          ? cat.total.toLocaleString("pt-BR", {
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            })
                          : "0"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Heatmap Legend */}
        <div className="px-space-lg py-space-sm flex flex-wrap items-center gap-space-sm border-t border-[rgba(255,255,255,0.05)]">
          <span className="text-label-sm text-text-muted">Intensidade:</span>
          {[
            { bg: "bg-surface-container", label: "Baixo" },
            { bg: "bg-warning-amber/25", label: "Médio" },
            { bg: "bg-warning-amber/60", label: "Alto" },
            { bg: "bg-expense-rose/80", label: "Crítico" },
          ].map((l) => (
            <div key={l.label} className="flex items-center gap-space-2xs">
              <span className={`w-4 h-4 rounded ${l.bg}`} />
              <span className="text-label-sm text-text-muted">{l.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
