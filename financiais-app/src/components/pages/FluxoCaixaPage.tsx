"use client";

import { useMemo, useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";

const MONTHS_SHORT = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const MONTHS_FULL = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

type Horizon = "3m" | "6m" | "12m";

interface DayPoint {
  date: string; // YYYY-MM-DD
  label: string; // "15 Set"
  income: number;
  expense: number;
  balance: number; // cumulative
  events: { description: string; amount: number; kind: "income" | "expense" }[];
}

export default function FluxoCaixaPage() {
  const { transactions: allTransactions, recurringRules } = useFinance();
  const [horizon, setHorizon] = useState<Horizon>("3m");

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const today = new Date();
  const todayStr = today.toISOString().slice(0, 10);
  const currentMonth = todayStr.slice(0, 7);

  // How many months ahead to project
  const monthCount = horizon === "3m" ? 3 : horizon === "6m" ? 6 : 12;

  // Build projected data
  const { points, monthSummaries, currentBalance, minBalance, maxBalance } = useMemo(() => {
    // ── 1. Start from the settled transactions this month to get current balance ──
    let runningBalance = 0;
    allTransactions.forEach((t) => {
      if ((t.competence_month || t.date?.slice(0, 7)) <= currentMonth && t.status === "SETTLED") {
        runningBalance += t.kind === "INCOME" ? t.amount : -t.amount;
      }
    });
    const startBalance = runningBalance;

    // ── 2. Build future points from recurring rules ──
    const points: DayPoint[] = [];
    const monthSummaries: { month: string; label: string; income: number; expense: number; net: number }[] = [];

    let cumBalance = startBalance;

    for (let mOffset = 0; mOffset < monthCount; mOffset++) {
      const d = new Date(today.getFullYear(), today.getMonth() + mOffset, 1);
      const yr = d.getFullYear();
      const mo = d.getMonth() + 1;
      const monthStr = `${yr}-${String(mo).padStart(2, "0")}`;
      const monthLabel = `${MONTHS_SHORT[mo - 1]}/${yr}`;

      let monthIncome = 0;
      let monthExpense = 0;

      // Existing settled transactions for future months (if navigated forward)
      allTransactions
        .filter((t) => {
          const txMonth = t.competence_month || t.date?.slice(0, 7);
          return txMonth === monthStr && t.status === "SETTLED";
        })
        .forEach((t) => {
          const dayStr = t.date || `${monthStr}-01`;
          if (dayStr > todayStr || mOffset > 0) {
            const existing = points.find((p) => p.date === dayStr);
            const ev = {
              description: t.description,
              amount: t.amount,
              kind: (t.kind === "INCOME" ? "income" : "expense") as "income" | "expense",
            };
            if (existing) {
              existing.events.push(ev);
              if (t.kind === "INCOME") { existing.income += t.amount; monthIncome += t.amount; }
              else { existing.expense += t.amount; monthExpense += t.amount; }
            } else {
              points.push({
                date: dayStr,
                label: `${String(parseInt(dayStr.slice(8, 10))).padStart(2, "0")} ${MONTHS_SHORT[mo - 1]}`,
                income: t.kind === "INCOME" ? t.amount : 0,
                expense: t.kind !== "INCOME" ? t.amount : 0,
                balance: 0,
                events: [ev],
              });
              if (t.kind === "INCOME") monthIncome += t.amount;
              else monthExpense += t.amount;
            }
          }
        });

      // Recurring rules that generate future transactions
      recurringRules
        .filter((r) => r.is_active && r.frequency === "MONTHLY")
        .forEach((rule) => {
          const dayOfMonth = Math.min(rule.day_of_month || 1, 28);
          const dayStr = `${monthStr}-${String(dayOfMonth).padStart(2, "0")}`;

          // Only add if no existing settled tx for this rule+month
          const alreadyExists = allTransactions.some(
            (t) =>
              (t.competence_month || t.date?.slice(0, 7)) === monthStr &&
              t.description.toLowerCase().trim() === rule.description.toLowerCase().trim() &&
              t.kind === rule.kind &&
              t.status === "SETTLED"
          );

          if (!alreadyExists) {
            const existing = points.find((p) => p.date === dayStr);
            const ev = {
              description: rule.description,
              amount: rule.amount,
              kind: (rule.kind === "INCOME" ? "income" : "expense") as "income" | "expense",
            };
            if (existing) {
              existing.events.push(ev);
              if (rule.kind === "INCOME") { existing.income += rule.amount; monthIncome += rule.amount; }
              else { existing.expense += rule.amount; monthExpense += rule.amount; }
            } else {
              points.push({
                date: dayStr,
                label: `${String(dayOfMonth).padStart(2, "0")} ${MONTHS_SHORT[mo - 1]}`,
                income: rule.kind === "INCOME" ? rule.amount : 0,
                expense: rule.kind !== "INCOME" ? rule.amount : 0,
                balance: 0,
                events: [ev],
              });
              if (rule.kind === "INCOME") monthIncome += rule.amount;
              else monthExpense += rule.amount;
            }
          }
        });

      monthSummaries.push({
        month: monthStr,
        label: `${MONTHS_FULL[mo - 1]} ${yr}`,
        income: monthIncome,
        expense: monthExpense,
        net: monthIncome - monthExpense,
      });
    }

    // Sort points by date and compute cumulative balance
    points.sort((a, b) => a.date.localeCompare(b.date));
    points.forEach((p) => {
      cumBalance += p.income - p.expense;
      p.balance = cumBalance;
    });

    const balances = points.map((p) => p.balance);
    const minBalance = Math.min(startBalance, ...balances);
    const maxBalance = Math.max(startBalance, ...balances);

    return { points, monthSummaries, currentBalance: startBalance, minBalance, maxBalance };
  }, [allTransactions, recurringRules, horizon, currentMonth, todayStr]);

  // SVG chart dimensions
  const svgW = 1000;
  const svgH = 220;
  const padL = 70;
  const padR = 20;
  const padT = 20;
  const padB = 30;
  const chartW = svgW - padL - padR;
  const chartH = svgH - padT - padB;

  const allPoints = [{ date: todayStr, balance: currentBalance }, ...points];

  const xScale = (i: number) => padL + (i / Math.max(allPoints.length - 1, 1)) * chartW;
  const yRange = Math.max(maxBalance - minBalance, 1);
  const yScale = (v: number) => padT + chartH - ((v - minBalance) / yRange) * chartH;

  const pathD = allPoints
    .map((p, i) => `${i === 0 ? "M" : "L"} ${xScale(i).toFixed(1)} ${yScale(p.balance).toFixed(1)}`)
    .join(" ");

  // Area fill
  const areaD =
    pathD +
    ` L ${xScale(allPoints.length - 1).toFixed(1)} ${(padT + chartH).toFixed(1)}` +
    ` L ${xScale(0).toFixed(1)} ${(padT + chartH).toFixed(1)} Z`;

  // Y-axis labels
  const ySteps = 5;
  const yLabels = Array.from({ length: ySteps + 1 }, (_, i) => {
    const v = minBalance + (yRange / ySteps) * i;
    return { v, y: yScale(v) };
  });

  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const hoveredPoint = hoveredIdx !== null ? allPoints[hoveredIdx] : null;
  const hoveredEvents = hoveredIdx !== null && hoveredIdx > 0 ? points[hoveredIdx - 1]?.events || [] : [];

  // Warn if balance will go negative
  const lowestPoint = points.reduce(
    (min, p) => (p.balance < min.balance ? p : min),
    { balance: currentBalance, date: todayStr, label: "Hoje" } as DayPoint & { label: string }
  );
  const willGoNegative = lowestPoint.balance < 0;

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs">
            <span className="text-primary text-label-sm uppercase tracking-wider font-semibold">Planejamento</span>
            <span className="text-text-muted text-label-sm">•</span>
            <span className="text-text-secondary text-label-sm">Fluxo de Caixa Projetado</span>
          </div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">
            Fluxo de Caixa Projetado
          </h1>
          <p className="text-body-md text-text-secondary max-w-2xl">
            Projeção baseada nos seus lançamentos recorrentes. Antecipe o futuro do seu dinheiro.
          </p>
        </div>

        {/* Horizon selector */}
        <div className="flex items-center gap-space-2xs p-space-2xs bg-surface-card rounded-xl border border-[rgba(255,255,255,0.05)] self-start">
          {(["3m","6m","12m"] as Horizon[]).map((h) => (
            <button
              key={h}
              type="button"
              onClick={() => setHorizon(h)}
              className={`px-space-md py-space-xs rounded-lg text-label-sm font-semibold transition-all cursor-pointer ${
                horizon === h
                  ? "bg-primary text-on-primary shadow-glow-sm"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              {h === "3m" ? "3 meses" : h === "6m" ? "6 meses" : "12 meses"}
            </button>
          ))}
        </div>
      </div>

      {/* Alert if balance goes negative */}
      {willGoNegative && (
        <div className="flex items-start gap-space-sm px-space-md py-space-sm rounded-2xl bg-expense-rose/10 border border-expense-rose/30 animate-fade-in-up">
          <span className="material-symbols-outlined text-expense-rose text-xl mt-0.5 shrink-0">warning</span>
          <div>
            <p className="text-label-md font-semibold text-expense-rose">Atenção: saldo pode ficar negativo</p>
            <p className="text-label-sm text-text-secondary mt-0.5">
              A projeção indica saldo de <strong className="text-expense-rose">{fmt(lowestPoint.balance)}</strong> em {lowestPoint.label}.
              Considere reduzir gastos ou antecipar receitas.
            </p>
          </div>
        </div>
      )}

      {/* Summary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-space-sm">
        {[
          {
            label: "Saldo Atual",
            value: currentBalance,
            color: currentBalance >= 0 ? "text-income-emerald" : "text-expense-rose",
            icon: "account_balance_wallet",
            sub: "hoje",
          },
          {
            label: "Entradas Previstas",
            value: monthSummaries.reduce((s, m) => s + m.income, 0),
            color: "text-income-emerald",
            icon: "arrow_downward_alt",
            sub: `próx. ${monthCount} meses`,
          },
          {
            label: "Gastos Previstos",
            value: monthSummaries.reduce((s, m) => s + m.expense, 0),
            color: "text-expense-rose",
            icon: "arrow_upward_alt",
            sub: `próx. ${monthCount} meses`,
          },
          {
            label: "Saldo Projetado",
            value: points.length > 0 ? points[points.length - 1].balance : currentBalance,
            color: (points.length > 0 ? points[points.length - 1].balance : currentBalance) >= 0 ? "text-income-emerald" : "text-expense-rose",
            icon: "trending_up",
            sub: `em ${monthCount === 3 ? "3" : monthCount === 6 ? "6" : "12"} meses`,
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
            <p className="text-label-xs text-text-muted mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      <div className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
          <div>
            <h2 className="text-headline-sm font-semibold text-text-primary">Evolução do Saldo</h2>
            <p className="text-body-md text-text-secondary">Projeção dia a dia baseada nos recorrentes</p>
          </div>
          <div className="flex items-center gap-space-2xs px-space-sm py-space-2xs rounded-xl bg-surface-container-lowest text-label-xs text-text-muted">
            <span className="material-symbols-outlined text-sm text-primary">info</span>
            Passe o mouse para detalhes
          </div>
        </div>

        <div className="p-space-md">
          {points.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 gap-space-sm">
              <span className="material-symbols-outlined text-5xl text-text-muted">show_chart</span>
              <p className="text-body-md text-text-muted text-center">
                Adicione regras de lançamento fixo para ver a projeção
              </p>
            </div>
          ) : (
            <div className="relative w-full" style={{ paddingTop: `${(svgH / svgW) * 100}%` }}>
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                className="absolute inset-0 w-full h-full"
                style={{ overflow: "visible" }}
              >
                <defs>
                  <linearGradient id="balanceGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={currentBalance >= 0 ? "#10b981" : "#f43f5e"} stopOpacity="0.3" />
                    <stop offset="100%" stopColor={currentBalance >= 0 ? "#10b981" : "#f43f5e"} stopOpacity="0.01" />
                  </linearGradient>
                </defs>

                {/* Y-axis grid lines */}
                {yLabels.map(({ v, y }, i) => (
                  <g key={i}>
                    <line
                      x1={padL}
                      y1={y}
                      x2={svgW - padR}
                      y2={y}
                      stroke="rgba(255,255,255,0.05)"
                      strokeWidth="1"
                    />
                    <text
                      x={padL - 8}
                      y={y + 4}
                      textAnchor="end"
                      fontSize="10"
                      fill="#64748b"
                    >
                      {v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v >= 0 ? v.toFixed(0) : `-${Math.abs(v).toFixed(0)}`}
                    </text>
                  </g>
                ))}

                {/* Zero line if negative range */}
                {minBalance < 0 && maxBalance > 0 && (
                  <line
                    x1={padL}
                    y1={yScale(0)}
                    x2={svgW - padR}
                    y2={yScale(0)}
                    stroke="#f43f5e"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                    opacity="0.5"
                  />
                )}

                {/* Area fill */}
                <path d={areaD} fill="url(#balanceGrad)" />

                {/* Line */}
                <path
                  d={pathD}
                  fill="none"
                  stroke={currentBalance >= 0 ? "#10b981" : "#f43f5e"}
                  strokeWidth="2.5"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />

                {/* Hover dots on event points */}
                {allPoints.map((p, i) => {
                  if (i === 0) return null;
                  const hasEvents = (points[i - 1]?.events?.length || 0) > 0;
                  if (!hasEvents) return null;
                  return (
                    <circle
                      key={i}
                      cx={xScale(i)}
                      cy={yScale(p.balance)}
                      r={hoveredIdx === i ? 6 : 4}
                      fill={p.balance >= 0 ? "#10b981" : "#f43f5e"}
                      stroke="#151c28"
                      strokeWidth="2"
                      className="cursor-pointer transition-all"
                      onMouseEnter={() => setHoveredIdx(i)}
                      onMouseLeave={() => setHoveredIdx(null)}
                    />
                  );
                })}

                {/* Today marker */}
                <circle
                  cx={xScale(0)}
                  cy={yScale(currentBalance)}
                  r="5"
                  fill="#4edea3"
                  stroke="#151c28"
                  strokeWidth="2"
                />
                <text x={xScale(0)} y={padT + chartH + 20} textAnchor="middle" fontSize="10" fill="#4edea3" fontWeight="bold">
                  Hoje
                </text>

                {/* Hovered tooltip */}
                {hoveredPoint && hoveredIdx !== null && (
                  <g>
                    <line
                      x1={xScale(hoveredIdx)}
                      y1={padT}
                      x2={xScale(hoveredIdx)}
                      y2={padT + chartH}
                      stroke="rgba(255,255,255,0.15)"
                      strokeWidth="1"
                      strokeDasharray="4 2"
                    />
                  </g>
                )}
              </svg>
            </div>
          )}

          {/* Tooltip below chart */}
          {hoveredPoint && hoveredIdx !== null && (
            <div className="mt-space-md rounded-xl bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] p-space-md animate-fade-in-up">
              <div className="flex items-center justify-between mb-space-xs">
                <span className="text-label-md font-semibold text-text-primary">{(allPoints[hoveredIdx] as DayPoint).label || "Hoje"}</span>
                <span className={`text-headline-sm font-bold tabular-nums ${hoveredPoint.balance >= 0 ? "text-income-emerald" : "text-expense-rose"}`}>
                  {fmt(hoveredPoint.balance)}
                </span>
              </div>
              {hoveredEvents.length > 0 && (
                <div className="space-y-space-2xs">
                  {hoveredEvents.map((ev, i) => (
                    <div key={i} className="flex items-center justify-between text-label-sm">
                      <span className="text-text-secondary truncate max-w-[200px]">{ev.description}</span>
                      <span className={`tabular-nums font-semibold shrink-0 ml-space-xs ${ev.kind === "income" ? "text-income-emerald" : "text-expense-rose"}`}>
                        {ev.kind === "income" ? "+" : "-"}{fmt(ev.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Month-by-month breakdown */}
      <div className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)]">
          <h2 className="text-headline-sm font-semibold text-text-primary">Resumo por Mês</h2>
          <p className="text-body-md text-text-secondary">Entradas e gastos projetados para cada período</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-lowest text-text-muted uppercase text-label-xs tracking-wider">
                <th className="py-space-sm px-space-lg font-semibold">Mês</th>
                <th className="py-space-sm px-space-md font-semibold text-income-emerald">Entradas</th>
                <th className="py-space-sm px-space-md font-semibold text-expense-rose">Gastos</th>
                <th className="py-space-sm px-space-md font-semibold">Saldo do mês</th>
                <th className="py-space-sm px-space-lg font-semibold text-right">Saldo acumulado</th>
              </tr>
            </thead>
            <tbody>
              {(() => {
                let acc = currentBalance;
                return monthSummaries.map((m, i) => {
                  acc += m.net;
                  return (
                    <tr
                      key={m.month}
                      className={`h-11 transition-colors ${i % 2 === 0 ? "bg-surface-card" : "bg-surface-table-row-alt"} hover:bg-surface-card-elevated/70`}
                    >
                      <td className="py-space-sm px-space-lg text-text-primary font-semibold text-body-md">
                        {m.label}
                        {m.month === currentMonth && (
                          <span className="ml-space-xs px-1.5 py-0.5 rounded bg-primary/20 text-primary text-[10px] font-bold">Atual</span>
                        )}
                      </td>
                      <td className="py-space-sm px-space-md text-income-emerald font-semibold tabular-nums text-body-md">
                        +{fmt(m.income)}
                      </td>
                      <td className="py-space-sm px-space-md text-expense-rose font-semibold tabular-nums text-body-md">
                        -{fmt(m.expense)}
                      </td>
                      <td className="py-space-sm px-space-md tabular-nums text-body-md">
                        <span className={m.net >= 0 ? "text-income-emerald font-semibold" : "text-expense-rose font-semibold"}>
                          {m.net >= 0 ? "+" : ""}{fmt(m.net)}
                        </span>
                      </td>
                      <td className="py-space-sm px-space-lg text-right tabular-nums text-body-md">
                        <span className={acc >= 0 ? "text-text-primary font-bold" : "text-expense-rose font-bold"}>
                          {fmt(acc)}
                        </span>
                      </td>
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>

        <div className="px-space-lg py-space-sm border-t border-[rgba(255,255,255,0.04)] flex items-center gap-space-xs">
          <span className="material-symbols-outlined text-sm text-text-muted">info</span>
          <span className="text-label-xs text-text-muted">
            Projeção baseada nos lançamentos fixos recorrentes cadastrados. Valores reais podem variar.
          </span>
        </div>
      </div>
    </div>
  );
}
