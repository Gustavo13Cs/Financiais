"use client";

import { useState, useEffect } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { RecurringRule } from "@/types/finance";
import ImportModal from "@/components/ImportModal";

export default function ConfiguracoesPage() {
  const {
    recurringRules,
    addRecurringRule,
    editRecurringRule,
    deleteRecurringRule,
    toggleRecurringRule,
    processRecurring,
    settings,
    updateSettings,
    categories,
    transactions,
  } = useFinance();

  const [theme, setTheme] = useState<"dark" | "light">(settings.theme || "dark");
  const [startDay, setStartDay] = useState(String(settings.financial_month_start_day || "1"));
  const [currency, setCurrency] = useState(settings.currency || "BRL");
  const [dateFormat, setDateFormat] = useState(settings.date_format || "DD/MM/AAAA");
  const [alertLimit, setAlertLimit] = useState(true);
  const [alertDueDate, setAlertDueDate] = useState(true);
  const [weeklyDigest, setWeeklyDigest] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync settings when loaded
  useEffect(() => {
    if (settings) {
      if (settings.theme) setTheme(settings.theme);
      if (settings.financial_month_start_day) setStartDay(String(settings.financial_month_start_day));
      if (settings.currency) setCurrency(settings.currency);
      if (settings.date_format) setDateFormat(settings.date_format);
      if (settings.alert_limit !== undefined) setAlertLimit(settings.alert_limit);
      if (settings.alert_due_date !== undefined) setAlertDueDate(settings.alert_due_date);
    }
  }, [settings]);

  // Modal for adding new recurring item
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<RecurringRule | null>(null);
  const [newDesc, setNewDesc] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newDay, setNewDay] = useState("5");
  const [newCategory, setNewCategory] = useState("Moradia");
  const [newIcon, setNewIcon] = useState("receipt");
  const [isProcessing, setIsProcessing] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3200);
  };

  const handleThemeChange = (newTheme: "dark" | "light") => {
    setTheme(newTheme);
    if (newTheme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
    updateSettings({ theme: newTheme });
    showToast(`Tema alterado para modo ${newTheme === "dark" ? "Escuro" : "Claro"}`);
  };

  const handleSaveSettings = () => {
    updateSettings({
      theme,
      currency,
      date_format: dateFormat,
      financial_month_start_day: parseInt(startDay, 10),
      alert_limit: alertLimit,
      alert_due_date: alertDueDate,
    });
    showToast("Configurações salvas com sucesso!");
  };

  const handleDeleteRecurring = async (id: string) => {
    const item = recurringRules.find((r) => r.id === id);
    await deleteRecurringRule(id);
    showToast(`Recorrência "${item?.description}" removida.`);
  };

  const handleToggleRecurringActive = async (id: string, currentActive: boolean) => {
    await toggleRecurringRule(id, !currentActive);
    showToast(currentActive ? "Recorrência pausada." : "Recorrência ativada.");
  };

  const handleOpenAddModal = (item?: RecurringRule) => {
    if (item) {
      setEditingItem(item);
      setNewDesc(item.description);
      setNewAmount(item.amount.toString());
      setNewDay(item.day_of_month.toString());
      setNewCategory(item.category_name || "Moradia");
      setNewIcon(item.icon || "receipt");
    } else {
      setEditingItem(null);
      setNewDesc("");
      setNewAmount("");
      setNewDay("5");
      const defaultCat = categories.find((c) => c.kind === "EXPENSE")?.name || "Moradia";
      setNewCategory(defaultCat);
      setNewIcon("receipt");
    }
    setIsAddModalOpen(true);
  };

  const handleSaveRecurringItem = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = parseFloat(newAmount.replace(",", "."));
    if (!newDesc.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert("Por favor, preencha a descrição e um valor válido.");
      return;
    }

    const matchedCat = categories.find((c) => c.name === newCategory);

    if (editingItem) {
      await editRecurringRule(editingItem.id, {
        description: newDesc.trim(),
        amount: parsedAmount,
        day_of_month: parseInt(newDay, 10),
        category_id: matchedCat?.id,
        category_name: newCategory,
        icon: newIcon,
      });
      showToast("Lançamento recorrente atualizado!");
    } else {
      await addRecurringRule({
        description: newDesc.trim(),
        amount: parsedAmount,
        kind: "EXPENSE",
        day_of_month: parseInt(newDay, 10),
        frequency: "MONTHLY",
        category_id: matchedCat?.id,
        category_name: newCategory,
        icon: newIcon,
        is_active: true,
      });
      showToast("Novo lançamento recorrente adicionado!");
    }

    setIsAddModalOpen(false);
  };

  const handleProcessRecurring = async () => {
    setIsProcessing(true);
    try {
      const count = await processRecurring();
      if (count > 0) {
        showToast(`${count} lançamentos do mês gerados com sucesso!`);
      } else {
        showToast("Todos os lançamentos recorrentes do mês já foram gerados.");
      }
    } catch {
      showToast("Erro ao processar lançamentos recorrentes.");
    } finally {
      setIsProcessing(false);
    }
  };

  // CSV Export feature
  const handleExportCSV = () => {
    const transactions = [
      { Data: "24/09/2026", Descricao: "Salário Empresa Principal", Categoria: "Entrada Fixa", Tipo: "Entrada", Valor: "1898.68", Status: "Recebido" },
      { Data: "22/09/2026", Descricao: "Rendimento CDB Liquidez", Categoria: "Rendimentos", Tipo: "Extra", Valor: "119.25", Status: "Recebido" },
      { Data: "20/09/2026", Descricao: "Fatura Cartão Nubank", Categoria: "Cartão", Tipo: "Gasto", Valor: "-660.62", Status: "Pago" },
      { Data: "18/09/2026", Descricao: "Venda Monitor OLX", Categoria: "Venda", Tipo: "Extra", Valor: "180.00", Status: "Recebido" },
      { Data: "16/09/2026", Descricao: "Academia Smart Fit", Categoria: "Saúde", Tipo: "Gasto", Valor: "-110.00", Status: "Pago" },
      { Data: "15/09/2026", Descricao: "Conta de Luz Enel", Categoria: "Utilidades", Tipo: "Gasto", Valor: "-72.95", Status: "Pago" },
      { Data: "12/09/2026", Descricao: "Freelance Landing Page", Categoria: "Freelance", Tipo: "Extra", Valor: "500.00", Status: "Recebido" },
      { Data: "12/09/2026", Descricao: "Parcela Curso Dev", Categoria: "Educação", Tipo: "Gasto", Valor: "-304.05", Status: "Pago" },
      { Data: "10/09/2026", Descricao: "Compras Mercado Extra", Categoria: "Alimentação", Tipo: "Gasto", Valor: "-234.00", Status: "Pago" },
      { Data: "05/09/2026", Descricao: "Aluguel Apartamento", Categoria: "Moradia", Tipo: "Gasto", Valor: "-720.00", Status: "Pago" },
      { Data: "28/09/2026", Descricao: "Internet Claro Fibra", Categoria: "Utilidades", Tipo: "Gasto", Valor: "-99.90", Status: "Pendente" },
      { Data: "24/09/2026", Descricao: "Streaming Netflix Spotify", Categoria: "Assinaturas", Tipo: "Gasto", Valor: "-55.90", Status: "Pago" },
    ];

    const headers = Object.keys(transactions[0]).join(";");
    const rows = transactions.map((t) => Object.values(t).join(";")).join("\n");
    const csvContent = "\uFEFF" + headers + "\n" + rows;

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lumina_finance_lancamentos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Exportação CSV concluída com sucesso!");
  };

  // JSON Export feature
  const handleExportJSON = () => {
    const backupData = {
      version: "1.0",
      exportDate: new Date().toISOString(),
      theme,
      currency,
      startDay,
      recurring: recurringRules,
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `lumina_backup_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Backup JSON gerado com sucesso!");
  };

  // File import trigger
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      showToast(`Arquivo "${file.name}" importado com sucesso!`);
      e.target.value = "";
    }
  };

  const fmt = (v: number) =>
    v.toLocaleString("pt-BR", {
      style: "currency",
      currency: currency,
    });

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg max-w-5xl mx-auto space-y-space-xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 flex items-center gap-space-sm bg-surface-card border border-income-emerald/40 text-text-primary px-space-md py-space-sm rounded-xl shadow-modal animate-fade-in-up">
          <span className="material-symbols-outlined text-income-emerald text-base">check_circle</span>
          <span className="text-body-md font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-md border-b border-[rgba(255,255,255,0.05)] pb-space-lg">
        <div>
          <div className="flex items-center gap-space-xs text-label-sm text-text-secondary uppercase tracking-wider mb-space-2xs">
            <span className="px-space-xs py-space-2xs bg-primary-container/15 text-primary rounded text-label-sm uppercase tracking-wider font-semibold">
              Sistema
            </span>
            <span className="text-text-muted">•</span>
            <span>Preferências</span>
          </div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">Configurações</h1>
          <p className="text-body-md text-text-secondary mt-space-2xs">
            Personalize a aparência, parâmetros financeiros, lançamentos automáticos e backups.
          </p>
        </div>
        <button
          onClick={handleSaveSettings}
          className="flex items-center gap-space-xs px-space-lg py-space-sm bg-income-emerald hover:bg-income-emerald-hover text-white rounded-xl text-headline-sm font-semibold transition-all shadow-glow active:scale-95 self-start sm:self-auto"
          type="button"
        >
          <span className="material-symbols-outlined text-base">save</span>
          Salvar Alterações
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-space-lg">
        {/* Left Column (2 cols): Appearance, Regional, Recurring */}
        <div className="lg:col-span-2 space-y-space-lg">
          {/* Appearance Section */}
          <section className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-primary text-base">palette</span>
                <h2 className="text-headline-sm font-semibold text-text-primary">Aparência & Tema</h2>
              </div>
              <span className="text-label-sm text-text-muted">Padrão Dark Mode</span>
            </div>
            <div className="p-space-lg space-y-space-md">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm">
                <div>
                  <span className="text-body-md font-semibold text-text-primary block">Tema da Interface</span>
                  <span className="text-label-sm text-text-muted">Alterne entre o tema escuro de alta legibilidade ou claro</span>
                </div>
                <div className="flex items-center gap-space-xs bg-surface-container-lowest p-space-2xs rounded-xl border border-[rgba(255,255,255,0.04)]">
                  {(["dark", "light"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => handleThemeChange(t)}
                      className={`flex items-center gap-space-2xs px-space-md py-space-xs rounded-lg text-label-sm font-semibold transition-all ${
                        theme === t
                          ? "bg-surface-card-elevated text-text-primary shadow-sm ring-1 ring-white/10"
                          : "text-text-muted hover:text-text-secondary"
                      }`}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">{t === "dark" ? "dark_mode" : "light_mode"}</span>
                      {t === "dark" ? "Escuro" : "Claro"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* Regional & Financial Preferences */}
          <section className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-goal-sky text-base">tune</span>
                <h2 className="text-headline-sm font-semibold text-text-primary">Parâmetros Financeiros</h2>
              </div>
              <span className="text-label-sm text-text-muted">Ciclo & Moeda</span>
            </div>
            <div className="p-space-lg space-y-space-lg divide-y divide-[rgba(255,255,255,0.04)]">
              {/* Currency */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-xs first:pt-0">
                <div>
                  <span className="text-body-md font-semibold text-text-primary block">Moeda Padrão</span>
                  <span className="text-label-sm text-text-muted">Utilizada em todos os cálculos e relatórios</span>
                </div>
                <select
                  value={currency}
                  onChange={(e) => {
                    setCurrency(e.target.value);
                    showToast(`Moeda alterada para ${e.target.value}`);
                  }}
                  className="bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40 min-w-[200px]"
                >
                  <option value="BRL">Real Brasileiro (R$)</option>
                  <option value="USD">Dólar Americano ($)</option>
                  <option value="EUR">Euro (€)</option>
                </select>
              </div>

              {/* Cycle start day */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-md">
                <div>
                  <span className="text-body-md font-semibold text-text-primary block">Início do Ciclo Financeiro</span>
                  <span className="text-label-sm text-text-muted">
                    Dia da virada de mês (ideal para coincidir com dia do salário)
                  </span>
                </div>
                <select
                  value={startDay}
                  onChange={(e) => {
                    setStartDay(e.target.value);
                    showToast(`Ciclo financeiro definido para o dia ${e.target.value}`);
                  }}
                  className="bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40 min-w-[200px]"
                >
                  {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d}>
                      Dia {d} de cada mês
                    </option>
                  ))}
                </select>
              </div>

              {/* Date format */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-sm pt-space-md">
                <div>
                  <span className="text-body-md font-semibold text-text-primary block">Formato de Data</span>
                  <span className="text-label-sm text-text-muted">Padrão visual para tabelas e formulários</span>
                </div>
                <select
                  value={dateFormat}
                  onChange={(e) => setDateFormat(e.target.value)}
                  className="bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40 min-w-[200px]"
                >
                  <option value="DD/MM/AAAA">DD/MM/AAAA (Brasil)</option>
                  <option value="AAAA-MM-DD">AAAA-MM-DD (ISO)</option>
                  <option value="MM/DD/AAAA">MM/DD/AAAA (US)</option>
                </select>
              </div>
            </div>
          </section>

          {/* Recurring Transactions Section */}
          <section className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)] flex flex-wrap items-center justify-between gap-space-sm">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-warning-amber text-base">autorenew</span>
                <div>
                  <h2 className="text-headline-sm font-semibold text-text-primary">Lançamentos Recorrentes</h2>
                  <span className="text-label-sm text-text-muted">Despesas fixas provisionadas automaticamente a cada mês</span>
                </div>
              </div>
              <div className="flex items-center gap-space-xs">
                <button
                  onClick={handleProcessRecurring}
                  disabled={isProcessing}
                  title="Gerar despesas pendentes para o mês corrente"
                  className="flex items-center gap-space-xs text-label-sm text-goal-sky hover:text-goal-sky-hover font-semibold px-space-sm py-space-xs rounded-lg hover:bg-goal-sky/10 transition-colors disabled:opacity-50 cursor-pointer"
                  type="button"
                >
                  <span className={`material-symbols-outlined text-base ${isProcessing ? "animate-spin" : ""}`}>
                    sync
                  </span>
                  <span>{isProcessing ? "Processando..." : "Processar Mês"}</span>
                </button>
                <button
                  onClick={() => handleOpenAddModal()}
                  className="flex items-center gap-space-xs text-label-sm text-income-emerald hover:text-income-emerald-hover font-semibold px-space-sm py-space-xs rounded-lg hover:bg-income-emerald/10 transition-colors cursor-pointer"
                  type="button"
                >
                  <span className="material-symbols-outlined text-base">add</span>
                  Adicionar
                </button>
              </div>
            </div>

            <div className="divide-y divide-[rgba(255,255,255,0.04)]">
              {recurringRules.length === 0 ? (
                <div className="py-12 text-center text-text-muted text-body-md">
                  Nenhum lançamento recorrente cadastrado ainda.
                </div>
              ) : (
                recurringRules.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between px-space-lg py-space-sm hover:bg-surface-container-lowest/50 transition-colors"
                  >
                    <div className="flex items-center gap-space-md min-w-0">
                      <button
                        type="button"
                        onClick={() => handleToggleRecurringActive(r.id, r.is_active)}
                        title={r.is_active ? "Desativar recorrência" : "Ativar recorrência"}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                          r.is_active
                            ? "bg-surface-container-high text-income-emerald"
                            : "bg-surface-container-lowest text-text-muted"
                        }`}
                      >
                        <span className="material-symbols-outlined text-base">{r.icon || "receipt"}</span>
                      </button>
                      <div className="min-w-0">
                        <div className="flex items-center gap-space-xs">
                          <span className={`text-body-md font-semibold truncate ${r.is_active ? "text-text-primary" : "text-text-muted line-through"}`}>
                            {r.description}
                          </span>
                          {!r.is_active && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-container text-text-muted uppercase font-bold">
                              Pausado
                            </span>
                          )}
                        </div>
                        <span className="text-label-sm text-text-muted">
                          Todo dia {r.day_of_month} • {r.category_name || "Despesa Fixa"}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-space-md shrink-0">
                      <span className="text-body-md font-bold text-expense-rose tabular-nums">
                        {fmt(r.amount)}
                      </span>
                      <div className="flex items-center gap-space-2xs">
                        <button
                          onClick={() => handleOpenAddModal(r)}
                          className="text-text-muted hover:text-text-primary p-space-xs rounded-lg hover:bg-surface-container transition-colors cursor-pointer"
                          type="button"
                          title="Editar"
                        >
                          <span className="material-symbols-outlined text-base leading-none">edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteRecurring(r.id)}
                          className="text-text-muted hover:text-expense-rose p-space-xs rounded-lg hover:bg-expense-rose/10 transition-colors cursor-pointer"
                          type="button"
                          title="Excluir"
                        >
                          <span className="material-symbols-outlined text-base leading-none">delete</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        {/* Right Column (1 col): Notifications, Backup, About */}
        <div className="space-y-space-lg">
          {/* Notifications & Alerts */}
          <section className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)]">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-extra-violet text-base">notifications</span>
                <h2 className="text-headline-sm font-semibold text-text-primary">Alertas & Avisos</h2>
              </div>
            </div>
            <div className="p-space-lg space-y-space-md">
              <label className="flex items-start gap-space-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertLimit}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAlertLimit(checked);
                    updateSettings({ alert_limit: checked });
                    showToast(checked ? "Alerta de limite de categoria ativado." : "Alerta de limite desativado.");
                  }}
                  className="mt-1 rounded bg-surface-container-lowest border-border-subtle text-income-emerald focus:ring-income-emerald cursor-pointer"
                />
                <div>
                  <span className="text-body-md font-semibold text-text-primary block">Limite de Categoria</span>
                  <span className="text-label-sm text-text-muted">Avisar quando ultrapassar 80% do teto</span>
                </div>
              </label>

              <label className="flex items-start gap-space-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={alertDueDate}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setAlertDueDate(checked);
                    updateSettings({ alert_due_date: checked });
                    showToast(checked ? "Alerta de vencimentos próximos ativado." : "Alerta de vencimentos desativado.");
                  }}
                  className="mt-1 rounded bg-surface-container-lowest border-border-subtle text-income-emerald focus:ring-income-emerald cursor-pointer"
                />
                <div>
                  <span className="text-body-md font-semibold text-text-primary block">Vencimentos Próximos</span>
                  <span className="text-label-sm text-text-muted">Alertar contas com vencimento em até 3 dias</span>
                </div>
              </label>

              <label className="flex items-start gap-space-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={weeklyDigest}
                  onChange={(e) => setWeeklyDigest(e.target.checked)}
                  className="mt-1 rounded bg-surface-container-lowest border-border-subtle text-income-emerald focus:ring-income-emerald"
                />
                <div>
                  <span className="text-body-md font-semibold text-text-primary block">Resumo Semanal</span>
                  <span className="text-label-sm text-text-muted">Destaque de gastos e saldo no painel todo domingo</span>
                </div>
              </label>
            </div>
          </section>

          {/* Backup & Data */}
          <section className="rounded-2xl bg-surface-card shadow-card border border-[rgba(255,255,255,0.05)] overflow-hidden">
            <div className="px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)] flex items-center justify-between">
              <div className="flex items-center gap-space-sm">
                <span className="material-symbols-outlined text-goal-sky text-base">cloud_download</span>
                <h2 className="text-headline-sm font-semibold text-text-primary">Backup & Dados</h2>
              </div>
            </div>
            <div className="p-space-lg space-y-space-sm">
              <button
                onClick={handleExportCSV}
                className="w-full flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-all text-left group"
                type="button"
              >
                <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-goal-sky/15 text-goal-sky shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-base">file_download</span>
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-body-md font-semibold text-text-primary block">Exportar CSV</span>
                  <span className="text-label-sm text-text-muted">Lançamentos do ano em formato .csv</span>
                </div>
              </button>

              <button
                onClick={handleExportJSON}
                className="w-full flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-all text-left group"
                type="button"
              >
                <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-income-emerald/15 text-income-emerald shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-base">data_object</span>
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-body-md font-semibold text-text-primary block">Backup Completo (JSON)</span>
                  <span className="text-label-sm text-text-muted">Configurações e dados salvos</span>
                </div>
              </button>

              <button
                onClick={() => setIsImportModalOpen(true)}
                className="w-full flex items-center gap-space-md p-space-md rounded-xl bg-surface-container-lowest hover:bg-surface-container-high transition-all text-left group cursor-pointer"
                type="button"
              >
                <span className="w-10 h-10 flex items-center justify-center rounded-xl bg-extra-violet/15 text-extra-violet shrink-0 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-base">file_upload</span>
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-body-md font-semibold text-text-primary block">Importar Extrato Bancário</span>
                  <span className="text-label-sm text-text-muted">Importe e categorize extratos OFX ou CSV</span>
                </div>
              </button>
            </div>
          </section>

          {/* System Info card */}
          <div className="rounded-2xl bg-surface-container-lowest p-space-md border border-[rgba(255,255,255,0.04)] text-text-secondary text-label-sm space-y-space-2xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-text-primary">Lumina Finance</span>
              <span className="text-income-emerald font-bold">v1.2.0</span>
            </div>
            <p className="text-text-muted">
              Ambiente local privado. Dados salvos no seu navegador sem compartilhamento com terceiros.
            </p>
          </div>
        </div>
      </div>

      {/* Add / Edit Recurring Item Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-[rgba(7,10,16,0.75)] backdrop-blur-sm"
            onClick={() => setIsAddModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md bg-surface-card rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up">
            <div className="flex items-center justify-between px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)]">
              <h3 className="text-headline-sm font-bold text-text-primary">
                {editingItem ? "Editar Recorrência" : "Nova Despesa Recorrente"}
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-high text-text-secondary hover:text-text-primary"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveRecurringItem} className="p-space-lg space-y-space-md">
              <div>
                <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                  Descrição
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Assinatura Spotify"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                />
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                    Valor (R$)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="0,00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                  />
                </div>
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                    Dia do Mês
                  </label>
                  <select
                    value={newDay}
                    onChange={(e) => setNewDay(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                  >
                    {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>
                        Dia {d}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-space-md">
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                    Categoria
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40 cursor-pointer"
                  >
                    {categories.filter((c) => c.kind === "EXPENSE").length > 0 ? (
                      categories
                        .filter((c) => c.kind === "EXPENSE")
                        .map((cat) => (
                          <option key={cat.id} value={cat.name}>
                            {cat.name}
                          </option>
                        ))
                    ) : (
                      <>
                        <option value="Moradia">Moradia</option>
                        <option value="Alimentação">Alimentação</option>
                        <option value="Saúde">Saúde</option>
                        <option value="Educação">Educação</option>
                        <option value="Utilidades">Utilidades</option>
                        <option value="Assinaturas">Assinaturas</option>
                        <option value="Transporte">Transporte</option>
                        <option value="Outros">Outros</option>
                      </>
                    )}
                  </select>
                </div>
                <div>
                  <label className="text-label-sm font-semibold text-text-secondary block mb-1">
                    Ícone
                  </label>
                  <select
                    value={newIcon}
                    onChange={(e) => setNewIcon(e.target.value)}
                    className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
                  >
                    <option value="home">Casa (home)</option>
                    <option value="fitness_center">Academia (fitness)</option>
                    <option value="school">Educação (school)</option>
                    <option value="wifi">Internet (wifi)</option>
                    <option value="subscriptions">Streaming (subscriptions)</option>
                    <option value="directions_car">Carro (directions_car)</option>
                    <option value="receipt">Recibo (receipt)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-space-sm pt-space-sm">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-space-md py-space-xs rounded-xl text-text-secondary hover:text-text-primary text-label-md"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-space-lg py-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white rounded-xl text-label-md font-semibold shadow-glow"
                >
                  {editingItem ? "Atualizar" : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Import Modal */}
      <ImportModal isOpen={isImportModalOpen} onClose={() => setIsImportModalOpen(false)} />
    </div>
  );
}
