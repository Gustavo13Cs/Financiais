"use client";

import { useState } from "react";
import { useFinance } from "@/contexts/FinanceContext";
import { usePeriod } from "@/contexts/PeriodContext";
import { Category } from "@/types/finance";
import Portal from "@/components/Portal";

// Pre-defined icon set
const ICON_OPTIONS = [
  { value: "category",          label: "Geral" },
  { value: "home",              label: "Moradia" },
  { value: "restaurant",        label: "Alimentação" },
  { value: "directions_car",    label: "Transporte" },
  { value: "favorite",          label: "Saúde" },
  { value: "sports_esports",    label: "Lazer" },
  { value: "subscriptions",     label: "Assinaturas" },
  { value: "school",            label: "Educação" },
  { value: "receipt_long",      label: "Utilidades" },
  { value: "payments",          label: "Salário" },
  { value: "laptop",            label: "Tech" },
  { value: "storefront",        label: "Vendas" },
  { value: "trending_up",       label: "Investimentos" },
  { value: "savings",           label: "Poupança" },
  { value: "fitness_center",    label: "Academia" },
  { value: "local_gas_station", label: "Combustível" },
  { value: "flight_takeoff",    label: "Viagem" },
  { value: "pets",              label: "Pets" },
  { value: "shopping_cart",     label: "Compras" },
  { value: "wifi",              label: "Internet" },
  { value: "bolt",              label: "Energia" },
  { value: "shield",            label: "Seguro" },
  { value: "child_care",        label: "Filhos" },
  { value: "sports_bar",        label: "Bares" },
  { value: "build",             label: "Manutenção" },
  { value: "volunteer_activism",label: "Doações" },
  { value: "card_giftcard",     label: "Presentes" },
  { value: "work",              label: "Trabalho" },
];

const COLOR_OPTIONS = [
  "#10B981", "#0EA5E9", "#8B5CF6", "#F43F5E",
  "#F59E0B", "#4EDEA3", "#89CEFF", "#EC4899",
  "#14B8A6", "#F97316", "#6366F1", "#84CC16",
];

