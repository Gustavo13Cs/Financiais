"use client";

import React, { createContext, useContext, useEffect, useState, useMemo, useCallback } from "react";
import { Transaction, Category, Goal, Settings, RecurringRule, FinanceAlert } from "@/types/finance";
import { useAuth } from "./AuthContext";
import {
  fetchTransactions,
  saveTransaction,
  removeTransaction,
  fetchCategories,
  saveCategory,
  removeCategory,
  fetchGoals,
  saveGoal,
  removeGoal,
  addGoalDeposit,
  fetchRecurringRules,
  saveRecurringRule,
  removeRecurringRule,
  processRecurringTransactions,
  fetchSettings,
  saveSettings,
  INITIAL_SETTINGS,
} from "@/lib/database";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { computeFinanceAlerts } from "@/lib/alerts";

const STORAGE_KEY_READ_ALERTS = "lumina_read_alerts_v1";

interface FinanceContextType {
  transactions: Transaction[];
  categories: Category[];
  goals: Goal[];
  recurringRules: RecurringRule[];
  settings: Settings;
  alerts: FinanceAlert[];
  unreadAlertCount: number;
  isLoading: boolean;
  addTransaction: (tx: Omit<Transaction, "id">) => Promise<Transaction>;
  addTransactions: (txs: Omit<Transaction, "id">[]) => Promise<Transaction[]>;
  editTransaction: (id: string, tx: Partial<Transaction>) => Promise<void>;
  deleteTransaction: (id: string) => Promise<void>;
  addCategory: (cat: Omit<Category, "id">) => Promise<Category>;
  editCategory: (id: string, cat: Partial<Category>) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  addGoal: (goal: Omit<Goal, "id">) => Promise<Goal>;
  editGoal: (id: string, goal: Partial<Goal>) => Promise<void>;
  deleteGoal: (id: string) => Promise<void>;
  contributeToGoal: (goalId: string, amount: number) => Promise<void>;
  addRecurringRule: (rule: Omit<RecurringRule, "id">) => Promise<RecurringRule>;
  editRecurringRule: (id: string, rule: Partial<RecurringRule>) => Promise<void>;
  deleteRecurringRule: (id: string) => Promise<void>;
  toggleRecurringRule: (id: string, active: boolean) => Promise<void>;
  processRecurring: (month?: string) => Promise<number>;
  updateSettings: (newSettings: Partial<Settings>) => Promise<void>;
  markAlertAsRead: (alertId: string) => void;
  markAllAlertsAsRead: () => void;
  refresh: () => Promise<void>;
}

const FinanceContext = createContext<FinanceContextType | undefined>(undefined);

