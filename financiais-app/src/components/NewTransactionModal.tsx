"use client";

import { useState, useEffect, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { TransactionKind, TransactionNature } from "@/types/finance";
import Portal from "@/components/Portal";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TransactionType = "entrada" | "extra" | "gasto" | "meta";

// Categories per transaction type (used as default chips)
const categories: Record<TransactionType, string[]> = {
  entrada: ["Salário", "Freelance", "Rendimentos", "Outros"],
  extra: ["Freelance", "Venda", "Bônus", "Rendimentos", "Outros"],
  gasto: ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Assinaturas", "Educação", "Utilidades", "Outros"],
  meta: ["Reserva de Emergência", "Viagem", "Equipamento", "Investimento", "Outros"],
};

const typeConfig = {
  entrada: { label: "Entrada",       color: "text-income-emerald", bg: "bg-income-emerald/15", border: "border-income-emerald/50", icon: "arrow_downward_alt" },
  extra:   { label: "Entrada Extra", color: "text-extra-violet",   bg: "bg-extra-violet/15",   border: "border-extra-violet/50",   icon: "bolt" },
  gasto:   { label: "Gasto",         color: "text-expense-rose",   bg: "bg-expense-rose/15",   border: "border-expense-rose/50",   icon: "arrow_upward_alt" },
  meta:    { label: "Meta/Reserva",  color: "text-goal-sky",       bg: "bg-goal-sky/15",       border: "border-goal-sky/50",       icon: "savings" },
};

// Day-of-month options for recurring rule
const DAY_OPTIONS = Array.from({ length: 28 }, (_, i) => i + 1);

const MONTH_NAMES_SHORT = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez"
];

function getMonthsRange(startMonth: string, endMonth: string): string[] {
  if (startMonth > endMonth) return [startMonth];
  const months: string[] = [];
  let [sY, sM] = startMonth.split("-").map(Number);
  const [eY, eM] = endMonth.split("-").map(Number);

  while (sY < eY || (sY === eY && sM <= eM)) {
    months.push(`${sY}-${String(sM).padStart(2, "0")}`);
    sM++;
    if (sM > 12) {
      sM = 1;
      sY++;
    }
  }
  return months;
}

function formatMonthSummary(months: string[]): string {
  if (months.length === 0) return "";
  if (months.length <= 3) {
    return months
      .map((m) => {
        const [y, mon] = m.split("-");
        return `${MONTH_NAMES_SHORT[parseInt(mon, 10) - 1]}/${y}`;
      })
      .join(", ");
  }
  const first = months[0];
  const last = months[months.length - 1];
  const [fY, fM] = first.split("-");
  const [lY, lM] = last.split("-");
  return `${MONTH_NAMES_SHORT[parseInt(fM, 10) - 1]}/${fY} a ${MONTH_NAMES_SHORT[parseInt(lM, 10) - 1]}/${lY} (${months.length} meses)`;
}

