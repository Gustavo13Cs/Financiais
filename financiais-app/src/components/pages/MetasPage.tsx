"use client";

import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Goal } from "@/types/finance";
import Portal from "@/components/Portal";

export default function MetasPage() {
  const { goals, contributeToGoal, addGoal, editGoal, deleteGoal, isLoading } = useFinance();
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);
  const [depositAmount, setDepositAmount] = useState("");
  const [isDepositModalOpen, setIsDepositModalOpen] = useState(false);

  // New Goal modal
  const [isNewGoalModalOpen, setIsNewGoalModalOpen] = useState(false);
  const [newGoalName, setNewGoalName] = useState("");
  const [newGoalTarget, setNewGoalTarget] = useState("");
  const [newGoalCurrent, setNewGoalCurrent] = useState("");
  const [newGoalIcon, setNewGoalIcon] = useState("shield");
  const [newGoalColor, setNewGoalColor] = useState("#10B981");

  // Edit Goal modal
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [editName, setEditName] = useState("");
  const [editTarget, setEditTarget] = useState("");
  const [editCurrent, setEditCurrent] = useState("");
  const [editIcon, setEditIcon] = useState("shield");
  const [editColor, setEditColor] = useState("#10B981");

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const totalCurrent = goals.reduce((s, g) => s + Number(g.current_amount || 0), 0);
  const totalTarget = goals.reduce((s, g) => s + Number(g.target_amount || 0), 0);
  const globalPct = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;

  const handleOpenDeposit = (goal: Goal) => {
    setSelectedGoal(goal);
    setDepositAmount("");
    setIsDepositModalOpen(true);
  };

  const handleConfirmDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoal) return;
    const num = parseFloat(depositAmount.replace(",", "."));
    if (isNaN(num) || num <= 0) {
      alert("Por favor, informe um valor válido para o aporte.");
      return;
    }

    await contributeToGoal(selectedGoal.id, num);
    setIsDepositModalOpen(false);
  };

  const handleCreateGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseFloat(newGoalTarget.replace(",", "."));
    const current = newGoalCurrent ? parseFloat(newGoalCurrent.replace(",", ".")) : 0;
    if (!newGoalName.trim() || isNaN(target) || target <= 0) {
      alert("Informe um nome e valor alvo válidos.");
      return;
    }

    await addGoal({
      name: newGoalName.trim(),
      target_amount: target,
      current_amount: current,
      icon: newGoalIcon,
      color: newGoalColor,
    });

    setNewGoalName("");
    setNewGoalTarget("");
    setNewGoalCurrent("");
    setIsNewGoalModalOpen(false);
  };

  const handleOpenEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setEditName(goal.name);
    setEditTarget(String(goal.target_amount));
    setEditCurrent(String(goal.current_amount));
    setEditIcon(goal.icon || "shield");
    setEditColor(goal.color || "#10B981");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGoal) return;
    const target = parseFloat(editTarget.replace(",", "."));
    const current = editCurrent ? parseFloat(editCurrent.replace(",", ".")) : 0;
    if (!editName.trim() || isNaN(target) || target <= 0) {
      alert("Informe um nome e valor alvo válidos.");
      return;
    }

    await editGoal(editingGoal.id, {
      name: editName.trim(),
      target_amount: target,
      current_amount: current,
      icon: editIcon,
      color: editColor,
    });

    setEditingGoal(null);
  };

  const handleDeleteGoal = async (id: string, name: string) => {
    if (window.confirm(`Tem certeza que deseja excluir a meta "${name}"?`)) {
      await deleteGoal(id);
    }
  };

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <div className="flex items-center gap-space-xs text-label-sm text-text-secondary uppercase tracking-wider mb-space-2xs">
            <span className="px-space-xs py-space-2xs bg-goal-sky/15 text-goal-sky rounded text-label-sm uppercase tracking-wider font-semibold">Planejamento</span>
            <span className="text-text-muted">•</span>
            <span>Metas e Reservas</span>
          </div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">Metas e Reservas Financeiras</h1>
          <p className="text-body-md text-text-secondary mt-space-2xs">
            Acompanhe o progresso dos seus objetivos, faça aportes e simule prazos em tempo real.
          </p>
        </div>
        <button
          onClick={() => setIsNewGoalModalOpen(true)}
          className="flex items-center gap-space-xs px-space-md py-space-sm bg-income-emerald hover:bg-income-emerald-hover text-white rounded-2xl text-label-md font-semibold transition-all shadow-glow active:scale-95 self-start md:self-auto cursor-pointer"
          type="button"
        >
          <span className="material-symbols-outlined text-base">add</span>
          Nova Meta
        </button>
      </div>

      {/* Global Overview Card */}
      <div className="rounded-2xl bg-gradient-to-r from-surface-card to-surface-card-elevated p-space-lg shadow-card border border-[rgba(255,255,255,0.06)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-full bg-goal-sky/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-lg relative z-10">
          <div>
            <span className="text-label-md text-text-secondary uppercase tracking-wider font-semibold">Total Guardado em Reservas</span>
            <div className="text-display-currency font-extrabold text-goal-sky tracking-tight tabular-nums mt-space-xs">
              {fmt(totalCurrent)}
            </div>
            <div className="flex items-center gap-space-sm mt-space-xs text-body-md text-text-secondary">
              <span>Alvo combinado: <strong className="text-text-primary">{fmt(totalTarget)}</strong></span>
              <span>•</span>
              <span className="text-income-emerald font-semibold">{Math.round(globalPct)}% concluído</span>
            </div>
          </div>
          <div className="w-full lg:w-96 flex flex-col gap-space-xs">
            <div className="flex justify-between text-label-sm font-semibold">
              <span className="text-text-secondary">Progresso Global</span>
              <span className="text-goal-sky tabular-nums">{Math.round(globalPct)}%</span>
            </div>
            <div className="w-full bg-surface-container-high rounded-full h-3 overflow-hidden">
              <div
                className="bg-gradient-to-r from-goal-sky to-income-emerald h-full rounded-full transition-all duration-1000"
                style={{ width: `${Math.min(globalPct, 100)}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Goal Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {isLoading ? (
          <div className="col-span-full py-16 text-center text-text-muted">Carregando metas...</div>
        ) : goals.length === 0 ? (
          <div className="col-span-full rounded-2xl bg-surface-card p-12 text-center border border-[rgba(255,255,255,0.06)] flex flex-col items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-goal-sky/10 text-goal-sky flex items-center justify-center mb-4">
              <span className="material-symbols-outlined text-3xl">savings</span>
            </div>
            <h3 className="text-headline-sm font-bold text-text-primary mb-2">Nenhuma meta ou reserva ativa</h3>
            <p className="text-body-md text-text-secondary max-w-md mb-6">
              Defina metas para sua reserva de emergência, viagens ou compras planejadas e acompanhe seus aportes em tempo real.
            </p>
            <button
              onClick={() => setIsNewGoalModalOpen(true)}
              className="flex items-center gap-space-xs px-space-lg py-space-sm bg-income-emerald hover:bg-income-emerald-hover text-white rounded-2xl text-label-md font-semibold transition-all shadow-glow cursor-pointer"
            >
              <span className="material-symbols-outlined text-base">add</span>
              Criar Primeira Meta
            </button>
          </div>
        ) : (
          goals.map((goal) => {
            const current = Number(goal.current_amount || 0);
            const target = Number(goal.target_amount || 0);
            const pct = target > 0 ? Math.min((current / target) * 100, 100) : 0;
            const remaining = Math.max(target - current, 0);

            const radius = 54;
            const circumference = 2 * Math.PI * radius;
            const offset = circumference - (pct / 100) * circumference;

            return (
              <div key={goal.id} className="rounded-2xl bg-surface-card p-space-lg shadow-card border border-[rgba(255,255,255,0.06)] hover:-translate-y-0.5 transition-all relative overflow-hidden group">
                <div className="flex items-start justify-between mb-space-md relative z-10">
                  <div className="flex items-center gap-space-md">
                    {/* Circular progress */}
                    <div className="relative w-20 h-20 shrink-0">
                      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 120 120">
                        <circle cx="60" cy="60" r="54" fill="transparent" stroke="#1c2028" strokeWidth="8" />
                        <circle
                          cx="60" cy="60" r="54"
                          fill="transparent"
                          stroke={goal.color || "#10B981"}
                          strokeWidth="8"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={offset}
                          style={{ transition: "stroke-dashoffset 1s ease" }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-label-sm font-bold tabular-nums" style={{ color: goal.color }}>
                          {Math.round(pct)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="flex items-center gap-space-xs mb-space-2xs">
                        <span className="material-symbols-outlined text-base" style={{ color: goal.color }}>{goal.icon || "savings"}</span>
                        <span className="text-label-sm font-bold uppercase tracking-wider" style={{ color: goal.color }}>Meta</span>
                      </div>
                      <h3 className="text-headline-sm font-bold text-text-primary">{goal.name}</h3>
                      <p className="text-label-sm text-text-secondary mt-space-2xs">
                        Faltam {fmt(remaining)} para atingir o objetivo
                      </p>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete */}
                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEdit(goal)}
                      title="Editar meta"
                      className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-container transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">edit</span>
                    </button>
                    <button
                      onClick={() => handleDeleteGoal(goal.id, goal.name)}
                      title="Excluir meta"
                      className="p-1.5 rounded-lg text-text-muted hover:text-expense-rose hover:bg-expense-rose/10 transition-colors cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-sm">delete</span>
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="relative z-10 mb-space-md">
                  <div className="flex items-center justify-between mb-space-xs">
                    <span className="text-display-currency-mobile font-extrabold tabular-nums" style={{ color: goal.color }}>
                      {fmt(current)}
                    </span>
                    <span className="text-label-md text-text-muted font-semibold tabular-nums">/ {fmt(target)}</span>
                  </div>
                  <div className="w-full bg-surface-container-high rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-1000"
                      style={{ width: `${pct}%`, backgroundColor: goal.color }}
                    />
                  </div>
                </div>

                {/* Footer action */}
                <div className="flex items-center justify-between gap-space-sm relative z-10 pt-space-xs border-t border-[rgba(255,255,255,0.04)]">
                  <div className="text-label-sm text-text-muted">
                    {pct >= 100 ? "🎉 Meta concluída!" : `Falta ${fmt(remaining)}`}
                  </div>
                  <button
                    onClick={() => handleOpenDeposit(goal)}
                    className="flex items-center gap-space-xs px-space-md py-space-xs rounded-xl text-label-md font-semibold text-white transition-all active:scale-95 shadow-sm cursor-pointer"
                    style={{ backgroundColor: goal.color }}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-sm">add</span>
                    Aportar
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Deposit Modal */}
      {isDepositModalOpen && selectedGoal && (
        <Portal>
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setIsDepositModalOpen(false)} />
            <div className="relative z-10 w-full max-w-sm bg-surface-card rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up p-space-lg">
              <h3 className="text-headline-sm font-bold text-text-primary mb-1">Aportar em {selectedGoal.name}</h3>
              <p className="text-label-sm text-text-muted mb-space-md">O valor será creditado na meta e registrado no seu histórico.</p>
              <form onSubmit={handleConfirmDeposit} className="space-y-space-md">
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">Valor do Aporte (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={depositAmount}
                    onChange={(e) => setDepositAmount(e.target.value)}
                    autoFocus
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                  />
                </div>
                <div className="flex justify-end gap-space-xs">
                  <button type="button" onClick={() => setIsDepositModalOpen(false)} className="px-space-md py-space-xs rounded-xl text-text-secondary hover:text-text-primary text-label-md cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="px-space-lg py-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white rounded-xl text-label-md font-semibold shadow-glow cursor-pointer">
                    Confirmar Aporte
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* New Goal Modal */}
      {isNewGoalModalOpen && (
        <Portal>
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setIsNewGoalModalOpen(false)} />
            <div className="relative z-10 w-full max-w-md bg-surface-card rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up p-space-lg">
              <h3 className="text-headline-sm font-bold text-text-primary mb-1">Nova Meta Financeira</h3>
              <p className="text-label-sm text-text-muted mb-space-md">Defina um objetivo, prazo e valor alvo.</p>
              <form onSubmit={handleCreateGoal} className="space-y-space-md">
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">Nome do Objetivo</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Viagem Japão, Reserva de Emergência..."
                    value={newGoalName}
                    onChange={(e) => setNewGoalName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-space-md">
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Valor Alvo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="10000"
                      value={newGoalTarget}
                      onChange={(e) => setNewGoalTarget(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/30"
                    />
                  </div>
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Já Guardado (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0"
                      value={newGoalCurrent}
                      onChange={(e) => setNewGoalCurrent(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-space-md">
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Ícone</label>
                    <select
                      value={newGoalIcon}
                      onChange={(e) => setNewGoalIcon(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none"
                    >
                      <option value="shield">Escudo (shield)</option>
                      <option value="flight_takeoff">Viagem (flight)</option>
                      <option value="laptop">Eletrônico (laptop)</option>
                      <option value="home">Casa (home)</option>
                      <option value="directions_car">Carro (car)</option>
                      <option value="savings">Cofrinho (savings)</option>
                      <option value="trending_up">Investimentos (invest)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Cor</label>
                    <select
                      value={newGoalColor}
                      onChange={(e) => setNewGoalColor(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none"
                    >
                      <option value="#10B981">Verde Esmeralda</option>
                      <option value="#0EA5E9">Azul Sky</option>
                      <option value="#8B5CF6">Roxo Violeta</option>
                      <option value="#F59E0B">Âmbar</option>
                      <option value="#F43F5E">Rosa Escuro</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-space-xs pt-space-xs">
                  <button type="button" onClick={() => setIsNewGoalModalOpen(false)} className="px-space-md py-space-xs rounded-xl text-text-secondary hover:text-text-primary text-label-md cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="px-space-lg py-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white rounded-xl text-label-md font-semibold shadow-glow cursor-pointer">
                    Salvar Meta
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}

      {/* Edit Goal Modal */}
      {editingGoal && (
        <Portal>
          <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/75 backdrop-blur-md" onClick={() => setEditingGoal(null)} />
            <div className="relative z-10 w-full max-w-md bg-surface-card rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up p-space-lg">
              <h3 className="text-headline-sm font-bold text-text-primary mb-1">Editar Meta Financeira</h3>
              <p className="text-label-sm text-text-muted mb-space-md">Atualize os valores ou detalhes do objetivo.</p>
              <form onSubmit={handleSaveEdit} className="space-y-space-md">
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">Nome do Objetivo</label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-goal-sky/30"
                  />
                </div>
                <div className="grid grid-cols-2 gap-space-md">
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Valor Alvo (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={editTarget}
                      onChange={(e) => setEditTarget(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-goal-sky/30"
                    />
                  </div>
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Guardado Atual (R$)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={editCurrent}
                      onChange={(e) => setEditCurrent(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-goal-sky/30"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-space-md">
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Ícone</label>
                    <select
                      value={editIcon}
                      onChange={(e) => setEditIcon(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none"
                    >
                      <option value="shield">Escudo (shield)</option>
                      <option value="flight_takeoff">Viagem (flight)</option>
                      <option value="laptop">Eletrônico (laptop)</option>
                      <option value="home">Casa (home)</option>
                      <option value="directions_car">Carro (car)</option>
                      <option value="savings">Cofrinho (savings)</option>
                      <option value="trending_up">Investimentos (invest)</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-label-sm font-semibold text-text-secondary block mb-1">Cor</label>
                    <select
                      value={editColor}
                      onChange={(e) => setEditColor(e.target.value)}
                      className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none"
                    >
                      <option value="#10B981">Verde Esmeralda</option>
                      <option value="#0EA5E9">Azul Sky</option>
                      <option value="#8B5CF6">Roxo Violeta</option>
                      <option value="#F59E0B">Âmbar</option>
                      <option value="#F43F5E">Rosa Escuro</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-space-xs pt-space-xs">
                  <button type="button" onClick={() => setEditingGoal(null)} className="px-space-md py-space-xs rounded-xl text-text-secondary hover:text-text-primary text-label-md cursor-pointer">
                    Cancelar
                  </button>
                  <button type="submit" className="px-space-lg py-space-xs bg-goal-sky hover:bg-goal-sky-hover text-white rounded-xl text-label-md font-semibold shadow-glow cursor-pointer">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            </div>
          </div>
        </Portal>
      )}
    </div>
  );
}
