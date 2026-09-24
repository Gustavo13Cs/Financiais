"use client";

import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";

export default function CategoriasPage() {
  const { categories, transactions, addCategory } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatKind, setNewCatKind] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [newCatIcon, setNewCatIcon] = useState("category");
  const [newCatColor, setNewCatColor] = useState("#10B981");
  const [newCatLimit, setNewCatLimit] = useState("");

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const expenseCats = categories.filter((c) => c.kind === "EXPENSE");
  const incomeCats = categories.filter((c) => c.kind === "INCOME");

  // Calculate actual spending per category from transactions
  const getCategorySpend = (catName: string): number => {
    return transactions
      .filter((t) => t.kind === "EXPENSE" && (t.category_name?.toLowerCase() === catName.toLowerCase() || t.description.toLowerCase().includes(catName.toLowerCase())))
      .reduce((s, t) => s + t.amount, 0);
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    await addCategory({
      name: newCatName.trim(),
      kind: newCatKind,
      icon: newCatIcon,
      color: newCatColor,
      monthly_limit: newCatLimit ? parseFloat(newCatLimit) : undefined,
    });

    setNewCatName("");
    setNewCatLimit("");
    setIsModalOpen(false);
  };

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">Categorias</h1>
          <p className="text-body-md text-text-secondary mt-space-2xs">Gerencie categorias conectadas ao banco Supabase com limites mensais.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-space-xs px-space-md py-space-sm bg-income-emerald hover:bg-income-emerald-hover text-white rounded-2xl text-label-md font-semibold transition-all shadow-glow active:scale-95 self-start md:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nova Categoria
        </button>
      </div>

      {/* Expense categories */}
      <div>
        <div className="flex items-center gap-space-sm mb-space-md">
          <span className="material-symbols-outlined text-expense-rose text-base">arrow_upward_alt</span>
          <h2 className="text-headline-sm font-semibold text-text-primary">Categorias de Despesas</h2>
          <span className="px-space-xs py-space-2xs rounded-full bg-expense-rose/10 text-expense-rose text-label-sm font-semibold">{expenseCats.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {expenseCats.map((cat) => {
            const spend = getCategorySpend(cat.name);
            const limit = cat.monthly_limit || 500;
            const pct = Math.min((spend / limit) * 100, 100);
            const warn = pct >= 80;
            return (
              <div key={cat.id} className="rounded-2xl bg-surface-card p-space-md shadow-card border border-[rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all group cursor-pointer">
                <div className="flex items-start justify-between mb-space-md">
                  <div className="flex items-center gap-space-sm">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}20` }}>
                      <span className="material-symbols-outlined text-base" style={{ color: cat.color }}>{cat.icon}</span>
                    </div>
                    <div>
                      <span className="text-body-md font-semibold text-text-primary block">{cat.name}</span>
                      <span className="text-label-sm text-text-muted">Limite: {fmt(limit)}</span>
                    </div>
                  </div>
                </div>
                <div className="text-kpi-value font-bold tabular-nums mb-space-xs" style={{ color: cat.color }}>{fmt(spend)}</div>
                <div className="w-full bg-surface-container-high rounded-full h-1.5 overflow-hidden mb-space-xs">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${warn ? "bg-warning-amber" : ""}`}
                    style={{ width: `${pct}%`, backgroundColor: warn ? undefined : cat.color }}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className={`text-label-sm font-semibold ${warn ? "text-warning-amber" : "text-text-muted"}`}>
                    {warn && <span className="material-symbols-outlined text-xs mr-0.5">warning</span>}
                    {Math.round(pct)}% do limite
                  </span>
                  <span className="text-label-sm text-text-muted tabular-nums">
                    {limit - spend >= 0 ? `Resta ${fmt(limit - spend)}` : `Estourado ${fmt(spend - limit)}`}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Income categories */}
      <div>
        <div className="flex items-center gap-space-sm mb-space-md">
          <span className="material-symbols-outlined text-income-emerald text-base">arrow_downward_alt</span>
          <h2 className="text-headline-sm font-semibold text-text-primary">Categorias de Entradas</h2>
          <span className="px-space-xs py-space-2xs rounded-full bg-income-emerald/10 text-income-emerald text-label-sm font-semibold">{incomeCats.length}</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
          {incomeCats.map((cat) => (
            <div key={cat.id} className="rounded-2xl bg-surface-card p-space-md shadow-card border border-[rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all group cursor-pointer flex items-center gap-space-md">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}20` }}>
                <span className="material-symbols-outlined text-base" style={{ color: cat.color }}>{cat.icon}</span>
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-body-md font-semibold text-text-primary block truncate">{cat.name}</span>
                <span className="text-label-sm text-income-emerald font-semibold">Entrada</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* New Category Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-[rgba(7,10,16,0.75)] backdrop-blur-sm" onClick={() => setIsModalOpen(false)} />
          <div className="relative z-10 w-full max-w-md bg-surface-card rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-headline-sm font-bold text-text-primary">Nova Categoria</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-high text-text-secondary hover:text-text-primary">
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>
            <form onSubmit={handleCreateCategory} className="p-space-lg space-y-space-md">
              <div>
                <label className="text-label-sm font-semibold text-text-secondary block mb-1">Nome</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Investimentos, Pet..."
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                />
              </div>
              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">Tipo</label>
                  <select
                    value={newCatKind}
                    onChange={(e) => setNewCatKind(e.target.value as any)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none"
                  >
                    <option value="EXPENSE">Despesa</option>
                    <option value="INCOME">Entrada</option>
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">Ícone</label>
                  <select
                    value={newCatIcon}
                    onChange={(e) => setNewCatIcon(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none"
                  >
                    <option value="category">Geral (category)</option>
                    <option value="pets">Pets (pets)</option>
                    <option value="flight">Viagem (flight)</option>
                    <option value="local_gas_station">Combustível</option>
                    <option value="fitness_center">Academia</option>
                    <option value="trending_up">Investimentos</option>
                    <option value="savings">Poupança</option>
                  </select>
                </div>
              </div>
              {newCatKind === "EXPENSE" && (
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">Limite Mensal (R$)</label>
                  <input
                    type="number"
                    placeholder="Ex: 500"
                    value={newCatLimit}
                    onChange={(e) => setNewCatLimit(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                  />
                </div>
              )}
              <div className="flex items-center justify-end gap-space-sm pt-space-sm">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-space-md py-space-xs rounded-xl text-text-secondary hover:text-text-primary text-label-md">
                  Cancelar
                </button>
                <button type="submit" className="px-space-lg py-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white rounded-xl text-label-md font-semibold shadow-glow">
                  Criar Categoria
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
