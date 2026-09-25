"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { usePeriod } from "@/contexts/PeriodContext";
import NewTransactionModal from "@/components/NewTransactionModal";

export default function DashboardPage() {
  const { transactions: allTransactions, categories, deleteTransaction, goals, isLoading } = useFinance();
  const { selectedMonth, monthLabel, isCurrentMonth } = usePeriod();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Filter all transactions to the selected month
  const transactions = useMemo(
    () => allTransactions.filter(
      (t) => (t.competence_month || t.date?.slice(0, 7)) === selectedMonth
    ),
    [allTransactions, selectedMonth]
  );

  const totalIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.kind === "INCOME")
        .reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const extraIncome = useMemo(
    () =>
      transactions
        .filter((t) => t.nature === "EXTRA" && t.kind === "INCOME")
        .reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const totalExpense = useMemo(
    () =>
      transactions
        .filter((t) => t.kind === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0),
    [transactions]
  );

  const balance = totalIncome - totalExpense;
  const savingsRate =
    totalIncome > 0 ? Math.max(0, Math.round((balance / totalIncome) * 100)) : 0;

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // 1. FLUXO SEMANAL DINÂMICO
  const weeklyData = useMemo(() => {
    const weeks = [
      { label: "Sem 1", range: "01 a 07", start: 1, end: 7 },
      { label: "Sem 2", range: "08 a 14", start: 8, end: 14 },
      { label: "Sem 3", range: "15 a 21", start: 15, end: 21 },
      { label: "Sem 4", range: "22 a 31", start: 22, end: 31 },
    ];

    const computed = weeks.map((w) => {
      const txs = transactions.filter((t) => {
        if (!t.date) return false;
        const day = parseInt(t.date.split("-")[2] || "0", 10);
        return day >= w.start && day <= w.end;
      });

      const entrada = txs
        .filter((t) => t.kind === "INCOME")
        .reduce((s, t) => s + t.amount, 0);
      const saida = txs
        .filter((t) => t.kind === "EXPENSE")
        .reduce((s, t) => s + t.amount, 0);

      return { label: w.label, range: w.range, entrada, saida };
    });

    const maxVal = Math.max(
      ...computed.map((w) => Math.max(w.entrada, w.saida)),
      1
    );

    return computed.map((w) => ({
      ...w,
      entradaPct: w.entrada > 0 ? Math.max(10, Math.round((w.entrada / maxVal) * 100)) : 0,
      saidaPct: w.saida > 0 ? Math.max(10, Math.round((w.saida / maxVal) * 100)) : 0,
      tooltip: `E: ${fmt(w.entrada)} / S: ${fmt(w.saida)}`,
    }));
  }, [transactions]);

  // 2. GASTOS POR CATEGORIA DINÂMICO
  const { categoryBreakdown, categoryCircumference } = useMemo(() => {
    const expenses = transactions.filter((t) => t.kind === "EXPENSE");
    const map: Record<string, number> = {};

    for (const t of expenses) {
      const name = t.category_name || "Geral";
      map[name] = (map[name] || 0) + t.amount;
    }

    const palette = [
      { color: "#F43F5E", tw: "bg-expense-rose" },
      { color: "#F59E0B", tw: "bg-warning-amber" },
      { color: "#8B5CF6", tw: "bg-extra-violet" },
      { color: "#0EA5E9", tw: "bg-goal-sky" },
      { color: "#10B981", tw: "bg-income-emerald" },
      { color: "#EC4899", tw: "bg-pink-500" },
      { color: "#6366F1", tw: "bg-indigo-500" },
    ];

    const sorted = Object.entries(map)
      .map(([name, val], i) => {
        const found = categories.find((c) => c.name.toLowerCase() === name.toLowerCase());
        return {
          label: name,
          value: val,
          pct: totalExpense > 0 ? (val / totalExpense) * 100 : 0,
          color: found?.color || palette[i % palette.length].color,
          twColor: palette[i % palette.length].tw,
        };
      })
      .sort((a, b) => b.value - a.value);

    // SVG Donut calculation (circumference = 2 * pi * 60 = 376.99)
    const C = 376.99;
    let accumulatedOffset = 0;
    const segments = sorted.map((cat) => {
      const length = (cat.pct / 100) * C;
      const strokeDasharray = `${length.toFixed(1)} ${(C - length).toFixed(1)}`;
      const strokeDashoffset = (-accumulatedOffset).toFixed(1);
      accumulatedOffset += length;
      return {
        ...cat,
        strokeDasharray,
        strokeDashoffset,
      };
    });

    return { categoryBreakdown: segments, categoryCircumference: C };
  }, [transactions, totalExpense]);

  // 3. DINHEIRO EXTRA DINÂMICO
  const extraTransactions = useMemo(
    () =>
      transactions
        .filter((t) => t.nature === "EXTRA")
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [transactions]
  );

  // 4. LIMITES DE ORÇAMENTO DINÂMICO
  const budgetedCategories = useMemo(() => {
    const expenses = transactions.filter((t) => t.kind === "EXPENSE");
    const seenNames = new Set<string>();
    const uniqueBudgeted = categories.filter((c) => {
      if (!c.monthly_limit || c.monthly_limit <= 0) return false;
      if (seenNames.has(c.name)) return false;
      seenNames.add(c.name);
      return true;
    });

    return uniqueBudgeted
      .map((cat) => {
        const spent = expenses
          .filter((t) => t.category_id === cat.id || t.category_name === cat.name)
          .reduce((s, t) => s + t.amount, 0);
        const limit = cat.monthly_limit || 0;
        const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        const remaining = limit - spent;
        const warn = pct >= 80;

        return {
          id: cat.id,
          label: cat.name,
          icon: cat.icon || "receipt",
          spent,
          limit,
          pct,
          warn,
          remaining,
        };
      })
      .sort((a, b) => b.pct - a.pct);
  }, [categories, transactions]);

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = "ID;Data;Descricao;Valor;Tipo;Natureza;Status;Categoria";
    const rows = transactions.map((t) =>
      [
        t.id,
        t.date,
        `"${t.description.replace(/"/g, '""')}"`,
        t.kind === "EXPENSE" ? `-${t.amount}` : t.amount,
        t.kind,
        t.nature,
        t.status,
        `"${(t.category_name || "").replace(/"/g, '""')}"`,
      ].join(";")
    );
    const csvContent = "\uFEFF" + headers + "\n" + rows.join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `dashboard_lancamentos_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="relative w-full px-space-lg md:px-margin py-space-lg md:py-margin space-y-space-xl overflow-hidden">
      {/* Atmospheric Glow Backgrounds */}
      <div className="absolute -top-32 -left-20 w-96 h-96 rounded-full bg-income-emerald/10 blur-[120px] pointer-events-none" />
      <div className="absolute top-1/3 -right-24 w-[28rem] h-[28rem] rounded-full bg-extra-violet/10 blur-[140px] pointer-events-none" />

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md relative">
        <div>
          <div className="flex items-center gap-space-xs text-label-sm text-text-secondary uppercase tracking-wider">
            <span>Cockpit Financeiro</span>
            <span className="w-1.5 h-1.5 rounded-full bg-income-emerald" />
            <span className="text-text-primary">{monthLabel}</span>
          </div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight mt-space-2xs">
            Visão Geral & Performance
          </h1>
        </div>

        {/* Forecast Callout */}
        <div className="flex items-center gap-space-sm px-space-md py-space-sm rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.06)]">
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-tertiary/15 text-tertiary">
            <span className="material-symbols-outlined text-lg leading-none">auto_graph</span>
          </div>
          <div className="flex flex-col">
            <span className="text-label-sm text-text-secondary">Projeção de Fechamento</span>
            <div className="flex items-baseline gap-space-xs">
              <span className="text-headline-sm font-bold text-text-primary tabular-nums">
                {fmt(balance)}
              </span>
              <span className="text-label-sm text-income-emerald font-semibold">
                {transactions.length > 0 ? "Ritmo em tempo real" : "Aguardando dados"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-space-md relative">
        {/* KPI 1: Saldo Líquido */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 animate-fade-in-up">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-income-emerald/10 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-label-md text-text-secondary uppercase tracking-wider">Saldo Líquido</span>
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-card-elevated text-income-emerald">
              <span className="material-symbols-outlined text-base">account_balance_wallet</span>
            </span>
          </div>
          <div className={`mt-space-md text-kpi-value font-bold tabular-nums ${balance >= 0 ? "text-income-emerald" : "text-expense-rose"}`}>
            {fmt(balance)}
          </div>
          <div className="mt-space-sm flex items-center justify-between pt-space-xs">
            <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-lg bg-surface-container-high text-text-secondary text-label-sm font-medium">
              <span className="material-symbols-outlined text-xs">trending_flat</span>
              <span>{transactions.length} lançamentos</span>
            </div>
            <span className="text-label-sm text-text-muted">Líquido do mês</span>
          </div>
        </div>

        {/* KPI 2: Total Entradas */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 animate-fade-in-up delay-75">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-extra-violet/10 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-label-md text-text-secondary uppercase tracking-wider">Total de Entradas</span>
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-card-elevated text-primary">
              <span className="material-symbols-outlined text-base">arrow_downward_alt</span>
            </span>
          </div>
          <div className="mt-space-md text-kpi-value font-bold text-text-primary tabular-nums">
            {fmt(totalIncome)}
          </div>
          <div className="mt-space-sm flex items-center gap-space-xs flex-wrap">
            <span className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-lg bg-extra-violet/15 text-extra-violet text-label-sm font-semibold shadow-glow-sm">
              <span className="material-symbols-outlined text-xs">bolt</span>
              <span>+{fmt(extraIncome)} Extras</span>
            </span>
          </div>
        </div>

        {/* KPI 3: Total Saídas */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 animate-fade-in-up delay-150">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-expense-rose/10 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-label-md text-text-secondary uppercase tracking-wider">Total de Saídas</span>
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-card-elevated text-expense-rose">
              <span className="material-symbols-outlined text-base">arrow_upward_alt</span>
            </span>
          </div>
          <div className="mt-space-md text-kpi-value font-bold text-text-primary tabular-nums">
            {fmt(totalExpense)}
          </div>
          <div className="mt-space-sm flex items-center justify-between pt-space-xs">
            <div className="inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-lg bg-expense-rose/10 text-expense-rose text-label-sm font-semibold">
              <span className="material-symbols-outlined text-xs">receipt_long</span>
              <span>Despesas pagas & pendentes</span>
            </div>
          </div>
        </div>

        {/* KPI 4: Taxa de Poupança */}
        <div className="relative overflow-hidden rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)] transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 animate-fade-in-up delay-225">
          <div className="absolute -right-4 -top-4 w-24 h-24 rounded-full bg-goal-sky/10 blur-xl" />
          <div className="flex items-center justify-between">
            <span className="text-label-md text-text-secondary uppercase tracking-wider">Taxa de Poupança</span>
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-surface-card-elevated text-goal-sky">
              <span className="material-symbols-outlined text-base">savings</span>
            </span>
          </div>
          <div className="mt-space-md flex items-baseline gap-space-xs">
            <span className="text-kpi-value font-bold text-text-primary tabular-nums">{savingsRate}%</span>
            <span className="text-label-sm text-goal-sky font-semibold">da renda</span>
          </div>
          <div className="mt-space-sm flex items-center gap-space-xs">
            <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-goal-sky h-full rounded-full transition-all duration-700"
                style={{ width: `${Math.min(savingsRate, 100)}%` }}
              />
            </div>
            <span className="text-label-sm text-text-primary font-bold shrink-0 tabular-nums">
              {fmt(balance)}
            </span>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-md">
        {/* Left: Charts (8 cols) */}
        <div className="lg:col-span-8 flex flex-col gap-space-md">
          {/* Weekly Bar Chart */}
          <div className="rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pb-space-md">
              <div>
                <span className="text-headline-sm font-semibold text-text-primary">Fluxo Semanal: Entradas vs Saídas</span>
                <p className="text-body-md text-text-secondary mt-0.5">Comparativo das 4 semanas do mês</p>
              </div>
              <div className="flex items-center gap-space-md text-label-sm">
                <div className="flex items-center gap-space-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-income-emerald" />
                  <span className="text-text-secondary">Receitas</span>
                </div>
                <div className="flex items-center gap-space-2xs">
                  <span className="w-2.5 h-2.5 rounded-full bg-expense-rose" />
                  <span className="text-text-secondary">Despesas</span>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-space-md h-52 items-end pt-space-sm">
              {weeklyData.map((week) => (
                <div key={week.label} className="flex flex-col items-center h-full justify-end group cursor-pointer">
                  <div className="text-label-sm text-text-muted mb-space-xs opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {week.tooltip}
                  </div>
                  <div className="w-full flex items-end justify-center gap-space-xs h-40">
                    <div
                      className="w-7 sm:w-10 rounded-t-lg bg-gradient-to-t from-income-emerald/80 to-income-emerald transition-all duration-500 group-hover:brightness-125"
                      style={{ height: `${week.entradaPct}%` }}
                    />
                    <div
                      className="w-7 sm:w-10 rounded-t-lg bg-gradient-to-t from-expense-rose/80 to-expense-rose transition-all duration-500 group-hover:brightness-125"
                      style={{ height: `${week.saidaPct}%` }}
                    />
                  </div>
                  <div className="mt-space-sm text-center">
                    <span className="block text-label-md font-bold text-text-primary">{week.label}</span>
                    <span className="block text-label-sm text-text-secondary">{week.range}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Balance Evolution */}
          <div className="rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)]">
            <div className="flex items-center justify-between pb-space-sm">
              <div>
                <h2 className="text-headline-sm font-semibold text-text-primary">Evolução do Saldo Acumulado</h2>
                <span className="text-body-md text-text-secondary">Trajetória financeira no período</span>
              </div>
              <div className="flex items-center gap-space-sm text-label-sm">
                <span className="flex items-center gap-space-2xs text-text-secondary">
                  <span className="w-4 h-0.5 bg-primary inline-block rounded" /> Realizado
                </span>
              </div>
            </div>
            <div className="w-full pt-space-xs">
              {transactions.length === 0 ? (
                <div className="h-36 flex flex-col items-center justify-center text-text-muted text-label-md">
                  <span className="material-symbols-outlined text-2xl mb-1 text-text-muted/60">show_chart</span>
                  <span>Nenhuma movimentação registrada no período</span>
                </div>
              ) : (
                <svg className="w-full h-36 overflow-visible" viewBox="0 0 760 160" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="areaGradient" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="0%" stopColor="#4edea3" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#4edea3" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <line x1="0" x2="760" y1="30" y2="30" stroke="#31353e" strokeDasharray="3 3" opacity="0.3" />
                  <line x1="0" x2="760" y1="80" y2="80" stroke="#31353e" strokeDasharray="3 3" opacity="0.3" />
                  <line x1="0" x2="760" y1="130" y2="130" stroke="#31353e" strokeDasharray="3 3" opacity="0.3" />
                  <path d="M 0 135 Q 80 80 160 85 T 320 70 T 480 50 T 600 40 L 600 150 L 0 150 Z" fill="url(#areaGradient)" />
                  <path d="M 0 135 Q 80 80 160 85 T 320 70 T 480 50 T 600 40" stroke="#4edea3" strokeWidth="3" strokeLinecap="round" />
                  <circle cx="600" cy="40" r="5" fill="#4edea3" />
                  <circle cx="600" cy="40" r="10" stroke="#4edea3" strokeOpacity="0.4" strokeWidth="2" />
                  <text x="600" y="24" textAnchor="middle" fill="#F8FAFC" fontSize="11" fontWeight="700" fontFamily="Plus Jakarta Sans">
                    {fmt(balance)}
                  </text>
                </svg>
              )}
              <div className="flex justify-between text-label-sm text-text-muted mt-space-2xs px-space-xs">
                <span>01 do Mês</span>
                <span>10 do Mês</span>
                <span>20 do Mês</span>
                <span className="text-primary font-bold">Hoje</span>
                <span className="text-tertiary">Fim do Mês</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Donut Chart Gastos por Categoria (4 cols) */}
        <div className="lg:col-span-4 rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)] flex flex-col">
          <div className="flex items-center justify-between pb-space-sm">
            <h2 className="text-headline-sm font-semibold text-text-primary">Gastos por Categoria</h2>
            <span className="text-label-sm text-text-secondary tabular-nums">
              Total: {fmt(totalExpense)}
            </span>
          </div>

          <div className="relative flex items-center justify-center my-space-md">
            <svg className="w-48 h-48 -rotate-90" viewBox="0 0 160 160">
              {/* Background ring */}
              <circle
                cx="80"
                cy="80"
                r="60"
                fill="transparent"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="16"
              />

              {/* Dynamic segments */}
              {categoryBreakdown.map((cat) => (
                <circle
                  key={cat.label}
                  cx="80"
                  cy="80"
                  r="60"
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth="16"
                  strokeDasharray={cat.strokeDasharray}
                  strokeDashoffset={cat.strokeDashoffset}
                  strokeLinecap="round"
                />
              ))}
            </svg>

            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
              <span className="text-label-sm text-text-secondary">Despesas</span>
              <span className="text-headline-sm font-bold text-text-primary tabular-nums">
                {fmt(totalExpense)}
              </span>
              <span className="text-label-sm text-text-muted">
                {categoryBreakdown.length} {categoryBreakdown.length === 1 ? "categoria" : "categorias"}
              </span>
            </div>
          </div>

          <div className="flex flex-col gap-space-xs mt-space-sm flex-1 max-h-80 overflow-y-auto pr-1">
            {categoryBreakdown.length === 0 ? (
              <div className="p-space-md text-center text-text-muted text-label-sm bg-surface-container-lowest rounded-xl">
                Nenhum gasto registrado neste mês.
              </div>
            ) : (
              categoryBreakdown.map((item) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between p-space-xs rounded-xl hover:bg-surface-container transition-colors"
                >
                  <div className="flex items-center gap-space-xs min-w-0">
                    <span
                      className="w-3 h-3 rounded-full shrink-0"
                      style={{ backgroundColor: item.color }}
                    />
                    <span className="text-body-md text-text-primary truncate" title={item.label}>
                      {item.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-space-sm text-label-md shrink-0">
                    <span className="text-text-primary font-bold tabular-nums">
                      {fmt(item.value)}
                    </span>
                    <span className="text-text-muted text-xs tabular-nums">
                      {item.pct.toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>

          <Link
            href="/categorias"
            className="mt-space-md w-full py-space-xs px-space-md rounded-xl bg-surface-card-elevated hover:bg-surface-container-high text-text-secondary hover:text-text-primary text-label-md transition-all flex items-center justify-center gap-space-xs cursor-pointer"
          >
            <span>Ver auditoria detalhada</span>
            <span className="material-symbols-outlined text-sm">open_in_new</span>
          </Link>
        </div>
      </div>

      {/* Dinheiro Extra Section */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-surface-card via-surface-card-elevated to-surface-card p-space-lg shadow-xl border border-[rgba(255,255,255,0.06)]">
        <div className="absolute top-0 right-0 w-80 h-full bg-extra-violet/10 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-space-lg relative z-10">
          <div className="flex flex-col sm:flex-row sm:items-center gap-space-lg">
            <div className="w-14 h-14 rounded-2xl bg-extra-violet/20 flex items-center justify-center text-extra-violet shadow-glow-violet shrink-0">
              <span className="material-symbols-outlined text-3xl">offline_bolt</span>
            </div>
            <div>
              <div className="flex items-center gap-space-xs">
                <span className="text-label-sm text-extra-violet uppercase font-bold tracking-wider">
                  Acelerador de Metas
                </span>
                <span className="px-space-xs py-space-2xs rounded-full bg-extra-violet/15 text-extra-violet text-label-sm font-semibold">
                  Destaque
                </span>
              </div>
              <h2 className="text-headline-md font-bold text-text-primary">Dinheiro Extra de Setembro</h2>
              <div className="flex items-baseline gap-space-xs mt-space-2xs">
                <span className="text-display-currency font-extrabold text-text-primary tracking-tight tabular-nums">
                  {fmt(extraIncome)}
                </span>
                <span className="text-label-md text-extra-violet">livre para aporte ou reserva</span>
              </div>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-space-xs bg-extra-violet hover:bg-extra-violet-hover text-white text-headline-sm font-semibold px-space-lg py-space-sm rounded-2xl transition-all shadow-glow-violet active:scale-95 shrink-0 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-lg leading-none">add_circle</span>
            <span>+ Lançar entrada extra</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-md mt-space-lg relative z-10">
          {extraTransactions.length === 0 ? (
            <div className="col-span-full rounded-2xl bg-surface-container-low/60 p-space-lg text-center text-text-muted text-body-md border border-[rgba(255,255,255,0.04)]">
              Nenhuma entrada extra registrada neste mês. Clique em <strong>+ Lançar entrada extra</strong> para registrar vendas, bônus, freelas ou rendimentos.
            </div>
          ) : (
            extraTransactions.slice(0, 3).map((item) => (
              <div
                key={item.id}
                className="rounded-2xl bg-surface-container-low/90 p-space-md flex flex-col justify-between hover:bg-surface-container transition-all border border-[rgba(255,255,255,0.04)]"
              >
                <div className="flex items-center justify-between pb-space-xs">
                  <span className="px-space-xs py-space-2xs rounded bg-extra-violet/20 text-extra-violet text-label-sm font-semibold">
                    Extra
                  </span>
                  <span className="text-label-sm text-text-muted">{formatDate(item.date)}</span>
                </div>
                <div className="mt-space-xs">
                  <span className="text-body-md text-text-primary font-semibold block truncate">
                    {item.description}
                  </span>
                  <span className="text-label-sm text-text-secondary truncate">
                    {item.category_name || "Receita Extra"}
                  </span>
                </div>
                <div className="mt-space-md flex items-center justify-between pt-space-xs">
                  <span className="text-table-data-currency font-bold text-extra-violet tabular-nums">
                    +{fmt(item.amount)}
                  </span>
                  <span className="material-symbols-outlined text-xs text-income-emerald">check_circle</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Budget Progress (only rendered if user has any category budget configured) */}
      {budgetedCategories.length > 0 && (
        <div className="rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.05)]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-xs pb-space-md">
            <div>
              <h2 className="text-headline-sm font-semibold text-text-primary">Limites de Orçamento Mensal</h2>
              <span className="text-body-md text-text-secondary">Acompanhamento de tetos estabelecidos para o mês</span>
            </div>
            <span className="text-label-sm text-text-muted">
              {budgetedCategories.length} {budgetedCategories.length === 1 ? "categoria ativa" : "categorias ativas"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-space-lg">
            {budgetedCategories.slice(0, 3).map((b) => (
              <div key={b.id} className="rounded-2xl bg-surface-container-lowest p-space-md flex flex-col justify-between">
                <div className="flex items-center justify-between mb-space-xs">
                  <div className="flex items-center gap-space-xs">
                    <span className={`material-symbols-outlined text-base ${b.warn ? "text-warning-amber" : "text-income-emerald"}`}>
                      {b.icon}
                    </span>
                    <span className="text-body-md text-text-primary font-semibold">{b.label}</span>
                  </div>
                  <span className={`text-label-sm font-bold ${b.warn ? "text-warning-amber" : "text-income-emerald"}`}>
                    {b.pct}%
                  </span>
                </div>
                <div className="w-full bg-surface-container-high rounded-full h-2 overflow-hidden my-space-xs">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${b.warn ? "bg-warning-amber" : "bg-income-emerald"}`}
                    style={{ width: `${Math.min(b.pct, 100)}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-label-sm text-text-secondary mt-space-2xs">
                  <span>Gasto: <strong className="text-text-primary tabular-nums">{fmt(b.spent)}</strong></span>
                  <span>Teto: {fmt(b.limit)}</span>
                </div>
                <span className={`text-label-sm mt-space-xs flex items-center gap-space-2xs ${b.warn ? "text-warning-amber" : "text-income-emerald"}`}>
                  <span className="material-symbols-outlined text-xs">{b.warn ? "warning" : "check_circle"}</span>
                  {b.remaining >= 0 ? `Restam ${fmt(b.remaining)}` : `Excedeu ${fmt(Math.abs(b.remaining))}`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Transactions */}
      <div className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="p-space-lg flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
          <div>
            <h2 className="text-headline-sm font-semibold text-text-primary">Últimos Lançamentos</h2>
            <span className="text-body-md text-text-secondary">Extrato consolidado com entradas, extras e saídas</span>
          </div>
          <div className="flex items-center gap-space-xs">
            <Link
              href="/lancamentos"
              className="px-space-md py-space-xs rounded-xl bg-surface-card-elevated hover:bg-surface-container-high text-text-primary text-label-sm transition-colors flex items-center gap-space-2xs"
            >
              <span className="material-symbols-outlined text-base">filter_list</span>
              <span>Filtrar</span>
            </Link>
            <button
              onClick={handleExportCSV}
              className="px-space-md py-space-xs rounded-xl bg-surface-card-elevated hover:bg-surface-container-high text-text-primary text-label-sm transition-colors flex items-center gap-space-2xs cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">file_download</span>
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>
        <div className="w-full overflow-x-auto">
          <table className="w-full text-left text-table-data">
            <thead>
              <tr className="bg-surface-container-lowest text-text-secondary uppercase text-label-sm tracking-wider">
                <th className="py-space-sm px-space-lg font-semibold">Data</th>
                <th className="py-space-sm px-space-md font-semibold">Descrição</th>
                <th className="py-space-sm px-space-md font-semibold">Categoria</th>
                <th className="py-space-sm px-space-md font-semibold text-right">Valor</th>
                <th className="py-space-sm px-space-md font-semibold text-center">Status</th>
                <th className="py-space-sm px-space-lg font-semibold text-right">Ação</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-text-muted">
                    Nenhum lançamento registrado ainda.
                  </td>
                </tr>
              ) : (
                transactions.slice(0, 7).map((t, i) => {
                  const isExtra = t.nature === "EXTRA";
                  const isExpense = t.kind === "EXPENSE";
                  return (
                    <tr
                      key={t.id}
                      className={`h-11 transition-colors group ${
                        i % 2 === 1 ? "bg-surface-table-row-alt hover:bg-surface-card-elevated/70" : "bg-surface-card hover:bg-surface-card-elevated/70"
                      } ${isExtra ? "extra-row-indicator" : ""}`}
                    >
                      <td className="py-space-sm px-space-lg text-text-secondary whitespace-nowrap text-table-data">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-space-sm px-space-md text-text-primary font-semibold whitespace-nowrap">
                        <div className="flex items-center gap-space-sm">
                          <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                            isExtra ? "bg-extra-violet/20 text-extra-violet" :
                            isExpense ? "bg-expense-rose/15 text-expense-rose" :
                            "bg-income-emerald/15 text-income-emerald"
                          }`}>
                            <span className="material-symbols-outlined text-base">
                              {isExtra ? "bolt" : isExpense ? "arrow_upward_alt" : "arrow_downward_alt"}
                            </span>
                          </span>
                          <span>{t.description}</span>
                        </div>
                      </td>
                      <td className="py-space-sm px-space-md whitespace-nowrap">
                        <span className={`inline-flex items-center gap-space-2xs px-space-xs py-space-2xs rounded-lg text-label-sm font-semibold ${
                          isExtra ? "bg-extra-violet/15 text-extra-violet" :
                          isExpense ? "bg-expense-rose/10 text-expense-rose" :
                          "bg-income-emerald/10 text-income-emerald"
                        }`}>
                          {isExtra && <span className="material-symbols-outlined text-xs">bolt</span>}
                          {t.category_name || "Geral"}
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
                          {t.status === "PENDING" ? "Pendente" : "Recebido / Pago"}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-lg text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-space-2xs opacity-70 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => deleteTransaction(t.id)}
                            aria-label="Excluir"
                            className="text-text-muted hover:text-expense-rose p-space-2xs rounded-lg hover:bg-expense-rose/10 transition-colors cursor-pointer"
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
            </tbody>
          </table>
        </div>
        <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm">
          <span className="text-label-sm text-text-muted">
            Exibindo {Math.min(transactions.length, 7)} de {transactions.length} lançamentos
          </span>
          <div className="flex items-center gap-space-xs">
            <button className="px-space-md py-space-2xs rounded-xl bg-surface-card hover:bg-surface-card-elevated text-text-secondary hover:text-text-primary text-label-sm transition-colors" type="button">Anterior</button>
            <span className="px-space-sm text-label-sm text-text-primary font-bold">1 de 1</span>
            <button className="px-space-md py-space-2xs rounded-xl bg-surface-card hover:bg-surface-card-elevated text-text-secondary hover:text-text-primary text-label-sm transition-colors" type="button">Próximo</button>
          </div>
        </div>
      </div>

      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </div>
  );
}
