import { supabase, isSupabaseConfigured } from "./supabase";
import { Transaction, Category, Goal, Settings, RecurringRule } from "@/types/finance";

const STORAGE_KEYS = {
  TRANSACTIONS: "lumina_transactions_v1",
  CATEGORIES: "lumina_categories_v1",
  GOALS: "lumina_goals_v1",
  SETTINGS: "lumina_settings_v1",
  RECURRING: "lumina_recurring_v1",
};

// Initial Seed Data for fallback / offline
export const INITIAL_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Moradia", kind: "EXPENSE", icon: "home", color: "#0EA5E9", monthly_limit: 800 },
  { id: "cat-2", name: "Alimentação", kind: "EXPENSE", icon: "restaurant", color: "#10B981", monthly_limit: 700 },
  { id: "cat-3", name: "Transporte", kind: "EXPENSE", icon: "directions_car", color: "#F59E0B", monthly_limit: 350 },
  { id: "cat-4", name: "Saúde", kind: "EXPENSE", icon: "favorite", color: "#F43F5E", monthly_limit: 200 },
  { id: "cat-5", name: "Lazer", kind: "EXPENSE", icon: "sports_esports", color: "#8B5CF6", monthly_limit: 250 },
  { id: "cat-6", name: "Assinaturas", kind: "EXPENSE", icon: "subscriptions", color: "#4EDEA3", monthly_limit: 100 },
  { id: "cat-7", name: "Educação", kind: "EXPENSE", icon: "school", color: "#89CEFF", monthly_limit: 350 },
  { id: "cat-8", name: "Utilidades", kind: "EXPENSE", icon: "receipt_long", color: "#F59E0B", monthly_limit: 250 },
  { id: "cat-9", name: "Salário", kind: "INCOME", icon: "payments", color: "#10B981" },
  { id: "cat-10", name: "Freelance", kind: "INCOME", icon: "laptop", color: "#8B5CF6" },
  { id: "cat-11", name: "Vendas", kind: "INCOME", icon: "storefront", color: "#8B5CF6" },
  { id: "cat-12", name: "Rendimentos", kind: "INCOME", icon: "trending_up", color: "#0EA5E9" },
];

export const INITIAL_GOALS: Goal[] = [
  { id: "goal-1", name: "Reserva de Emergência", target_amount: 15000, current_amount: 6200, icon: "shield", color: "#10B981" },
  { id: "goal-2", name: "Viagem Fim de Ano", target_amount: 5000, current_amount: 1400, icon: "flight_takeoff", color: "#0EA5E9" },
  { id: "goal-3", name: "Notebook Novo", target_amount: 4500, current_amount: 3100, icon: "laptop", color: "#8B5CF6" },
];

export const INITIAL_TRANSACTIONS: Transaction[] = [
  { id: "tx-1", kind: "INCOME", nature: "FIXED", description: "Salário Empresa Principal", amount: 1898.68, date: "2026-09-24", competence_month: "2026-09", status: "SETTLED", category_id: "cat-9", category_name: "Salário" },
  { id: "tx-2", kind: "INCOME", nature: "EXTRA", description: "Rendimento CDB Liquidez", amount: 119.25, date: "2026-09-22", competence_month: "2026-09", status: "SETTLED", category_id: "cat-12", category_name: "Rendimentos" },
  { id: "tx-3", kind: "EXPENSE", nature: "VARIABLE", description: "Fatura Cartão Nubank", amount: 660.62, date: "2026-09-20", competence_month: "2026-09", status: "SETTLED", category_id: "cat-3", category_name: "Transporte / Cartão" },
  { id: "tx-4", kind: "INCOME", nature: "EXTRA", description: "Venda Monitor OLX", amount: 180.00, date: "2026-09-18", competence_month: "2026-09", status: "SETTLED", category_id: "cat-11", category_name: "Vendas" },
  { id: "tx-5", kind: "EXPENSE", nature: "FIXED", description: "Academia Smart Fit", amount: 110.00, date: "2026-09-16", competence_month: "2026-09", status: "SETTLED", category_id: "cat-4", category_name: "Saúde" },
  { id: "tx-6", kind: "EXPENSE", nature: "VARIABLE", description: "Conta de Luz Enel", amount: 72.95, date: "2026-09-15", competence_month: "2026-09", status: "SETTLED", category_id: "cat-8", category_name: "Utilidades" },
  { id: "tx-7", kind: "INCOME", nature: "EXTRA", description: "Freelance Landing Page", amount: 500.00, date: "2026-09-12", competence_month: "2026-09", status: "SETTLED", category_id: "cat-10", category_name: "Freelance" },
  { id: "tx-8", kind: "EXPENSE", nature: "FIXED", description: "Parcela Curso Dev (08/12)", amount: 304.05, date: "2026-09-12", competence_month: "2026-09", status: "SETTLED", category_id: "cat-7", category_name: "Educação" },
  { id: "tx-9", kind: "EXPENSE", nature: "VARIABLE", description: "Compras Mercado Extra", amount: 234.00, date: "2026-09-10", competence_month: "2026-09", status: "SETTLED", category_id: "cat-2", category_name: "Alimentação" },
  { id: "tx-10", kind: "EXPENSE", nature: "FIXED", description: "Aluguel Apartamento", amount: 720.00, date: "2026-09-05", competence_month: "2026-09", status: "SETTLED", category_id: "cat-1", category_name: "Moradia" },
  { id: "tx-11", kind: "EXPENSE", nature: "VARIABLE", description: "Internet Claro Fibra", amount: 99.90, date: "2026-09-28", competence_month: "2026-09", status: "PENDING", category_id: "cat-8", category_name: "Utilidades" },
  { id: "tx-12", kind: "EXPENSE", nature: "FIXED", description: "Streaming Netflix / Spotify", amount: 55.90, date: "2026-09-24", competence_month: "2026-09", status: "SETTLED", category_id: "cat-6", category_name: "Assinaturas" },
];