export default function NewTransactionModal({ isOpen, onClose }: NewTransactionModalProps) {
  const { addTransaction, addTransactions, addRecurringRule, categories: financeCategories } = useFinance();
  const { selectedMonth, isCurrentMonth, monthLabel } = usePeriod();

  const [type, setType] = useState<TransactionType>("gasto");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");

  // Current system date
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialDate = useMemo(() => {
    if (isCurrentMonth) return todayStr;
    return `${selectedMonth}-01`;
  }, [isCurrentMonth, todayStr, selectedMonth]);

  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [dateShortcut, setDateShortcut] = useState<"hoje" | "ontem" | "outra">(isCurrentMonth ? "hoje" : "outra");
  const [isFixed, setIsFixed] = useState(false);
  const [fixedDay, setFixedDay] = useState(1);
  const [replicatePastMonths, setReplicatePastMonths] = useState(true);
  const [replicationTarget, setReplicationTarget] = useState<"year_end" | "current_month">("year_end");

  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync date when modal opens or selectedMonth changes
  useEffect(() => {
    if (isOpen) {
      const init = isCurrentMonth ? todayStr : `${selectedMonth}-01`;
      setSelectedDate(init);
      const d = parseInt(init.split("-")[2], 10);
      if (d >= 1 && d <= 28) setFixedDay(d);
      setDateShortcut(isCurrentMonth ? "hoje" : "outra");
      setReplicatePastMonths(true);
      setReplicationTarget("year_end");
    }
  }, [isOpen, selectedMonth, isCurrentMonth, todayStr]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  useEffect(() => {
    setCategory("");
  }, [type]);

  const availableCategories = useMemo(() => {
    const predefined = categories[type] || [];
    const customForKind = financeCategories
      .filter((c) => {
        if (type === "entrada" || type === "extra") return c.kind === "INCOME";
        return c.kind === "EXPENSE";
      })
      .map((c) => c.name);
    return Array.from(new Set([...predefined, ...customForKind]));
  }, [type, financeCategories]);

  // Compute month bounds for replication
  const startMonth = selectedDate ? selectedDate.slice(0, 7) : selectedMonth;
  const startYear = startMonth.split("-")[0] || new Date().getFullYear().toString();
  const currentCalendarMonth = todayStr.slice(0, 7);

  const targetEndMonth = useMemo(() => {
    if (replicationTarget === "year_end") {
      return `${startYear}-12`;
    }
    const maxCurrent = selectedMonth > currentCalendarMonth ? selectedMonth : currentCalendarMonth;
    return maxCurrent;
  }, [replicationTarget, startYear, selectedMonth, currentCalendarMonth]);

  const canReplicateMultipleMonths = isFixed && targetEndMonth > startMonth;

  const monthsToReplicate = useMemo(() => {
    if (!isFixed || startMonth >= targetEndMonth) return [startMonth];
    return getMonthsRange(startMonth, targetEndMonth);
  }, [isFixed, startMonth, targetEndMonth]);

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw || "0") / 100;
    setAmount(raw ? num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  };

  const handleShortcutClick = (shortcut: "hoje" | "ontem" | "outra") => {
    setDateShortcut(shortcut);
    if (shortcut === "hoje") {
      const target = isCurrentMonth ? todayStr : `${selectedMonth}-01`;
      setSelectedDate(target);
      const d = parseInt(target.split("-")[2], 10);
      if (d >= 1 && d <= 28) setFixedDay(d);
    } else if (shortcut === "ontem") {
      if (isCurrentMonth) {
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yest = d.toISOString().slice(0, 10);
        setSelectedDate(yest);
        const dayNum = parseInt(yest.split("-")[2], 10);
        if (dayNum >= 1 && dayNum <= 28) setFixedDay(dayNum);
      } else {
        const target = `${selectedMonth}-15`;
        setSelectedDate(target);
        setFixedDay(15);
      }
    }
  };

  const handleDateChange = (newDate: string) => {
    setSelectedDate(newDate);
    setDateShortcut("outra");
    if (newDate) {
      const parts = newDate.split("-");
      if (parts.length === 3) {
        const d = parseInt(parts[2], 10);
        if (d >= 1 && d <= 28) {
          setFixedDay(d);
        }
      }
    }
  };

  const handleFixedDayChange = (newDay: number) => {
    setFixedDay(newDay);
    if (selectedDate) {
      const parts = selectedDate.split("-");
      if (parts.length === 3) {
        const dayStr = String(Math.min(newDay, 28)).padStart(2, "0");
        setSelectedDate(`${parts[0]}-${parts[1]}-${dayStr}`);
      }
    }
  };

  const handleSave = async (andAnother = false) => {
    const rawNum = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (isNaN(rawNum) || rawNum <= 0) {
      alert("Por favor, digite um valor maior que zero.");
      return;
    }
    if (!description.trim()) {
      alert("Por favor, digite a descrição do lançamento.");
      return;
    }

    setIsSubmitting(true);

    const wasFixed = isFixed;

    let kind: TransactionKind = "EXPENSE";
    let nature: TransactionNature = "VARIABLE";

    if (type === "entrada") {
      kind = "INCOME";
      nature = wasFixed ? "FIXED" : "VARIABLE";
    } else if (type === "extra") {
      kind = "INCOME";
      nature = wasFixed ? "FIXED" : "EXTRA";
    } else if (type === "gasto") {
      kind = "EXPENSE";
      nature = wasFixed ? "FIXED" : "VARIABLE";
    } else if (type === "meta") {
      kind = "GOAL_CONTRIBUTION";
      nature = wasFixed ? "FIXED" : "VARIABLE";
    }

    const catName = category || (type === "meta" ? "Metas e Reservas" : "Geral");
    const matchedCat = financeCategories.find(
      (c) => c.name.toLowerCase() === catName.toLowerCase()
    );

    try {
      if (wasFixed && replicatePastMonths && monthsToReplicate.length > 1) {
        // Batch create transactions for each month from startMonth up to targetEndMonth
        const txsToCreate = monthsToReplicate.map((m) => {
          const dayStr = String(Math.min(fixedDay || 1, 28)).padStart(2, "0");
          return {
            kind,
            nature: "FIXED" as TransactionNature,
            description: description.trim(),
            amount: rawNum,
            date: `${m}-${dayStr}`,
            competence_month: m,
            status: "SETTLED" as const,
            category_id: matchedCat?.id,
            category_name: catName,
          };
        });

        await addTransactions(txsToCreate);

        await addRecurringRule({
          description: description.trim(),
          amount: rawNum,
          kind: (kind === "GOAL_CONTRIBUTION" ? "EXPENSE" : kind) as "INCOME" | "EXPENSE",
          category_id: matchedCat?.id,
          category_name: catName,
          day_of_month: fixedDay,
          frequency: "MONTHLY",
          icon: matchedCat?.icon || (type === "entrada" ? "payments" : type === "extra" ? "bolt" : type === "meta" ? "savings" : "receipt_long"),
          is_active: true,
          last_generated_month: targetEndMonth,
        });

        setToastMessage(`Lançamento fixo criado para ${monthsToReplicate.length} meses (${formatMonthSummary(monthsToReplicate)})!`);
      } else {
        // Single transaction
        const txDate = selectedDate || `${selectedMonth}-01`;
        const txMonth = txDate.slice(0, 7);

        await addTransaction({
          kind,
          nature,
          description: description.trim(),
          amount: rawNum,
          date: txDate,
          competence_month: txMonth,
          status: "SETTLED",
          category_id: matchedCat?.id,
          category_name: catName,
        });

        if (wasFixed) {
          await addRecurringRule({
            description: description.trim(),
            amount: rawNum,
            kind: (kind === "GOAL_CONTRIBUTION" ? "EXPENSE" : kind) as "INCOME" | "EXPENSE",
            category_id: matchedCat?.id,
            category_name: catName,
            day_of_month: fixedDay,
            frequency: "MONTHLY",
            icon: matchedCat?.icon || (type === "entrada" ? "payments" : type === "extra" ? "bolt" : type === "meta" ? "savings" : "receipt_long"),
            is_active: true,
            last_generated_month: txMonth,
          });
        }

        setToastMessage(`Lançamento salvo${wasFixed ? " + regra mensal criada" : ""}!`);
      }

      setShowToast(true);
      setTimeout(() => setShowToast(false), 2800);

      setAmount("");
      setDescription("");
      setCategory("");
      setIsFixed(false);

      if (!andAnother) {
        onClose();
      }
    } catch (e) {
      console.error(e);
      alert("Erro ao salvar lançamento.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const cfg = typeConfig[type];
  const canBeFixed = true;

  // Format display of current selected date's competence
  const dateCompetenceDisplay = selectedDate
    ? `${selectedDate.split("-")[1]}/${selectedDate.split("-")[0]}`
    : monthLabel;

  return (
    <Portal>
      <div className="fixed inset-0 z-[999] flex items-end sm:items-center justify-center p-0 sm:p-4">
        {/* Scrim */}
        <div
          className="fixed inset-0 bg-black/75 backdrop-blur-md"
          onClick={onClose}
        />

        {/* Modal */}
        <div className="relative z-10 w-full sm:max-w-lg bg-surface-card rounded-t-3xl sm:rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up">
          {/* Handle bar (mobile) */}
          <div className="flex justify-center pt-3 sm:hidden">
            <div className="w-10 h-1 rounded-full bg-surface-container-high" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-space-lg pt-space-md pb-space-sm border-b border-[rgba(255,255,255,0.04)]">
            <div>
              <h2 className="text-headline-sm font-bold text-text-primary">Novo Lançamento</h2>
              <div className="flex items-center gap-1.5 mt-0.5 text-label-xs text-text-secondary">
                <span className="material-symbols-outlined text-[13px] text-income-emerald">calendar_month</span>
                <span>
                  Competência: <strong className="text-text-primary">{dateCompetenceDisplay}</strong>
                </span>
                {isFixed && canReplicateMultipleMonths && replicatePastMonths && (
                  <span className="ml-1 px-1.5 py-0.5 rounded bg-income-emerald/15 text-income-emerald border border-income-emerald/30 text-[10px] font-semibold">
                    {monthsToReplicate.length} meses ({replicationTarget === "year_end" ? `até Dez/${startYear}` : `até ${MONTH_NAMES_SHORT[parseInt(targetEndMonth.split("-")[1], 10) - 1]}`})
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-high text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {/* Type Selector */}
          <div className="px-space-lg pt-space-md pb-space-sm">
            <div className="flex items-center gap-space-xs p-space-2xs bg-surface-container-lowest rounded-xl">
              {(Object.keys(typeConfig) as TransactionType[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setType(t)}
                  className={`flex-1 flex items-center justify-center gap-space-2xs py-space-xs rounded-lg text-label-sm font-semibold transition-all cursor-pointer ${
                    type === t
                      ? `${typeConfig[t].bg} ${typeConfig[t].color} shadow-sm ring-1 ring-white/10`
                      : "text-text-muted hover:text-text-secondary"
                  }`}
                  type="button"
                >
                  <span className="material-symbols-outlined text-sm">{typeConfig[t].icon}</span>
                  <span className="hidden sm:inline">{typeConfig[t].label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Giant Amount Field */}
          <div className="px-space-lg py-space-md text-center">
            <div className="text-label-sm text-text-muted uppercase tracking-wider mb-space-xs">Valor do lançamento</div>
            <div className="flex items-center justify-center gap-space-xs">
              <span className={`text-headline-lg font-bold ${cfg.color}`}>R$</span>
              <input
                type="text"
                inputMode="numeric"
                placeholder="0,00"
                value={amount}
                onChange={handleAmountInput}
                autoFocus
                className={`text-display-currency font-extrabold bg-transparent text-center focus:outline-none w-64 ${cfg.color} placeholder:text-text-muted/30 tabular-nums`}
              />
            </div>
          </div>

          {/* Description Field */}
          <div className="px-space-lg pb-space-sm">
            <input
              type="text"
              placeholder="Descrição (ex: Salário, Aluguel, Mercado...)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.06)] rounded-xl px-space-md py-space-sm text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-income-emerald/30"
            />
          </div>

          {/* Category Chips */}
          <div className="px-space-lg pb-space-sm">
            <div className="text-label-sm text-text-muted mb-space-xs">Categoria</div>
            <div className="flex flex-wrap gap-space-xs max-h-24 overflow-y-auto">
              {availableCategories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-space-sm py-space-2xs rounded-lg text-label-sm font-semibold transition-all cursor-pointer ${
                    category === cat
                      ? `${cfg.bg} ${cfg.color} ring-1 ring-white/10`
                      : "bg-surface-container-lowest text-text-secondary hover:bg-surface-container"
                  }`}
                  type="button"
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Fixed / Recurring and Date Configuration */}
          <div className="px-space-lg pb-space-sm space-y-space-xs">
            {/* Fixed / Recurring toggle */}
            {canBeFixed && (
              <div>
                <button
                  type="button"
                  onClick={() => setIsFixed((v) => !v)}
                  className={`w-full flex items-center gap-space-sm px-space-md py-space-sm rounded-xl border transition-all cursor-pointer ${
                    isFixed
                      ? "bg-income-emerald/10 border-income-emerald/40 text-income-emerald"
                      : "bg-surface-container-lowest border-[rgba(255,255,255,0.06)] text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">
                    {isFixed ? "repeat_on" : "repeat"}
                  </span>
                  <div className="flex-1 text-left">
                    <span className="text-label-sm font-semibold block">
                      {isFixed ? "Lançamento Fixo Mensal ✓" : "Marcar como Fixo (Mensal)"}
                    </span>
                    <span className="text-label-xs text-text-muted">
                      {isFixed ? "Repete todo mês automaticamente" : "Salário, aluguel, assinaturas, contas fixas..."}
                    </span>
                  </div>
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                    isFixed ? "border-income-emerald bg-income-emerald" : "border-text-muted/40"
                  }`}>
                    {isFixed && <span className="material-symbols-outlined text-white" style={{ fontSize: "12px" }}>check</span>}
                  </div>
                </button>
              </div>
            )}

            {/* Date Selection: completely flexible for both fixed and normal transactions */}
            {isFixed ? (
              <div className="p-space-sm bg-surface-container-lowest/80 border border-income-emerald/25 rounded-xl space-y-space-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
                  <div>
                    <label className="text-label-xs font-semibold text-text-secondary block mb-1">
                      Data inicial / Início da fixação:
                    </label>
                    <input
                      type="date"
                      value={selectedDate}
                      onChange={(e) => handleDateChange(e.target.value)}
                      className="w-full bg-surface-container border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-xs text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                    />
                  </div>
                  <div>
                    <label className="text-label-xs font-semibold text-text-secondary block mb-1">
                      Repetir todo mês no dia:
                    </label>
                    <select
                      value={fixedDay}
                      onChange={(e) => handleFixedDayChange(parseInt(e.target.value, 10))}
                      className="w-full bg-surface-container border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-xs text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40 cursor-pointer"
                    >
                      {DAY_OPTIONS.map((d) => (
                        <option key={d} value={d}>
                          Todo dia {d} de cada mês
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Multi-month replication banner */}
                {canReplicateMultipleMonths && (
                  <div className="mt-space-xs p-space-sm bg-income-emerald/10 border border-income-emerald/30 rounded-xl space-y-space-xs">
                    <div className="flex items-start gap-space-sm select-none">
                      <input
                        type="checkbox"
                        id="replicate-months-checkbox"
                        checked={replicatePastMonths}
                        onChange={(e) => setReplicatePastMonths(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-income-emerald focus:ring-income-emerald/40 bg-surface-container-lowest border-white/20 cursor-pointer"
                      />
                      <label htmlFor="replicate-months-checkbox" className="flex-1 cursor-pointer">
                        <span className="text-label-sm font-semibold text-text-primary block">
                          Replicar para todos os meses ({monthsToReplicate.length} meses)
                        </span>
                        <span className="text-label-xs text-text-secondary block mt-0.5">
                          {replicatePastMonths
                            ? `Será lançado de ${formatMonthSummary(monthsToReplicate)} (todo dia ${fixedDay}).`
                            : "Será lançado somente no mês inicial selecionado."}
                        </span>
                      </label>
                    </div>

                    {replicatePastMonths && (
                      <div className="pt-space-2xs border-t border-income-emerald/20 flex flex-wrap items-center gap-space-xs text-label-xs">
                        <span className="text-text-muted">Replicar até:</span>
                        <button
                          type="button"
                          onClick={() => setReplicationTarget("year_end")}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                            replicationTarget === "year_end"
                              ? "bg-income-emerald text-white shadow-sm ring-1 ring-white/10"
                              : "bg-surface-container-high text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          Final do ano (Dez/{startYear})
                        </button>
                        <button
                          type="button"
                          onClick={() => setReplicationTarget("current_month")}
                          className={`px-2.5 py-1 rounded-lg font-semibold transition-all cursor-pointer ${
                            replicationTarget === "current_month"
                              ? "bg-income-emerald text-white shadow-sm ring-1 ring-white/10"
                              : "bg-surface-container-high text-text-secondary hover:text-text-primary"
                          }`}
                        >
                          Mês atual ({MONTH_NAMES_SHORT[parseInt(currentCalendarMonth.split("-")[1], 10) - 1]}/{currentCalendarMonth.split("-")[0]})
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <div className="flex items-center gap-space-xs mb-space-xs">
                  {[
                    { key: "hoje" as const,  label: isCurrentMonth ? "Hoje" : "Início (Dia 1)" },
                    { key: "ontem" as const, label: isCurrentMonth ? "Ontem" : "Meio (Dia 15)" },
                    { key: "outra" as const, label: "Outra data" },
                  ].map(({ key, label }) => (
                    <button
                      key={key}
                      onClick={() => handleShortcutClick(key)}
                      className={`flex-1 py-space-xs rounded-xl text-label-sm font-semibold transition-all cursor-pointer ${
                        dateShortcut === key
                          ? "bg-surface-container-high text-text-primary font-bold shadow-sm ring-1 ring-white/10"
                          : "bg-surface-container-lowest text-text-muted hover:bg-surface-container"
                      }`}
                      type="button"
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div>
                  <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => handleDateChange(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.06)] rounded-xl px-space-md py-space-xs text-body-md text-text-primary focus:outline-none focus:ring-2 focus:ring-income-emerald/30"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="px-space-lg pt-space-xs pb-space-lg flex items-center gap-space-sm border-t border-[rgba(255,255,255,0.05)]">
            <button
              onClick={() => handleSave(true)}
              disabled={isSubmitting}
              className="flex-1 py-space-sm rounded-xl bg-surface-card-elevated hover:bg-surface-container-high text-text-primary text-headline-sm font-semibold transition-all disabled:opacity-50 cursor-pointer"
              type="button"
            >
              Salvar e Outro
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={isSubmitting}
              className={`flex-1 py-space-sm rounded-xl text-white text-headline-sm font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer ${
                type === "entrada" ? "bg-income-emerald hover:bg-income-emerald-hover shadow-glow" :
                type === "extra"   ? "bg-extra-violet hover:bg-extra-violet-hover shadow-glow-violet" :
                type === "gasto"   ? "bg-expense-rose hover:bg-expense-rose-hover" :
                "bg-goal-sky hover:bg-goal-sky/80 shadow-glow-sky"
              }`}
              type="button"
            >
              {isSubmitting ? "Salvando..." : "Salvar Lançamento"}
            </button>
          </div>
        </div>

        {/* Toast */}
        {showToast && (
          <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-space-sm bg-surface-card-elevated rounded-2xl px-space-lg py-space-sm shadow-card border border-income-emerald/40 animate-fade-in-up">
            <span className="material-symbols-outlined text-income-emerald text-base">check_circle</span>
            <span className="text-body-md text-text-primary font-semibold">
              {toastMessage}
            </span>
          </div>
        )}
      </div>
    </Portal>
  );
}
