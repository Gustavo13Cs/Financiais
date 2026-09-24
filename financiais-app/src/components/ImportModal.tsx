"use client";

import { useState, useRef } from "react";
import { parseOFX, ParsedTransaction } from "@/lib/parsers/ofxParser";
import { parseCSV } from "@/lib/parsers/csvParser";
import { useFinance } from "@/contexts/FinanceContext";
import { TransactionNature } from "@/types/finance";

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface EditableTransaction extends ParsedTransaction {
  selected: boolean;
  category: string;
  nature: TransactionNature;
}

export default function ImportModal({ isOpen, onClose }: ImportModalProps) {
  const { categories, addTransaction } = useFinance();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState("");
  const [transactions, setTransactions] = useState<EditableTransaction[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const handleFile = async (file: File) => {
    setErrorMsg(null);
    setFileName(file.name);
    setIsProcessing(true);

    try {
      const text = await file.text();
      let parsed: ParsedTransaction[] = [];

      if (
        file.name.toLowerCase().endsWith(".ofx") ||
        text.includes("<OFX>") ||
        text.includes("<STMTTRN>")
      ) {
        parsed = parseOFX(text);
      } else {
        parsed = parseCSV(text);
      }

      if (parsed.length === 0) {
        setErrorMsg("Nenhum lançamento válido foi identificado no arquivo. Verifique se o extrato está em formato OFX ou CSV válido.");
        setIsProcessing(false);
        return;
      }

      // Map to editable list with default nature and category selection
      const editable: EditableTransaction[] = parsed.map((t) => {
        // Match with user's categories or fallback
        const matchingCat = categories.find(
          (c) => c.name.toLowerCase() === t.suggestedCategory.toLowerCase()
        );

        return {
          ...t,
          selected: true,
          category: matchingCat ? matchingCat.name : t.suggestedCategory,
          nature: "VARIABLE",
        };
      });

      setTransactions(editable);
    } catch (err: any) {
      setErrorMsg("Erro ao processar o arquivo: " + err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  };

  const toggleSelect = (id: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, selected: !t.selected } : t))
    );
  };

  const toggleAll = () => {
    const allSelected = transactions.every((t) => t.selected);
    setTransactions((prev) => prev.map((t) => ({ ...t, selected: !allSelected })));
  };

  const updateTransactionCategory = (id: string, newCat: string) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, category: newCat } : t))
    );
  };

  const updateTransactionNature = (id: string, newNature: TransactionNature) => {
    setTransactions((prev) =>
      prev.map((t) => (t.id === id ? { ...t, nature: newNature } : t))
    );
  };

  const handleConfirmImport = async () => {
    const selectedTxs = transactions.filter((t) => t.selected);
    if (selectedTxs.length === 0) {
      alert("Selecione pelo menos um lançamento para importar.");
      return;
    }

    setIsProcessing(true);
    try {
      for (const item of selectedTxs) {
        const matchedCategory = categories.find(
          (c) => c.name.toLowerCase() === item.category.toLowerCase()
        );

        await addTransaction({
          kind: item.kind,
          nature: item.nature,
          description: item.description,
          amount: item.amount,
          date: item.date,
          competence_month: item.competence_month,
          status: "SETTLED",
          category_id: matchedCategory?.id,
          category_name: item.category,
        });
      }

      onClose();
      setTransactions([]);
      setFileName("");
    } catch (e: any) {
      setErrorMsg("Erro ao salvar lançamentos: " + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const selectedCount = transactions.filter((t) => t.selected).length;
  const totalIncome = transactions
    .filter((t) => t.selected && t.kind === "INCOME")
    .reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions
    .filter((t) => t.selected && t.kind === "EXPENSE")
    .reduce((s, t) => s + t.amount, 0);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-[rgba(7,10,16,0.8)] backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative z-10 w-full max-w-4xl bg-surface-card rounded-3xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-space-lg border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-goal-sky/15 text-goal-sky flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-xl">upload_file</span>
            </div>
            <div>
              <h2 className="text-headline-sm font-bold text-text-primary">
                Importar Extrato Bancário
              </h2>
              <p className="text-label-sm text-text-muted">
                Suporte automático para extratos OFX e CSV de qualquer banco (Nubank, Itaú, Inter, etc.)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            type="button"
            className="p-2 text-text-muted hover:text-text-primary rounded-xl hover:bg-surface-container transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Body content */}
        <div className="p-space-lg overflow-y-auto flex-1 space-y-space-md">
          {errorMsg && (
            <div className="p-space-sm bg-expense-rose/10 border border-expense-rose/20 rounded-xl text-expense-rose text-body-md flex items-center gap-space-xs">
              <span className="material-symbols-outlined text-base">error</span>
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Upload Dropzone (shown if no transactions parsed yet) */}
          {transactions.length === 0 ? (
            <div>
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all flex flex-col items-center justify-center ${
                  isDragging
                    ? "border-income-emerald bg-income-emerald/5 scale-[1.01]"
                    : "border-[rgba(255,255,255,0.12)] hover:border-income-emerald/50 bg-surface-container-lowest"
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".ofx,.csv,.tsv,.txt"
                  className="hidden"
                  onChange={handleInputChange}
                />
                <div className="w-16 h-16 rounded-2xl bg-income-emerald/10 text-income-emerald flex items-center justify-center mb-space-md shadow-glow">
                  <span className="material-symbols-outlined text-3xl">cloud_upload</span>
                </div>
                <h3 className="text-headline-sm font-semibold text-text-primary mb-1">
                  Arraste seu arquivo .OFX ou .CSV aqui
                </h3>
                <p className="text-body-md text-text-muted max-w-sm mb-space-md">
                  Ou clique para selecionar do computador. O Lumina fará a leitura e categorização automática.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-2 text-[11px] text-text-muted">
                  <span className="px-2.5 py-1 rounded-full bg-surface-container font-medium">Nubank</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container font-medium">Itaú</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container font-medium">Inter</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container font-medium">Bradesco</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container font-medium">C6 Bank</span>
                  <span className="px-2.5 py-1 rounded-full bg-surface-container font-medium">Santander</span>
                </div>
              </div>
            </div>
          ) : (
            /* Review & Preview Table */
            <div className="space-y-space-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm bg-surface-container-lowest p-space-md rounded-2xl">
                <div className="flex items-center gap-space-sm min-w-0">
                  <span className="material-symbols-outlined text-income-emerald">description</span>
                  <span className="text-body-md font-semibold text-text-primary truncate">
                    {fileName}
                  </span>
                  <span className="text-label-sm text-text-muted">
                    ({transactions.length} encontrados)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setTransactions([]);
                    setFileName("");
                  }}
                  className="text-label-sm text-text-muted hover:text-text-primary transition-colors cursor-pointer self-start sm:self-auto"
                >
                  Trocar Arquivo
                </button>
              </div>

              {/* Summary KPIs */}
              <div className="grid grid-cols-3 gap-space-sm text-center">
                <div className="p-space-sm bg-surface-container-lowest rounded-xl">
                  <span className="text-[11px] text-text-muted uppercase font-bold block">Selecionados</span>
                  <span className="text-headline-sm font-bold text-text-primary">{selectedCount}</span>
                </div>
                <div className="p-space-sm bg-income-emerald/10 rounded-xl">
                  <span className="text-[11px] text-income-emerald uppercase font-bold block">Entradas</span>
                  <span className="text-headline-sm font-bold text-income-emerald tabular-nums">{fmt(totalIncome)}</span>
                </div>
                <div className="p-space-sm bg-expense-rose/10 rounded-xl">
                  <span className="text-[11px] text-expense-rose uppercase font-bold block">Saídas</span>
                  <span className="text-headline-sm font-bold text-expense-rose tabular-nums">{fmt(totalExpense)}</span>
                </div>
              </div>

              {/* Transactions Table */}
              <div className="border border-[rgba(255,255,255,0.06)] rounded-2xl overflow-hidden overflow-x-auto max-h-[420px]">
                <table className="w-full text-label-sm">
                  <thead className="bg-surface-container-lowest sticky top-0 z-10">
                    <tr>
                      <th className="py-space-sm px-space-md text-left w-10">
                        <input
                          type="checkbox"
                          checked={transactions.length > 0 && transactions.every((t) => t.selected)}
                          onChange={toggleAll}
                          className="rounded bg-surface-card border-border-subtle text-income-emerald focus:ring-income-emerald cursor-pointer"
                        />
                      </th>
                      <th className="py-space-sm px-space-xs text-left text-text-secondary uppercase font-semibold">Data</th>
                      <th className="py-space-sm px-space-sm text-left text-text-secondary uppercase font-semibold min-w-[180px]">Descrição</th>
                      <th className="py-space-sm px-space-sm text-right text-text-secondary uppercase font-semibold">Valor</th>
                      <th className="py-space-sm px-space-sm text-left text-text-secondary uppercase font-semibold min-w-[150px]">Categoria Sugerida</th>
                      <th className="py-space-sm px-space-sm text-left text-text-secondary uppercase font-semibold">Natureza</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
                    {transactions.map((t) => (
                      <tr
                        key={t.id}
                        className={`hover:bg-surface-container-lowest/50 transition-colors ${
                          !t.selected ? "opacity-45" : ""
                        }`}
                      >
                        <td className="py-space-sm px-space-md">
                          <input
                            type="checkbox"
                            checked={t.selected}
                            onChange={() => toggleSelect(t.id)}
                            className="rounded bg-surface-card border-border-subtle text-income-emerald focus:ring-income-emerald cursor-pointer"
                          />
                        </td>
                        <td className="py-space-sm px-space-xs text-text-secondary whitespace-nowrap tabular-nums">
                          {t.date.split("-").reverse().join("/")}
                        </td>
                        <td className="py-space-sm px-space-sm font-semibold text-text-primary">
                          {t.description}
                        </td>
                        <td className="py-space-sm px-space-sm text-right font-bold tabular-nums whitespace-nowrap">
                          <span className={t.kind === "INCOME" ? "text-income-emerald" : "text-expense-rose"}>
                            {t.kind === "INCOME" ? "+" : "-"}{fmt(t.amount)}
                          </span>
                        </td>
                        <td className="py-space-sm px-space-sm">
                          <select
                            value={t.category}
                            onChange={(e) => updateTransactionCategory(t.id, e.target.value)}
                            className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-lg px-2 py-1 text-label-sm focus:outline-none focus:ring-1 focus:ring-income-emerald/40 cursor-pointer"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.name}>
                                {c.name}
                              </option>
                            ))}
                            {!categories.some((c) => c.name === t.category) && (
                              <option value={t.category}>{t.category}</option>
                            )}
                          </select>
                        </td>
                        <td className="py-space-sm px-space-sm">
                          <select
                            value={t.nature}
                            onChange={(e) => updateTransactionNature(t.id, e.target.value as TransactionNature)}
                            className="bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-secondary rounded-lg px-2 py-1 text-[11px] focus:outline-none cursor-pointer"
                          >
                            <option value="VARIABLE">Variável</option>
                            <option value="FIXED">Fixa</option>
                            <option value="EXTRA">Extra</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-space-md border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-surface-container-lowest/50">
          <button
            type="button"
            onClick={onClose}
            className="px-space-md py-space-xs rounded-xl text-text-secondary hover:text-text-primary text-label-md cursor-pointer"
          >
            Cancelar
          </button>
          {transactions.length > 0 && (
            <button
              type="button"
              disabled={isProcessing || selectedCount === 0}
              onClick={handleConfirmImport}
              className="px-space-lg py-space-sm bg-income-emerald hover:bg-income-emerald-hover disabled:opacity-50 text-white rounded-xl text-label-md font-semibold shadow-glow transition-all active:scale-95 flex items-center gap-space-xs cursor-pointer"
            >
              {isProcessing ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Importando...</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Confirmar Importação ({selectedCount})</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
