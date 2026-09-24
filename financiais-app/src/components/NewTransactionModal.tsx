"use client";

import { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { TransactionKind, TransactionNature } from "@/types/finance";

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

type TransactionType = "entrada" | "extra" | "gasto" | "meta";

const categories = {
  entrada: ["Salário", "Freelance", "Rendimentos", "Outros"],
  extra: ["Freelance", "Venda", "Bônus", "Rendimentos", "Outros"],
  gasto: ["Alimentação", "Moradia", "Transporte", "Saúde", "Lazer", "Assinaturas", "Educação", "Utilidades", "Outros"],
  meta: ["Reserva de Emergência", "Viagem", "Equipamento", "Investimento", "Outros"],
};

const typeConfig = {
  entrada: { label: "Entrada", color: "text-income-emerald", bg: "bg-income-emerald/15", border: "border-income-emerald/50", icon: "arrow_downward_alt" },
  extra: { label: "Entrada Extra", color: "text-extra-violet", bg: "bg-extra-violet/15", border: "border-extra-violet/50", icon: "bolt" },
  gasto: { label: "Gasto", color: "text-expense-rose", bg: "bg-expense-rose/15", border: "border-expense-rose/50", icon: "arrow_upward_alt" },
  meta: { label: "Meta/Reserva", color: "text-goal-sky", bg: "bg-goal-sky/15", border: "border-goal-sky/50", icon: "savings" },
};

export default function NewTransactionModal({ isOpen, onClose }: NewTransactionModalProps) {
  const { addTransaction } = useFinance();
  const [type, setType] = useState<TransactionType>("gasto");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [dateShortcut, setDateShortcut] = useState<"hoje" | "ontem" | "outra">("hoje");
  const [customDate, setCustomDate] = useState(new Date().toISOString().slice(0, 10));
  const [showToast, setShowToast] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleAmountInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, "");
    const num = parseInt(raw || "0") / 100;
    setAmount(raw ? num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "");
  };

  const computeDate = (): string => {
    if (dateShortcut === "hoje") return new Date().toISOString().slice(0, 10);
    if (dateShortcut === "ontem") {
      const d = new Date();
      d.setDate(d.getDate() - 1);
      return d.toISOString().slice(0, 10);
    }
    return customDate;
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

    let kind: TransactionKind = "EXPENSE";
    let nature: TransactionNature = "VARIABLE";

    if (type === "entrada") {
      kind = "INCOME";
      nature = "FIXED";
    } else if (type === "extra") {
      kind = "INCOME";
      nature = "EXTRA";
    } else if (type === "gasto") {
      kind = "EXPENSE";
      nature = "VARIABLE";
    } else if (type === "meta") {
      kind = "GOAL_CONTRIBUTION";
      nature = "VARIABLE";
    }

    const txDate = computeDate();

    try {
      await addTransaction({
        kind,
        nature,
        description: description.trim(),
        amount: rawNum,
        date: txDate,
        competence_month: txDate.slice(0, 7),
        status: "SETTLED",
        category_name: category || (type === "meta" ? "Metas e Reservas" : "Geral"),
      });

      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);

      setAmount("");
      setDescription("");
      setCategory("");

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

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      {/* Scrim */}
      <div
        className="absolute inset-0 bg-[rgba(7,10,16,0.75)] backdrop-blur-sm"
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
          <h2 className="text-headline-sm font-bold text-text-primary">Novo Lançamento</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-high text-text-secondary hover:text-text-primary transition-colors" type="button">
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
                className={`flex-1 flex items-center justify-center gap-space-2xs py-space-xs rounded-lg text-label-sm font-semibold transition-all ${
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
            placeholder="Descrição (ex: Aluguel, Mercado, Freelance...)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.06)] rounded-xl px-space-md py-space-sm text-body-md text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-income-emerald/30"
          />
        </div>

        {/* Category Chips */}
        <div className="px-space-lg pb-space-sm">
          <div className="text-label-sm text-text-muted mb-space-xs">Categoria</div>
          <div className="flex flex-wrap gap-space-xs max-h-24 overflow-y-auto">
            {categories[type].map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`px-space-sm py-space-2xs rounded-lg text-label-sm font-semibold transition-all ${
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

        {/* Date Shortcuts */}
        <div className="px-space-lg pb-space-md">
          <div className="flex items-center gap-space-xs">
            {[
              { key: "hoje" as const, label: "Hoje" },
              { key: "ontem" as const, label: "Ontem" },
              { key: "outra" as const, label: "Data específica" },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDateShortcut(key)}
                className={`flex-1 py-space-xs rounded-xl text-label-sm font-semibold transition-all ${
                  dateShortcut === key
                    ? "bg-surface-container-high text-text-primary font-bold shadow-sm"
                    : "bg-surface-container-lowest text-text-muted hover:bg-surface-container"
                }`}
                type="button"
              >
                {label}
              </button>
            ))}
          </div>
          {dateShortcut === "outra" && (
            <input
              type="date"
              value={customDate}
              onChange={(e) => setCustomDate(e.target.value)}
              className="mt-space-xs w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.06)] rounded-xl px-space-md py-space-xs text-body-md text-text-primary focus:outline-none"
            />
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-space-lg pt-space-xs pb-space-lg flex items-center gap-space-sm border-t border-[rgba(255,255,255,0.05)]">
          <button
            onClick={() => handleSave(true)}
            disabled={isSubmitting}
            className="flex-1 py-space-sm rounded-xl bg-surface-card-elevated hover:bg-surface-container-high text-text-primary text-headline-sm font-semibold transition-all disabled:opacity-50"
            type="button"
          >
            Salvar e Outro
          </button>
          <button
            onClick={() => handleSave(false)}
            disabled={isSubmitting}
            className={`flex-1 py-space-sm rounded-xl text-white text-headline-sm font-semibold transition-all active:scale-95 disabled:opacity-50 ${
              type === "entrada" ? "bg-income-emerald hover:bg-income-emerald-hover shadow-glow" :
              type === "extra" ? "bg-extra-violet hover:bg-extra-violet-hover shadow-glow-violet" :
              type === "gasto" ? "bg-expense-rose hover:bg-expense-rose-hover" :
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
        <div className="fixed bottom-24 sm:bottom-8 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-space-sm bg-surface-card-elevated rounded-2xl px-space-lg py-space-sm shadow-card border border-income-emerald/40 animate-fade-in-up">
          <span className="material-symbols-outlined text-income-emerald text-base">check_circle</span>
          <span className="text-body-md text-text-primary font-semibold">Lançamento salvo com sucesso!</span>
        </div>
      )}
    </div>
  );
}