export const INITIAL_SETTINGS: Settings = {
  financial_month_start_day: 1,
  theme: "dark",
  currency: "BRL",
  date_format: "DD/MM/AAAA",
  alert_limit: true,
  alert_due_date: true,
};

// ==========================================
// DATA ACCESS LAYER (Supabase + LocalStorage)
// ==========================================

// Helper to get authenticated user ID
export async function getAuthUserId(): Promise<string | undefined> {
  if (isSupabaseConfigured && supabase) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user?.id;
    } catch {}
  }
  return undefined;
}

export async function fetchTransactions(): Promise<Transaction[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const userId = await getAuthUserId();
      let query = supabase
        .from("transactions")
        .select("*, categories(name)")
        .is("deleted_at", null)
        .order("date", { ascending: false });

      if (userId) {
        query = query.eq("user_id", userId);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          ...d,
          category_name: d.categories?.name || undefined,
        }));
      }
    } catch (e) {
      console.warn("Supabase fetch failed, falling back to local storage", e);
    }
  }

  // Local fallback
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    if (!isSupabaseConfigured) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(INITIAL_TRANSACTIONS));
      return INITIAL_TRANSACTIONS;
    }
  }
  return [];
}

export async function saveTransaction(t: Omit<Transaction, "id"> & { id?: string }): Promise<Transaction> {
  const userId = t.user_id || (await getAuthUserId());
  const newTx: Transaction = {
    ...t,
    user_id: userId,
    id: t.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `tx-${Date.now()}`),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      const payload: any = { ...newTx };
      delete payload.category_name;
      await supabase.from("transactions").upsert(payload);
    } catch (e) {
      console.warn("Supabase save failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const list = await fetchTransactions();
    const existingIndex = list.findIndex((item) => item.id === newTx.id);
    let updated: Transaction[];
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = newTx;
    } else {
      updated = [newTx, ...list];
    }
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  }

  return newTx;
}

export async function removeTransaction(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("transactions").update({ deleted_at: new Date().toISOString() }).eq("id", id);
    } catch (e) {
      console.warn("Supabase delete failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const list = await fetchTransactions();
    const filtered = list.filter((item) => item.id !== id);
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(filtered));
  }
}

export async function fetchCategories(): Promise<Category[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const userId = await getAuthUserId();
      let query = supabase
        .from("categories")
        .select("*")
        .is("archived_at", null)
        .order("name");

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;

      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn("Supabase categories fetch failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.CATEGORIES);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    if (!isSupabaseConfigured) {
      localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(INITIAL_CATEGORIES));
      return INITIAL_CATEGORIES;
    }
  }
  return [];
}

