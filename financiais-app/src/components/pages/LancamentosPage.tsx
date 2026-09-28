"use client";

import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { Transaction } from "@/types/finance";
import NewTransactionModal from "@/components/NewTransactionModal";
import EditTransactionModal from "@/components/EditTransactionModal";
import ImportModal from "@/components/ImportModal";

const savedFilters = [
  { label: "Só Extras", icon: "bolt", type: "extra" },
  { label: "Gastos", icon: "arrow_upward_alt", type: "gasto" },
  { label: "Entradas", icon: "arrow_downward_alt", type: "entrada" },
  { label: "Pendentes", icon: "schedule", type: "pendente" },
];

export default function LancamentosPage() {
  const { transactions, deleteTransaction, isLoading } = useFinance();
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [selected, setSelected] = useState<string[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const filtered = transactions.filter((t) => {
    const desc = t.description.toLowerCase();
    const cat = (t.category_name || "").toLowerCase();
    const q = search.toLowerCase();
    const matchSearch = !search || desc.includes(q) || cat.includes(q);

    const matchFilter =
      !activeFilter ||
      (activeFilter === "extra" && t.nature === "EXTRA") ||
      (activeFilter === "gasto" && (t.kind === "EXPENSE" || t.kind === "GOAL_CONTRIBUTION")) ||
      (activeFilter === "entrada" && t.kind === "INCOME") ||
      (activeFilter === "pendente" && t.status === "PENDING");

    return matchSearch && matchFilter;
  });

  const toggleSelect = (id: string) => {
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);
  };

  const toggleAll = () => {
    setSelected((s) => s.length === filtered.length ? [] : filtered.map((t) => t.id));
  };

  const handleDeleteSelected = async () => {
    if (confirm(`Deseja excluir ${selected.length} lançamentos selecionados?`)) {
      for (const id of selected) {
        await deleteTransaction(id);
      }
      setSelected([]);
    }
  };

  const handleExportCSV = () => {
    if (transactions.length === 0) return;
    const headers = "ID;Data;Competencia;Descricao;Valor;Tipo;Natureza;Status;Categoria";
    const rows = filtered.map((t) =>
      [
        t.id,
        t.date,
        t.competence_month,
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
    link.setAttribute("download", `lancamentos_financeiros_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "—";
    if (dateStr.includes("/")) return dateStr;
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-lg">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-space-md">
        <div className="flex flex-col gap-space-2xs">
          <div className="flex items-center gap-space-xs">
            <span className="text-primary text-label-sm uppercase tracking-wider font-semibold">Livro Razão Analítico</span>
            <span className="text-text-muted text-label-sm">•</span>
            <span className="text-text-secondary text-label-sm">Exercício 2026</span>
          </div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">Lançamentos Financeiros</h1>
          <p className="text-body-md text-text-secondary max-w-2xl">
            Histórico consolidado com banco de dados Supabase em tempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-space-xs sm:gap-space-sm">
          <button
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-space-xs bg-surface-card hover:bg-surface-card-elevated text-goal-sky hover:text-goal-sky-hover px-space-md py-space-xs rounded-xl text-headline-sm font-semibold transition-all shadow-sm border border-[rgba(255,255,255,0.05)] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            <span className="hidden sm:inline">Importar OFX/CSV</span>
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-space-xs bg-surface-card hover:bg-surface-card-elevated text-text-secondary hover:text-text-primary px-space-md py-space-xs rounded-xl text-headline-sm font-semibold transition-all shadow-sm border border-[rgba(255,255,255,0.05)] cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">file_download</span>
            <span className="hidden md:inline">Exportar CSV</span>
          </button>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white px-space-md py-space-xs rounded-xl text-headline-sm font-semibold transition-all shadow-glow active:scale-95 cursor-pointer"
            type="button"
          >
            <span className="material-symbols-outlined text-base">add</span>
            <span>Novo</span>
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row gap-space-sm items-start sm:items-center">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-text-muted text-lg pointer-events-none">search</span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface-card text-text-primary pl-9 pr-space-sm py-space-xs rounded-xl text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/30 placeholder:text-text-muted border border-[rgba(255,255,255,0.05)]"
            placeholder="Buscar por descrição, categoria..."
            type="text"
          />
        </div>
        {/* Saved Filters */}
        <div className="flex items-center gap-space-xs flex-wrap">
          {savedFilters.map((f) => (
            <button
              key={f.type}
              onClick={() => setActiveFilter(activeFilter === f.type ? null : f.type)}
              className={`flex items-center gap-space-2xs px-space-md py-space-xs rounded-xl text-label-sm font-semibold transition-all ${
                activeFilter === f.type
                  ? "bg-primary text-on-primary shadow-glow-sm"
                  : "bg-surface-card text-text-secondary hover:bg-surface-card-elevated hover:text-text-primary border border-[rgba(255,255,255,0.05)]"
              }`}
              type="button"
            >
              <span className="material-symbols-outlined text-sm">{f.icon}</span>
              <span>{f.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Bulk action bar */}
      {selected.length > 0 && (
        <div className="flex items-center gap-space-sm px-space-md py-space-sm rounded-2xl bg-extra-violet/10 border border-extra-violet/20 animate-fade-in-up">
          <span className="text-label-md text-extra-violet font-semibold">{selected.length} selecionados</span>
          <button
            onClick={handleDeleteSelected}
            className="flex items-center gap-space-2xs text-label-sm text-expense-rose hover:text-expense-rose-hover font-semibold px-space-sm py-1 rounded-lg hover:bg-expense-rose/10 transition-colors ml-auto"
            type="button"
          >
            <span className="material-symbols-outlined text-sm">delete</span>
            Excluir selecionados
          </button>
        </div>
      )}

      {/* Table */}
      <div className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-surface-container-lowest text-text-secondary uppercase text-label-sm tracking-wider">
                <th className="py-space-sm px-space-lg w-10">
                  <input
                    type="checkbox"
                    checked={selected.length === filtered.length && filtered.length > 0}
                    onChange={toggleAll}
                    className="rounded bg-surface-container-high border-0 text-income-emerald focus:ring-income-emerald/30"
                  />
                </th>
                <th className="py-space-sm px-space-md font-semibold">Data</th>
                <th className="py-space-sm px-space-md font-semibold">Descrição</th>
                <th className="py-space-sm px-space-md font-semibold">Categoria</th>
                <th className="py-space-sm px-space-md font-semibold">Tipo</th>
                <th className="py-space-sm px-space-md font-semibold text-right">Valor</th>
                <th className="py-space-sm px-space-md font-semibold text-center">Status</th>
                <th className="py-space-sm px-space-lg font-semibold text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Carregando lançamentos...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-text-muted">
                    Nenhum lançamento encontrado para os filtros selecionados.
                  </td>
                </tr>
              ) : (
                filtered.map((t, i) => {
                  const isExtra = t.nature === "EXTRA";
                  const isExpense = t.kind === "EXPENSE";
                  const isSelected = selected.includes(t.id);
                  return (
                    <tr
                      key={t.id}
                      className={`h-11 transition-colors group ${
                        isSelected ? "bg-extra-violet/5" :
                        i % 2 === 0 ? "bg-surface-card" : "bg-surface-table-row-alt"
                      } hover:bg-surface-card-elevated/70 ${isExtra ? "extra-row-indicator" : ""}`}
                    >
                      <td className="py-space-sm px-space-lg">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(t.id)}
                          className="rounded bg-surface-container-high border-0 text-income-emerald focus:ring-income-emerald/30"
                        />
                      </td>
                      <td className="py-space-sm px-space-md text-text-secondary whitespace-nowrap text-table-data tabular-nums">
                        {formatDate(t.date)}
                      </td>
                      <td className="py-space-sm px-space-md text-text-primary font-semibold whitespace-nowrap text-table-data">
                        {t.description}
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
                      <td className="py-space-sm px-space-md whitespace-nowrap text-label-sm text-text-secondary">
                        {t.kind === "GOAL_CONTRIBUTION"
                          ? "Aporte Meta"
                          : isExtra
                          ? "Entrada Extra"
                          : isExpense
                          ? t.nature === "FIXED" ? "Gasto Fixo" : "Gasto Variável"
                          : t.nature === "FIXED" ? "Entrada Fixa" : "Entrada Variável"}
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
                            onClick={() => setEditingTx(t)}
                            aria-label="Editar"
                            title="Editar lançamento"
                            className="text-text-muted hover:text-primary p-space-2xs rounded-lg hover:bg-primary/10 transition-colors"
                            type="button"
                          >
                            <span className="material-symbols-outlined text-base leading-none">edit</span>
                          </button>
                          <button
                            onClick={() => deleteTransaction(t.id)}
                            aria-label="Excluir"
                            title="Excluir lançamento"
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
            </tbody>
          </table>
        </div>
        {/* Footer */}
        <div className="p-space-md bg-surface-container-lowest flex flex-col sm:flex-row items-center justify-between gap-space-sm border-t border-[rgba(255,255,255,0.05)]">
          <span className="text-label-sm text-text-muted">{filtered.length} lançamentos filtrados</span>
          <div className="flex items-center gap-space-xs">
            <button className="px-space-md py-space-2xs rounded-xl bg-surface-card hover:bg-surface-card-elevated text-text-secondary text-label-sm transition-colors" type="button">Anterior</button>
            <span className="px-space-sm text-label-sm text-text-primary font-bold">1 de 1</span>
            <button className="px-space-md py-space-2xs rounded-xl bg-surface-card hover:bg-surface-card-elevated text-text-secondary text-label-sm transition-colors" type="button">Próximo</button>
          </div>
        </div>
      </div>

      <NewTransactionModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
      <EditTransactionModal
        isOpen={!!editingTx}
        transaction={editingTx}
        onClose={() => setEditingTx(null)}
      />
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
    </div>
  );
}
