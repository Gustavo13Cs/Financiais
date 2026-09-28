"use client";

import { useState, useEffect, useMemo } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Transaction, TransactionKind, TransactionNature, TransactionStatus } from "@/types/finance";
import Portal from "@/components/Portal";

interface EditTransactionModalProps {
  transaction: Transaction | null;
  isOpen: boolean;
  onClose: () => void;
}

type ModalType = "entrada" | "extra" | "gasto" | "meta";

const defaultCategories: Record<ModalType, string[]> = {
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

export default function EditTransactionModal({ transaction, isOpen, onClose }: EditTransactionModalProps) {
  const { editTransaction, categories: financeCategories, goals } = useFinance();

  const [type, setType] = useState<ModalType>("gasto");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [category, setCategory] = useState("");
  const [nature, setNature] = useState<TransactionNature>("VARIABLE");
  const [status, setStatus] = useState<TransactionStatus>("SETTLED");
  const [notes, setNotes] = useState("");
  const [selectedGoalId, setSelectedGoalId] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync state with selected transaction
  useEffect(() => {
    if (transaction && isOpen) {
      setDescription(transaction.description || "");
      setAmount(String(transaction.amount || ""));
      setDate(transaction.date || new Date().toISOString().slice(0, 10));
      setCategory(transaction.category_name || "");
      setNature(transaction.nature || "VARIABLE");
      setStatus(transaction.status || "SETTLED");
      setNotes(transaction.notes || "");
      setSelectedGoalId(transaction.goal_id || "");

      if (transaction.kind === "GOAL_CONTRIBUTION") {
        setType("meta");
      } else if (transaction.nature === "EXTRA") {
        setType("extra");
      } else if (transaction.kind === "INCOME") {
        setType("entrada");
      } else {
        setType("gasto");
      }
    }
  }, [transaction, isOpen]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  const availableCategories = useMemo(() => {
    const predefined = defaultCategories[type] || [];
    const custom = financeCategories
      .filter((c) => {
        if (type === "entrada" || type === "extra") return c.kind === "INCOME";
        return c.kind === "EXPENSE";
      })
      .map((c) => c.name);
    return Array.from(new Set([...predefined, ...custom]));
  }, [type, financeCategories]);

  if (!isOpen || !transaction) return null;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = e.target.value.replace(/\D/g, "");
    if (!val) {
      setAmount("");
      return;
    }
    const num = parseFloat(val) / 100;
    setAmount(num.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) {
      alert("Por favor, informe a descrição do lançamento.");
      return;
    }

    const cleanAmount = parseFloat(amount.replace(/\./g, "").replace(",", "."));
    if (isNaN(cleanAmount) || cleanAmount <= 0) {
      alert("Por favor, informe um valor válido maior que zero.");
      return;
    }

    if (!date) {
      alert("Por favor, selecione uma data válida.");
      return;
    }

    setIsSubmitting(true);

    try {
      let kind: TransactionKind = "EXPENSE";
      let finalNature: TransactionNature = nature;

      if (type === "entrada") {
        kind = "INCOME";
        finalNature = nature === "EXTRA" ? "VARIABLE" : nature;
      } else if (type === "extra") {
        kind = "INCOME";
        finalNature = "EXTRA";
      } else if (type === "meta") {
        kind = "GOAL_CONTRIBUTION";
        finalNature = "VARIABLE";
      } else {
        kind = "EXPENSE";
        finalNature = nature === "EXTRA" ? "VARIABLE" : nature;
      }

      const competence_month = date.slice(0, 7);

      // Match category_id if available
      const matchedCat = financeCategories.find(
        (c) => c.name.toLowerCase() === category.trim().toLowerCase()
      );

      await editTransaction(transaction.id, {
        description: description.trim(),
        amount: cleanAmount,
        date,
        competence_month,
        kind,
        nature: finalNature,
        status,
        category_name: category.trim() || undefined,
        category_id: matchedCat?.id || undefined,
        goal_id: type === "meta" && selectedGoalId ? selectedGoalId : undefined,
        notes: notes.trim() || undefined,
      });

      setToastMessage("Lançamento atualizado com sucesso!");
      setTimeout(() => {
        setToastMessage(null);
        onClose();
      }, 700);
    } catch (err: any) {
      alert("Erro ao atualizar o lançamento: " + (err?.message || "Tente novamente."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
          onClick={onClose}
        />

        {/* Modal Window */}
        <div className="relative w-full max-w-xl bg-surface-card border border-[rgba(255,255,255,0.08)] rounded-3xl shadow-2xl p-6 sm:p-8 z-10 my-auto animate-scale-in">
          {/* Header */}
          <div className="flex items-center justify-between pb-5 border-b border-[rgba(255,255,255,0.06)]">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-xl">edit</span>
              </div>
              <div>
                <h3 className="text-headline-sm font-bold text-text-primary tracking-tight">Editar Lançamento</h3>
                <p className="text-label-sm text-text-muted">Altere valores, categorias e status do registro</p>
              </div>
            </div>
            <button
              onClick={onClose}
              type="button"
              className="w-8 h-8 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-surface-container transition-colors"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>
          </div>

          <form onSubmit={handleSave} className="space-y-5 pt-5">
            {/* Type selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(Object.keys(typeConfig) as ModalType[]).map((t) => {
                const cfg = typeConfig[t];
                const active = type === t;
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => {
                      setType(t);
                      if (t === "extra") setNature("EXTRA");
                      else if (nature === "EXTRA") setNature("VARIABLE");
                    }}
                    className={`flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-2xl border text-label-sm font-semibold transition-all ${
                      active
                        ? `${cfg.bg} ${cfg.border} ${cfg.color} shadow-sm scale-[1.02]`
                        : "bg-surface-container-lowest border-transparent text-text-secondary hover:text-text-primary hover:bg-surface-container"
                    }`}
                  >
                    <span className="material-symbols-outlined text-base">{cfg.icon}</span>
                    <span>{cfg.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Description & Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
              <div className="sm:col-span-7">
                <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                  Descrição <span className="text-expense-rose">*</span>
                </label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Ex: Mercado, Salário, Internet..."
                  className="w-full bg-surface-container-lowest text-text-primary px-4 py-2.5 rounded-xl text-body-md border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  required
                />
              </div>
              <div className="sm:col-span-5">
                <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                  Valor (R$) <span className="text-expense-rose">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted text-label-md font-semibold">
                    R$
                  </span>
                  <input
                    type="text"
                    value={amount}
                    onChange={handleAmountChange}
                    placeholder="0,00"
                    className="w-full bg-surface-container-lowest text-text-primary pl-10 pr-4 py-2.5 rounded-xl text-body-md font-bold tabular-nums border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Date & Nature / Goal Selection */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                  Data <span className="text-expense-rose">*</span>
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-surface-container-lowest text-text-primary px-4 py-2.5 rounded-xl text-body-md border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  required
                />
              </div>

              {type === "meta" ? (
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                    Meta Destino
                  </label>
                  <select
                    value={selectedGoalId}
                    onChange={(e) => setSelectedGoalId(e.target.value)}
                    className="w-full bg-surface-container-lowest text-text-primary px-4 py-2.5 rounded-xl text-body-md border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-primary/40"
                  >
                    <option value="">Selecione a meta...</option>
                    {goals.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              ) : type !== "extra" ? (
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                    Natureza
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNature("VARIABLE")}
                      className={`py-2 px-3 rounded-xl border text-label-sm font-medium transition-all ${
                        nature === "VARIABLE"
                          ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                          : "bg-surface-container-lowest border-transparent text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Variável
                    </button>
                    <button
                      type="button"
                      onClick={() => setNature("FIXED")}
                      className={`py-2 px-3 rounded-xl border text-label-sm font-medium transition-all ${
                        nature === "FIXED"
                          ? "bg-primary/15 border-primary/40 text-primary font-semibold"
                          : "bg-surface-container-lowest border-transparent text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      Fixo (Recorrente)
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                    Classificação
                  </label>
                  <div className="flex items-center gap-2 py-2 px-3 rounded-xl bg-extra-violet/10 border border-extra-violet/20 text-extra-violet text-label-sm font-semibold">
                    <span className="material-symbols-outlined text-sm">bolt</span>
                    <span>Entrada Extra Aceleradora</span>
                  </div>
                </div>
              )}
            </div>

            {/* Category */}
            <div>
              <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                Categoria
              </label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="Selecione abaixo ou digite..."
                className="w-full bg-surface-container-lowest text-text-primary px-4 py-2.5 rounded-xl text-body-md border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-primary/40 mb-2"
              />
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-1">
                {availableCategories.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className={`px-3 py-1 rounded-lg text-label-sm transition-all ${
                      category.toLowerCase() === c.toLowerCase()
                        ? "bg-primary text-on-primary font-semibold shadow-sm"
                        : "bg-surface-container-lowest text-text-secondary hover:text-text-primary hover:bg-surface-container"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            {/* Status */}
            <div>
              <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                Status da Operação
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setStatus("SETTLED")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-label-sm font-semibold transition-all ${
                    status === "SETTLED"
                      ? "bg-income-emerald/15 border-income-emerald/40 text-income-emerald shadow-sm"
                      : "bg-surface-container-lowest border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">check_circle</span>
                  <span>{type === "gasto" ? "Pago" : "Recebido"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setStatus("PENDING")}
                  className={`flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-label-sm font-semibold transition-all ${
                    status === "PENDING"
                      ? "bg-warning-amber/15 border-warning-amber/40 text-warning-amber shadow-sm"
                      : "bg-surface-container-lowest border-transparent text-text-secondary hover:text-text-primary"
                  }`}
                >
                  <span className="material-symbols-outlined text-base">schedule</span>
                  <span>Pendente</span>
                </button>
              </div>
            </div>

            {/* Notes */}
            <div>
              <label className="text-label-sm font-semibold text-text-secondary block mb-1.5">
                Observações (opcional)
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Parcela 2/3, nota fiscal, observações extras..."
                className="w-full bg-surface-container-lowest text-text-primary px-4 py-2 rounded-xl text-body-md border border-[rgba(255,255,255,0.06)] focus:outline-none focus:ring-2 focus:ring-primary/40"
              />
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-[rgba(255,255,255,0.06)]">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 rounded-xl text-label-md font-semibold text-text-secondary hover:text-text-primary hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center gap-2 bg-primary hover:bg-primary-hover text-on-primary px-6 py-2.5 rounded-xl text-label-md font-bold transition-all shadow-glow active:scale-95 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Salvando...</span>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-base">save</span>
                    <span>Salvar Alterações</span>
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Success Toast */}
          {toastMessage && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-income-emerald text-white text-label-md font-bold px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2 animate-fade-in-up">
              <span className="material-symbols-outlined text-base">check</span>
              <span>{toastMessage}</span>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
}