export async function saveCategory(cat: Omit<Category, "id"> & { id?: string }): Promise<Category> {
  const userId = cat.user_id || (await getAuthUserId());
  const newCat: Category = {
    ...cat,
    user_id: userId,
    id: cat.id || `cat-${Date.now()}`,
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("categories").upsert(newCat);
    } catch (e) {}
  }

  if (typeof window !== "undefined") {
    const list = await fetchCategories();
    const idx = list.findIndex((c) => c.id === newCat.id);
    const updated = idx >= 0 ? list.map((c) => (c.id === newCat.id ? newCat : c)) : [...list, newCat];
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(updated));
  }

  return newCat;
}

export async function removeCategory(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("categories").update({ archived_at: new Date().toISOString() }).eq("id", id);
    } catch (e) {}
  }

  if (typeof window !== "undefined") {
    const list = await fetchCategories();
    const filtered = list.filter((c) => c.id !== id);
    localStorage.setItem(STORAGE_KEYS.CATEGORIES, JSON.stringify(filtered));
  }
}

export async function fetchGoals(): Promise<Goal[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const userId = await getAuthUserId();
      let query = supabase
        .from("goals")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: true });

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {}
  }

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.GOALS);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    if (!isSupabaseConfigured) {
      localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(INITIAL_GOALS));
      return INITIAL_GOALS;
    }
  }
  return [];
}

export async function saveGoal(goal: Omit<Goal, "id"> & { id?: string }): Promise<Goal> {
  const userId = goal.user_id || (await getAuthUserId());
  const newGoal: Goal = {
    ...goal,
    user_id: userId,
    id: goal.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `goal-${Date.now()}`),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("goals").upsert(newGoal);
    } catch (e) {}
  }

  if (typeof window !== "undefined") {
    const list = await fetchGoals();
    const idx = list.findIndex((g) => g.id === newGoal.id);
    const updated = idx >= 0 ? list.map((g) => (g.id === newGoal.id ? newGoal : g)) : [...list, newGoal];
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(updated));
  }

  return newGoal;
}

export async function removeGoal(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("goals").update({ archived_at: new Date().toISOString() }).eq("id", id);
    } catch (e) {
      console.warn("Supabase goal delete failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const list = await fetchGoals();
    const filtered = list.filter((g) => g.id !== id);
    localStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(filtered));
  }
}

export async function addGoalDeposit(goalId: string, amount: number): Promise<void> {
  const goals = await fetchGoals();
  const target = goals.find((g) => g.id === goalId);
  if (!target) return;

  const newCurrent = Number(target.current_amount) + Number(amount);
  await saveGoal({ ...target, current_amount: newCurrent });

  // Also create a contribution transaction
  await saveTransaction({
    kind: "GOAL_CONTRIBUTION",
    nature: "VARIABLE",
    description: `Aporte: ${target.name}`,
    amount: amount,
    date: new Date().toISOString().slice(0, 10),
    competence_month: new Date().toISOString().slice(0, 7),
    status: "SETTLED",
    goal_id: goalId,
  });
}

// ==========================================
// RECURRING RULES & SUBSCRIPTIONS
// ==========================================

export const INITIAL_RECURRING: RecurringRule[] = [
  { id: "rec-1", description: "Aluguel Apartamento", amount: 720.0, kind: "EXPENSE", day_of_month: 5, frequency: "MONTHLY", category_name: "Moradia", icon: "home", is_active: true },
  { id: "rec-2", description: "Academia Smart Fit", amount: 110.0, kind: "EXPENSE", day_of_month: 16, frequency: "MONTHLY", category_name: "Saúde", icon: "fitness_center", is_active: true },
  { id: "rec-3", description: "Parcela Curso Dev (08/12)", amount: 304.05, kind: "EXPENSE", day_of_month: 12, frequency: "MONTHLY", category_name: "Educação", icon: "school", is_active: true },
  { id: "rec-4", description: "Internet Claro Fibra", amount: 99.9, kind: "EXPENSE", day_of_month: 28, frequency: "MONTHLY", category_name: "Utilidades", icon: "wifi", is_active: true },
  { id: "rec-5", description: "Streaming (Netflix + Spotify)", amount: 55.9, kind: "EXPENSE", day_of_month: 24, frequency: "MONTHLY", category_name: "Assinaturas", icon: "subscriptions", is_active: true },
];