export function FinanceProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [recurringRules, setRecurringRules] = useState<RecurringRule[]>([]);
  const [settings, setSettings] = useState<Settings>(INITIAL_SETTINGS);
  const [readAlertIds, setReadAlertIds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load read alerts from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(STORAGE_KEY_READ_ALERTS);
        if (saved) {
          setReadAlertIds(JSON.parse(saved));
        }
      } catch {}
    }
  }, []);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [txs, cats, gls, recs, sets] = await Promise.all([
        fetchTransactions(),
        fetchCategories(),
        fetchGoals(),
        fetchRecurringRules(),
        fetchSettings(),
      ]);
      setTransactions(txs);
      setCategories(cats);
      setGoals(gls);
      setRecurringRules(recs);
      setSettings(sets);
    } catch (e) {
      console.error("Failed to load financial data", e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [user, loadData]);

  // ==========================================
  // SUPABASE REALTIME SUBSCRIPTION
  // ==========================================
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase || !user) return;
    const client = supabase;

    const channel = client
      .channel("finance-realtime-channel")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "transactions",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "categories",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "goals",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "recurring_rules",
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadData();
        }
      )
      .subscribe();

    return () => {
      client.removeChannel(channel);
    };
  }, [user, loadData]);

  // Compute Alerts dynamically
  const alerts = useMemo(() => {
    return computeFinanceAlerts({
      transactions,
      categories,
      settings,
      readAlertIds,
    });
  }, [transactions, categories, settings, readAlertIds]);

  const unreadAlertCount = useMemo(() => {
    return alerts.filter((a) => !a.read).length;
  }, [alerts]);

  const markAlertAsRead = useCallback((alertId: string) => {
    setReadAlertIds((prev) => {
      if (prev.includes(alertId)) return prev;
      const next = [...prev, alertId];
      if (typeof window !== "undefined") {
        localStorage.setItem(STORAGE_KEY_READ_ALERTS, JSON.stringify(next));
      }
      return next;
    });
  }, []);

  const markAllAlertsAsRead = useCallback(() => {
    const allIds = alerts.map((a) => a.id);
    setReadAlertIds(allIds);
    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY_READ_ALERTS, JSON.stringify(allIds));
    }
  }, [alerts]);

  const addTransaction = async (tx: Omit<Transaction, "id">) => {
    const created = await saveTransaction(tx);
    setTransactions((prev) => [created, ...prev]);
    return created;
  };

  const addTransactions = async (txs: Omit<Transaction, "id">[]) => {
    const createdList: Transaction[] = [];
    for (const tx of txs) {
      const created = await saveTransaction(tx);
      createdList.push(created);
    }
    setTransactions((prev) => [...createdList, ...prev]);
    return createdList;
  };

  const editTransaction = async (id: string, changes: Partial<Transaction>) => {
    const existing = transactions.find((t) => t.id === id);
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await saveTransaction(updated);
    setTransactions((prev) => prev.map((t) => (t.id === id ? updated : t)));
  };

  const deleteTransaction = async (id: string) => {
    await removeTransaction(id);
    setTransactions((prev) => prev.filter((t) => t.id !== id));
  };

  const addCategory = async (cat: Omit<Category, "id">) => {
    const created = await saveCategory(cat);
    setCategories((prev) => [...prev, created]);
    return created;
  };

  const editCategory = async (id: string, changes: Partial<Category>) => {
    const existing = categories.find((c) => c.id === id);
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await saveCategory(updated);
    setCategories((prev) => prev.map((c) => (c.id === id ? updated : c)));
  };

  const deleteCategory = async (id: string) => {
    await removeCategory(id);
    setCategories((prev) => prev.filter((c) => c.id !== id));
  };

  const addGoal = async (goal: Omit<Goal, "id">) => {
    const created = await saveGoal(goal);
    setGoals((prev) => [...prev, created]);
    return created;
  };

  const editGoal = async (id: string, changes: Partial<Goal>) => {
    const existing = goals.find((g) => g.id === id);
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await saveGoal(updated);
    setGoals((prev) => prev.map((g) => (g.id === id ? updated : g)));
  };

  const deleteGoal = async (id: string) => {
    await removeGoal(id);
    setGoals((prev) => prev.filter((g) => g.id !== id));
  };

  const contributeToGoal = async (goalId: string, amount: number) => {
    await addGoalDeposit(goalId, amount);
    await loadData();
  };

  const addRecurringRule = async (rule: Omit<RecurringRule, "id">) => {
    const created = await saveRecurringRule(rule);
    setRecurringRules((prev) => [...prev, created]);
    return created;
  };

  const editRecurringRule = async (id: string, changes: Partial<RecurringRule>) => {
    const existing = recurringRules.find((r) => r.id === id);
    if (!existing) return;
    const updated = { ...existing, ...changes };
    await saveRecurringRule(updated);
    setRecurringRules((prev) => prev.map((r) => (r.id === id ? updated : r)));
  };

  const deleteRecurringRule = async (id: string) => {
    await removeRecurringRule(id);
    setRecurringRules((prev) => prev.filter((r) => r.id !== id));
  };

  const toggleRecurringRule = async (id: string, active: boolean) => {
    await editRecurringRule(id, { is_active: active });
  };

  const processRecurring = async (month?: string) => {
    const res = await processRecurringTransactions(month);
    if (res.createdCount > 0) {
      await loadData();
    }
    return res.createdCount;
  };

  const updateSettings = async (newSettings: Partial<Settings>) => {
    const saved = await saveSettings(newSettings);
    setSettings(saved);
  };

  const value = useMemo(
    () => ({
      transactions,
      categories,
      goals,
      recurringRules,
      settings,
      alerts,
      unreadAlertCount,
      isLoading,
      addTransaction,
      addTransactions,
      editTransaction,
      deleteTransaction,
      addCategory,
      editCategory,
      deleteCategory,
      addGoal,
      editGoal,
      deleteGoal,
      contributeToGoal,
      addRecurringRule,
      editRecurringRule,
      deleteRecurringRule,
      toggleRecurringRule,
      processRecurring,
      updateSettings,
      markAlertAsRead,
      markAllAlertsAsRead,
      refresh: loadData,
    }),
    [
      transactions,
      categories,
      goals,
      recurringRules,
      settings,
      alerts,
      unreadAlertCount,
      isLoading,
      loadData,
      markAlertAsRead,
      markAllAlertsAsRead,
    ]
  );

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>;
}

export function useFinance() {
  const context = useContext(FinanceContext);
  if (!context) {
    throw new Error("useFinance must be used within a FinanceProvider");
  }
  return context;
}