// Shared icon picker + color picker used in both create & edit modals
function IconColorPicker({
  icon, color, onIcon, onColor,
}: {
  icon: string; color: string;
  onIcon: (v: string) => void; onColor: (v: string) => void;
}) {
  return (
    <>
      {/* Color */}
      <div>
        <label className="text-label-sm font-semibold text-text-secondary block mb-1">Cor</label>
        <div className="flex flex-wrap gap-1.5">
          {COLOR_OPTIONS.map((c) => (
            <button
              key={c} type="button" onClick={() => onColor(c)}
              className={`w-6 h-6 rounded-full transition-all ${color === c ? "ring-2 ring-white ring-offset-1 ring-offset-surface-card scale-110" : "hover:scale-105"}`}
              style={{ backgroundColor: c }}
              title={c}
            />
          ))}
        </div>
      </div>

      {/* Icon grid */}
      <div>
        <label className="text-label-sm font-semibold text-text-secondary block mb-2">Ícone</label>
        <div className="grid grid-cols-7 gap-1.5 max-h-40 overflow-y-auto pr-1">
          {ICON_OPTIONS.map((ico) => (
            <button
              key={ico.value} type="button" onClick={() => onIcon(ico.value)} title={ico.label}
              className={`w-full aspect-square rounded-xl flex items-center justify-center transition-all ${
                icon === ico.value ? "scale-105 shadow-sm" : "bg-surface-container-lowest hover:bg-surface-container"
              }`}
              style={icon === ico.value ? { backgroundColor: `${color}20`, outline: `2px solid ${color}` } : {}}
            >
              <span className="material-symbols-outlined text-lg leading-none" style={{ color: icon === ico.value ? color : undefined }}>
                {ico.value}
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}

// ─── Category Form Modal ─────────────────────────────────────────────────────
interface CategoryModalProps {
  title: string;
  initial?: Partial<Category>;
  onSave: (data: { name: string; kind: "INCOME" | "EXPENSE"; icon: string; color: string }) => Promise<void>;
  onClose: () => void;
}

function CategoryModal({ title, initial, onSave, onClose }: CategoryModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [kind, setKind] = useState<"INCOME" | "EXPENSE">(initial?.kind ?? "EXPENSE");
  const [icon, setIcon] = useState(initial?.icon ?? "category");
  const [color, setColor] = useState(initial?.color ?? "#10B981");
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        kind,
        icon,
        color,
      });
      onClose();
    } catch (err) {
      console.error("Erro ao salvar categoria", err);
      alert("Erro ao salvar categoria. Tente novamente.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Portal>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md" onClick={onClose} />
        <div className="relative z-10 w-full max-w-md bg-surface-card rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up">
        {/* Header */}
        <div className="flex items-center justify-between px-space-lg py-space-md border-b border-[rgba(255,255,255,0.05)]">
          <h3 className="text-headline-sm font-bold text-text-primary">{title}</h3>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-xl bg-surface-container-high text-text-secondary hover:text-text-primary">
            <span className="material-symbols-outlined text-base">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-space-lg space-y-space-md">
          {/* Name */}
          <div>
            <label className="text-label-sm font-semibold text-text-secondary block mb-1">Nome</label>
            <input
              type="text" required
              placeholder="Ex: Investimentos, Pet..."
              value={name} onChange={(e) => setName(e.target.value)}
              className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none focus:ring-2 focus:ring-income-emerald/40"
            />
          </div>

          {/* Type */}
          <div>
            <label className="text-label-sm font-semibold text-text-secondary block mb-1">Tipo</label>
            <select
              value={kind} onChange={(e) => setKind(e.target.value as any)}
              className="w-full bg-surface-container-lowest border border-[rgba(255,255,255,0.08)] text-text-primary rounded-xl px-space-md py-space-sm text-body-md focus:outline-none"
            >
              <option value="EXPENSE">Despesa</option>
              <option value="INCOME">Entrada</option>
            </select>
          </div>

          {/* Icon + Color */}
          <IconColorPicker icon={icon} color={color} onIcon={setIcon} onColor={setColor} />

          {/* Preview */}
          <div className="flex items-center gap-space-sm p-space-sm rounded-xl bg-surface-container-lowest border border-[rgba(255,255,255,0.06)]">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${color}25` }}>
              <span className="material-symbols-outlined text-sm" style={{ color }}>{icon}</span>
            </div>
            <span className="text-label-sm text-text-secondary">
              Preview: <span className="text-text-primary font-semibold">{name || "Nome da categoria"}</span>
            </span>
          </div>

          <div className="flex items-center justify-end gap-space-sm pt-space-sm">
            <button type="button" onClick={onClose} className="px-space-md py-space-xs rounded-xl text-text-secondary hover:text-text-primary text-label-md">
              Cancelar
            </button>
            <button
              type="submit" disabled={saving}
              className="px-space-lg py-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white rounded-xl text-label-md font-semibold shadow-glow disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </form>
      </div>
    </div>
    </Portal>
  );
}

// ─── Delete Confirmation ─────────────────────────────────────────────────────
function DeleteConfirm({ cat, onConfirm, onClose }: { cat: Category; onConfirm: () => void; onClose: () => void }) {
  const [deleting, setDeleting] = useState(false);
  return (
    <Portal>
      <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md" onClick={onClose} />
        <div className="relative z-10 w-full max-w-sm bg-surface-card rounded-2xl shadow-modal border border-[rgba(255,255,255,0.08)] overflow-hidden animate-fade-in-up p-space-lg text-center">
        <div className="w-12 h-12 rounded-2xl bg-expense-rose/15 flex items-center justify-center mx-auto mb-space-md">
          <span className="material-symbols-outlined text-expense-rose">delete_forever</span>
        </div>
        <h3 className="text-headline-sm font-bold text-text-primary mb-space-xs">Apagar categoria?</h3>
        <p className="text-body-sm text-text-secondary mb-space-lg">
          A categoria <span className="text-text-primary font-semibold">"{cat.name}"</span> será removida permanentemente. Os lançamentos vinculados não serão afetados.
        </p>
        <div className="flex gap-space-sm">
          <button
            type="button" onClick={onClose}
            className="flex-1 py-space-sm rounded-xl bg-surface-container-high text-text-primary text-label-md font-semibold"
          >
            Cancelar
          </button>
          <button
            type="button" disabled={deleting}
            onClick={async () => { setDeleting(true); await onConfirm(); }}
            className="flex-1 py-space-sm rounded-xl bg-expense-rose hover:bg-expense-rose-hover text-white text-label-md font-semibold transition-colors disabled:opacity-60"
          >
            {deleting ? "Apagando..." : "Apagar"}
          </button>
        </div>
      </div>
    </div>
    </Portal>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CategoriasPage() {
  const { categories, transactions, addCategory, editCategory, deleteCategory } = useFinance();
  const { selectedMonth, monthLabel } = usePeriod();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState<Category | null>(null);

  const fmt = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Deduplicate by id (safety net)
  const uniqueCategories = categories.filter(
    (cat, idx, self) => self.findIndex((c) => c.id === cat.id) === idx
  );

  const expenseCats = uniqueCategories.filter((c) => c.kind === "EXPENSE");
  const incomeCats = uniqueCategories.filter((c) => c.kind === "INCOME");

  const getCategorySpend = (catId: string, catName: string) => {
    const monthExpenses = transactions.filter(
      (t) =>
        t.kind === "EXPENSE" &&
        (t.competence_month || t.date?.slice(0, 7)) === selectedMonth &&
        (t.category_id === catId ||
          t.category_name?.toLowerCase() === catName.toLowerCase())
    );
    const amount = monthExpenses.reduce((s, t) => s + t.amount, 0);
    const count = monthExpenses.length;
    return { amount, count };
  };

  const getIncomeCategorySpend = (catId: string, catName: string) => {
    const monthIncomes = transactions.filter(
      (t) =>
        t.kind === "INCOME" &&
        (t.competence_month || t.date?.slice(0, 7)) === selectedMonth &&
        (t.category_id === catId ||
          t.category_name?.toLowerCase() === catName.toLowerCase())
    );
    const amount = monthIncomes.reduce((s, t) => s + t.amount, 0);
    const count = monthIncomes.length;
    return { amount, count };
  };

  const handleDelete = async () => {
    if (!deletingCat) return;
    await deleteCategory(deletingCat.id);
    setDeletingCat(null);
  };

  // ── Expense card ──────────────────────────────────────────────────────────
  const ExpenseCard = ({ cat }: { cat: Category }) => {
    const { amount: spend, count } = getCategorySpend(cat.id, cat.name);

    return (
      <div className="rounded-2xl bg-surface-card p-space-md shadow-card border border-[rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all group relative flex flex-col justify-between">
        {/* Action buttons (hover) */}
        <div className="absolute top-space-sm right-space-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button" title="Editar"
            onClick={() => setEditingCat(cat)}
            className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>edit</span>
          </button>
          <button
            type="button" title="Apagar"
            onClick={() => setDeletingCat(cat)}
            className="w-7 h-7 rounded-lg bg-expense-rose/10 hover:bg-expense-rose/20 flex items-center justify-center text-expense-rose transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>delete</span>
          </button>
        </div>

        <div>
          <div className="flex items-center gap-space-sm mb-space-sm pr-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}20` }}>
              <span className="material-symbols-outlined text-base" style={{ color: cat.color }}>{cat.icon}</span>
            </div>
            <div className="min-w-0">
              <span className="text-body-md font-semibold text-text-primary block truncate">{cat.name}</span>
              <span className="text-label-xs text-text-muted">Despesa</span>
            </div>
          </div>

          <div className="text-kpi-value font-bold tabular-nums mb-1" style={{ color: cat.color }}>
            {fmt(spend)}
          </div>
        </div>

        <div className="flex items-center justify-between text-label-xs text-text-muted pt-space-xs border-t border-[rgba(255,255,255,0.04)] mt-space-sm">
          <span>{monthLabel}</span>
          <span>{count} {count === 1 ? "lançamento" : "lançamentos"}</span>
        </div>
      </div>
    );
  };

  // ── Income card ───────────────────────────────────────────────────────────
  const IncomeCard = ({ cat }: { cat: Category }) => {
    const { amount: received, count } = getIncomeCategorySpend(cat.id, cat.name);

    return (
      <div className="rounded-2xl bg-surface-card p-space-md shadow-card border border-[rgba(255,255,255,0.05)] hover:-translate-y-0.5 transition-all group relative flex flex-col justify-between">
        {/* Action buttons */}
        <div className="absolute top-space-sm right-space-sm flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button" title="Editar"
            onClick={() => setEditingCat(cat)}
            className="w-7 h-7 rounded-lg bg-surface-container-high hover:bg-surface-container flex items-center justify-center text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>edit</span>
          </button>
          <button
            type="button" title="Apagar"
            onClick={() => setDeletingCat(cat)}
            className="w-7 h-7 rounded-lg bg-expense-rose/10 hover:bg-expense-rose/20 flex items-center justify-center text-expense-rose transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined" style={{ fontSize: "14px" }}>delete</span>
          </button>
        </div>

        <div>
          <div className="flex items-center gap-space-sm mb-space-sm pr-16">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${cat.color}20` }}>
              <span className="material-symbols-outlined text-base" style={{ color: cat.color }}>{cat.icon}</span>
            </div>
            <div className="min-w-0">
              <span className="text-body-md font-semibold text-text-primary block truncate">{cat.name}</span>
              <span className="text-label-xs text-income-emerald font-semibold">Entrada</span>
            </div>
          </div>

          <div className="text-kpi-value font-bold tabular-nums mb-1" style={{ color: cat.color }}>
            {fmt(received)}
          </div>
        </div>

        <div className="flex items-center justify-between text-label-xs text-text-muted pt-space-xs border-t border-[rgba(255,255,255,0.04)] mt-space-sm">
          <span>{monthLabel}</span>
          <span>{count} {count === 1 ? "lançamento" : "lançamentos"}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="w-full px-space-lg md:px-margin py-space-lg space-y-space-xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-space-md">
        <div>
          <h1 className="text-headline-lg font-bold text-text-primary tracking-tight">Categorias</h1>
          <p className="text-body-md text-text-secondary mt-space-2xs">
            Gerencie suas categorias de receitas e despesas. Passe o mouse sobre uma categoria para editar ou apagar.
          </p>
        </div>
        <button
          onClick={() => setIsCreateOpen(true)}
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
        {expenseCats.length === 0 ? (
          <p className="text-text-muted text-body-sm py-space-lg">Nenhuma categoria de despesa ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {expenseCats.map((cat) => <ExpenseCard key={cat.id} cat={cat} />)}
          </div>
        )}
      </div>

      {/* Income categories */}
      <div>
        <div className="flex items-center gap-space-sm mb-space-md">
          <span className="material-symbols-outlined text-income-emerald text-base">arrow_downward_alt</span>
          <h2 className="text-headline-sm font-semibold text-text-primary">Categorias de Entradas</h2>
          <span className="px-space-xs py-space-2xs rounded-full bg-income-emerald/10 text-income-emerald text-label-sm font-semibold">{incomeCats.length}</span>
        </div>
        {incomeCats.length === 0 ? (
          <p className="text-text-muted text-body-sm py-space-lg">Nenhuma categoria de entrada ainda.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-space-md">
            {incomeCats.map((cat) => <IncomeCard key={cat.id} cat={cat} />)}
          </div>
        )}
      </div>

      {/* CREATE modal */}
      {isCreateOpen && (
        <CategoryModal
          title="Nova Categoria"
          onClose={() => setIsCreateOpen(false)}
          onSave={async (data) => { await addCategory(data); }}
        />
      )}

      {/* EDIT modal */}
      {editingCat && (
        <CategoryModal
          title="Editar Categoria"
          initial={editingCat}
          onClose={() => setEditingCat(null)}
          onSave={async (data) => { await editCategory(editingCat.id, data); }}
        />
      )}

      {/* DELETE confirm */}
      {deletingCat && (
        <DeleteConfirm
          cat={deletingCat}
          onClose={() => setDeletingCat(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