export async function fetchRecurringRules(): Promise<RecurringRule[]> {
  if (isSupabaseConfigured && supabase) {
    try {
      const userId = await getAuthUserId();
      let query = supabase
        .from("recurring_rules")
        .select("*")
        .order("day_of_month", { ascending: true });

      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data;
      }
    } catch (e) {
      console.warn("Supabase recurring rules fetch failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.RECURRING);
    if (saved !== null) {
      try {
        return JSON.parse(saved);
      } catch {}
    }
    if (!isSupabaseConfigured) {
      localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(INITIAL_RECURRING));
      return INITIAL_RECURRING;
    }
  }
  return [];
}

export async function saveRecurringRule(rule: Omit<RecurringRule, "id"> & { id?: string }): Promise<RecurringRule> {
  const userId = rule.user_id || (await getAuthUserId());
  const newRule: RecurringRule = {
    ...rule,
    user_id: userId,
    id: rule.id || (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : `rec-${Date.now()}`),
    created_at: new Date().toISOString(),
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("recurring_rules").upsert(newRule);
    } catch (e) {
      console.warn("Supabase save recurring failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const list = await fetchRecurringRules();
    const idx = list.findIndex((r) => r.id === newRule.id);
    const updated = idx >= 0 ? list.map((r) => (r.id === newRule.id ? newRule : r)) : [...list, newRule];
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(updated));
  }

  return newRule;
}

export async function removeRecurringRule(id: string): Promise<void> {
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("recurring_rules").delete().eq("id", id);
    } catch (e) {
      console.warn("Supabase delete recurring failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const list = await fetchRecurringRules();
    const filtered = list.filter((r) => r.id !== id);
    localStorage.setItem(STORAGE_KEYS.RECURRING, JSON.stringify(filtered));
  }
}

export async function processRecurringTransactions(targetMonth?: string): Promise<{ createdCount: number }> {
  const month = targetMonth || new Date().toISOString().slice(0, 7);
  let createdCount = 0;

  // Try RPC in Supabase first
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase.rpc("generate_monthly_recurring_transactions", {
        target_month: month,
      });
      if (!error && typeof data === "number") {
        return { createdCount: data };
      }
    } catch (e) {}
  }

  // Fallback generation logic (client or local storage)
  const rules = await fetchRecurringRules();
  const activeRules = rules.filter((r) => r.is_active && (!r.last_generated_month || r.last_generated_month < month));

  const [yearStr, monthStr] = month.split("-");
  const yearInt = parseInt(yearStr, 10);
  const monthInt = parseInt(monthStr, 10);

  for (const rule of activeRules) {
    const day = Math.min(rule.day_of_month, 28);
    const dateFormatted = `${month}-${String(day).padStart(2, "0")}`;

    await saveTransaction({
      user_id: rule.user_id,
      kind: rule.kind,
      nature: "FIXED",
      description: rule.description,
      amount: rule.amount,
      date: dateFormatted,
      competence_month: month,
      status: "PENDING",
      category_id: rule.category_id,
      category_name: rule.category_name,
    });

    await saveRecurringRule({
      ...rule,
      last_generated_month: month,
    });

    createdCount++;
  }

  return { createdCount };
}

// ==========================================
// SETTINGS PERSISTENCE
// ==========================================

export async function fetchSettings(): Promise<Settings> {
  if (isSupabaseConfigured && supabase) {
    try {
      const userId = await getAuthUserId();
      let query = supabase.from("settings").select("*").limit(1);
      if (userId) {
        query = query.or(`user_id.eq.${userId},user_id.is.null`);
      }
      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        return {
          ...INITIAL_SETTINGS,
          ...data[0],
        };
      }
    } catch (e) {
      console.warn("Supabase fetch settings failed", e);
    }
  }

  if (typeof window !== "undefined") {
    const saved = localStorage.getItem(STORAGE_KEYS.SETTINGS);
    if (saved) {
      try {
        return { ...INITIAL_SETTINGS, ...JSON.parse(saved) };
      } catch {}
    }
  }
  return INITIAL_SETTINGS;
}

export async function saveSettings(settings: Partial<Settings>): Promise<Settings> {
  const current = await fetchSettings();
  const userId = settings.user_id || (await getAuthUserId());
  const updated: Settings = {
    ...current,
    ...settings,
    user_id: userId,
  };

  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.from("settings").upsert(updated);
    } catch (e) {
      console.warn("Supabase save settings failed", e);
    }
  }

  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(updated));
  }
  return updated;
}

