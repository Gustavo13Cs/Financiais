"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useFinance } from "@/contexts/FinanceContext";
import { Transaction } from "@/types/finance";
import Portal from "@/components/Portal";
import EditTransactionModal from "./EditTransactionModal";
import NewTransactionModal from "./NewTransactionModal";
import ImportModal from "./ImportModal";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  id: string;
  type: "page" | "action";
  title: string;
  subtitle: string;
  icon: string;
  path?: string;
  action?: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const { transactions, categories, goals } = useFinance();
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  // Secondary modals triggered from search
  const [selectedTxForEdit, setSelectedTxForEdit] = useState<Transaction | null>(null);
  const [isNewTxOpen, setIsNewTxOpen] = useState(false);
  const [isImportOpen, setIsImportOpen] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 50);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Currency formatter
  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
    return dateStr;
  };

  // Static navigation and actions
  const quickItems: NavItem[] = useMemo(() => [
    {
      id: "act-new",
      type: "action",
      title: "Novo Lançamento",
      subtitle: "Criar uma nova entrada, gasto ou transferência",
      icon: "add_circle",
      action: () => {
        onClose();
        setIsNewTxOpen(true);
      },
    },
    {
      id: "act-import",
      type: "action",
      title: "Importar Extrato OFX/CSV",
      subtitle: "Importar dados direto do seu banco",
      icon: "upload_file",
      action: () => {
        onClose();
        setIsImportOpen(true);
      },
    },
    {
      id: "nav-dash",
      type: "page",
      title: "Dashboard Principal",
      subtitle: "Visão geral, KPIs e gráficos do mês",
      icon: "dashboard",
      path: "/",
    },
    {
      id: "nav-cal",
      type: "page",
      title: "Calendário Financeiro",
      subtitle: "Visualizar lançamentos e vencimentos no mês",
      icon: "calendar_month",
      path: "/calendario",
    },
    {
      id: "nav-fluxo",
      type: "page",
      title: "Fluxo de Caixa Projetado",
      subtitle: "Projeção de saldo futuro em 3, 6 ou 12 meses",
      icon: "show_chart",
      path: "/fluxo",
    },
    {
      id: "nav-lanc",
      type: "page",
      title: "Lançamentos Analíticos",
      subtitle: "Extrato completo com filtros e exportação",
      icon: "receipt_long",
      path: "/lancamentos",
    },
    {
      id: "nav-cat",
      type: "page",
      title: "Gerenciar Categorias",
      subtitle: "Limites orçamentários, cores e ícones",
      icon: "category",
      path: "/categorias",
    },
    {
      id: "nav-metas",
      type: "page",
      title: "Metas & Reservas",
      subtitle: "Reserva de emergência e sonhos financeiros",
      icon: "savings",
      path: "/metas",
    },
    {
      id: "nav-mes",
      type: "page",
      title: "Visão Mensal Detalhada",
      subtitle: "Detalhamento semana a semana",
      icon: "calendar_view_month",
      path: "/mes",
    },
    {
      id: "nav-ano",
      type: "page",
      title: "Visão Anual & Heatmap",
      subtitle: "Histórico de 12 meses e comparativos",
      icon: "date_range",
      path: "/ano",
    },
    {
      id: "nav-config",
      type: "page",
      title: "Configurações do Sistema",
      subtitle: "Preferências, recorrências e tema",
      icon: "settings",
      path: "/configuracoes",
    },
  ], [onClose]);

  // Filter items based on query
  const filteredQuick = useMemo(() => {
    if (!query.trim()) return quickItems.slice(0, 5);
    const q = query.toLowerCase();
    return quickItems.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q)
    );
  }, [query, quickItems]);

  // Filter transactions based on query
  const filteredTransactions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return transactions
      .filter((t) => {
        const desc = (t.description || "").toLowerCase();
        const cat = (t.category_name || "").toLowerCase();
        const val = String(t.amount || "");
        const d = (t.date || "");
        return desc.includes(q) || cat.includes(q) || val.includes(q) || d.includes(q);
      })
      .slice(0, 8); // Top 8 results
  }, [query, transactions]);

  // Combined flat list for keyboard navigation
  const allResults = useMemo(() => {
    const list: Array<{ type: "quick"; item: NavItem } | { type: "tx"; item: Transaction }> = [];
    filteredQuick.forEach((item) => list.push({ type: "quick", item }));
    filteredTransactions.forEach((item) => list.push({ type: "tx", item }));
    return list;
  }, [filteredQuick, filteredTransactions]);

  // Handle item selection
  const handleSelect = (index: number) => {
    const target = allResults[index];
    if (!target) return;

    if (target.type === "quick") {
      if (target.item.action) {
        target.item.action();
      } else if (target.item.path) {
        onClose();
        router.push(target.item.path);
      }
    } else if (target.type === "tx") {
      onClose();
      setSelectedTxForEdit(target.item);
    }
  };

  // Keyboard navigation inside modal
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % Math.max(1, allResults.length));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + allResults.length) % Math.max(1, allResults.length));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(selectedIndex);
    }
  };

  if (!isOpen && !selectedTxForEdit && !isNewTxOpen && !isImportOpen) return null;

  return (
    <>
      {isOpen && (
        <Portal>
          <div className="fixed inset-0 z-50 flex items-start justify-center p-4 sm:p-6 pt-16 sm:pt-24 overflow-y-auto">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/75 backdrop-blur-md transition-opacity animate-fade-in"
              onClick={onClose}
            />

            {/* Palette Window */}
            <div className="relative w-full max-w-2xl bg-surface-card border border-[rgba(255,255,255,0.08)] rounded-3xl shadow-2xl overflow-hidden z-10 animate-scale-in">
              {/* Search Bar Input */}
              <div className="relative flex items-center px-4 sm:px-6 py-4 border-b border-[rgba(255,255,255,0.06)] bg-surface-container-lowest/60">
                <span className="material-symbols-outlined text-2xl text-primary mr-3 shrink-0">
                  search
                </span>
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSelectedIndex(0);
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar lançamentos, páginas, ações ou valores... (Ex: Aluguel, Mercado, R$ 100)"
                  className="w-full bg-transparent text-text-primary placeholder:text-text-muted text-body-lg sm:text-headline-sm focus:outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuery("");
                      inputRef.current?.focus();
                    }}
                    className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-container transition-colors mr-2"
                  >
                    <span className="material-symbols-outlined text-base">close</span>
                  </button>
                )}
                <kbd className="hidden sm:inline-flex items-center gap-1 text-[11px] font-semibold bg-surface-container text-text-secondary px-2.5 py-1 rounded-lg border border-[rgba(255,255,255,0.06)]">
                  ESC para sair
                </kbd>
              </div>

              {/* Results Container */}
              <div ref={listRef} className="max-h-[60vh] overflow-y-auto p-3 sm:p-4 space-y-4">
                {/* Quick actions & Navigation */}
                {filteredQuick.length > 0 && (
                  <div>
                    <span className="text-label-sm uppercase font-bold text-text-muted px-3 mb-1.5 block tracking-wider">
                      {query ? "Páginas & Ações" : "Sugestões de Navegação & Ações"}
                    </span>
                    <div className="space-y-1">
                      {filteredQuick.map((item) => {
                        const globalIdx = allResults.findIndex((r) => r.type === "quick" && r.item.id === item.id);
                        const isSelected = globalIdx === selectedIndex;
                        return (
                          <div
                            key={item.id}
                            onClick={() => handleSelect(globalIdx)}
                            onMouseEnter={() => setSelectedIndex(globalIdx)}
                            className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                              isSelected
                                ? "bg-primary text-on-primary shadow-glow-sm"
                                : "hover:bg-surface-container text-text-secondary"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                  isSelected ? "bg-white/20 text-white" : "bg-surface-container-high text-primary"
                                }`}
                              >
                                <span className="material-symbols-outlined text-lg">{item.icon}</span>
                              </div>
                              <div className="flex flex-col min-w-0">
                                <span className={`text-label-md font-semibold truncate ${isSelected ? "text-white" : "text-text-primary"}`}>
                                  {item.title}
                                </span>
                                <span className={`text-[12px] truncate ${isSelected ? "text-white/80" : "text-text-muted"}`}>
                                  {item.subtitle}
                                </span>
                              </div>
                            </div>
                            <span className="material-symbols-outlined text-base opacity-70 shrink-0 ml-2">
                              arrow_forward
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Transactions Results */}
                {query.trim() && (
                  <div>
                    <span className="text-label-sm uppercase font-bold text-text-muted px-3 mb-1.5 block tracking-wider">
                      Lançamentos ({filteredTransactions.length})
                    </span>
                    {filteredTransactions.length === 0 ? (
                      <div className="px-3 py-6 text-center text-text-muted text-label-md bg-surface-container-lowest/40 rounded-2xl">
                        Nenhum lançamento encontrado para &quot;{query}&quot;.
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {filteredTransactions.map((tx) => {
                          const globalIdx = allResults.findIndex((r) => r.type === "tx" && r.item.id === tx.id);
                          const isSelected = globalIdx === selectedIndex;
                          const isExpense = tx.kind === "EXPENSE";
                          const isExtra = tx.nature === "EXTRA";

                          return (
                            <div
                              key={tx.id}
                              onClick={() => handleSelect(globalIdx)}
                              onMouseEnter={() => setSelectedIndex(globalIdx)}
                              className={`flex items-center justify-between px-3.5 py-2.5 rounded-2xl cursor-pointer transition-all ${
                                isSelected
                                  ? "bg-surface-card-elevated border border-primary/30 shadow-md scale-[1.01]"
                                  : "hover:bg-surface-container border border-transparent"
                              }`}
                            >
                              <div className="flex items-center gap-3 min-w-0">
                                <div
                                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                                    isExtra
                                      ? "bg-extra-violet/20 text-extra-violet"
                                      : isExpense
                                      ? "bg-expense-rose/20 text-expense-rose"
                                      : "bg-income-emerald/20 text-income-emerald"
                                  }`}
                                >
                                  <span className="material-symbols-outlined text-lg">
                                    {isExtra ? "bolt" : isExpense ? "arrow_upward_alt" : "arrow_downward_alt"}
                                  </span>
                                </div>
                                <div className="flex flex-col min-w-0">
                                  <div className="flex items-center gap-2">
                                    <span className="text-label-md font-semibold text-text-primary truncate">
                                      {tx.description}
                                    </span>
                                    {isExtra && (
                                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-extra-violet/15 text-extra-violet">
                                        EXTRA
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-[11px] text-text-muted">
                                    <span>{formatDate(tx.date)}</span>
                                    <span>•</span>
                                    <span>{tx.category_name || "Geral"}</span>
                                  </div>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0 ml-2">
                                <span
                                  className={`text-label-md font-bold tabular-nums ${
                                    isExtra
                                      ? "text-extra-violet"
                                      : !isExpense
                                      ? "text-income-emerald"
                                      : "text-expense-rose"
                                  }`}
                                >
                                  {!isExpense ? "+" : "-"}
                                  {fmt(tx.amount)}
                                </span>
                                <span className="material-symbols-outlined text-base text-text-muted hover:text-primary">
                                  edit
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Guide */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-surface-container-lowest border-t border-[rgba(255,255,255,0.06)] text-[12px] text-text-muted">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center gap-1">
                    <kbd className="bg-surface-container px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)]">↑</kbd>
                    <kbd className="bg-surface-container px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)]">↓</kbd>
                    navegar
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <kbd className="bg-surface-container px-1.5 py-0.5 rounded border border-[rgba(255,255,255,0.08)]">↵</kbd>
                    abrir/editar
                  </span>
                </div>
                <span>⌘K ou Ctrl+K</span>
              </div>
            </div>
          </div>
        </Portal>
      )}

      {/* Render submodals if triggered */}
      {selectedTxForEdit && (
        <EditTransactionModal
          isOpen={!!selectedTxForEdit}
          transaction={selectedTxForEdit}
          onClose={() => setSelectedTxForEdit(null)}
        />
      )}

      <NewTransactionModal isOpen={isNewTxOpen} onClose={() => setIsNewTxOpen(false)} />
      <ImportModal isOpen={isImportOpen} onClose={() => setIsImportOpen(false)} />
    </>
  );
}
