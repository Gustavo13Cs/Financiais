"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useMemo } from "react";
import { useFinance } from "./FinanceContext";

export type ViewMode = "mensal" | "semanal" | "anual";

interface PeriodContextType {
  /** Current selected month as "YYYY-MM" */
  selectedMonth: string;
  viewMode: ViewMode;
  setSelectedMonth: (month: string) => void;
  setViewMode: (mode: ViewMode) => void;
  prevMonth: () => void;
  nextMonth: () => void;
  /** Human-readable month label e.g. "Setembro 2026" */
  monthLabel: string;
  /** true if the selectedMonth is the current calendar month */
  isCurrentMonth: boolean;
}

const MONTHS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

function todayYYYYMM(): string {
  return new Date().toISOString().slice(0, 7);
}

const PeriodContext = createContext<PeriodContextType | undefined>(undefined);

export function PeriodProvider({ children }: { children: React.ReactNode }) {
  const [selectedMonth, setSelectedMonthState] = useState<string>(todayYYYYMM);
  const [viewMode, setViewMode] = useState<ViewMode>("mensal");
  const { processRecurring, recurringRules } = useFinance();

  // Create a key from active rules to avoid unnecessary executions
  const activeRulesKey = useMemo(
    () => (recurringRules || []).filter((r) => r.is_active).map((r) => `${r.id}-${r.amount}`).join(","),
    [recurringRules]
  );

  // Auto-sync recurring transactions for whichever month is selected
  useEffect(() => {
    if (selectedMonth && activeRulesKey) {
      processRecurring(selectedMonth);
    }
  }, [selectedMonth, activeRulesKey, processRecurring]);

  const setSelectedMonth = useCallback((month: string) => {
    setSelectedMonthState(month);
  }, []);

  const prevMonth = useCallback(() => {
    setSelectedMonthState((current) => {
      const [y, m] = current.split("-").map(Number);
      if (m === 1) return `${y - 1}-12`;
      return `${y}-${String(m - 1).padStart(2, "0")}`;
    });
  }, []);

  const nextMonth = useCallback(() => {
    setSelectedMonthState((current) => {
      const [y, m] = current.split("-").map(Number);
      if (m === 12) return `${y + 1}-01`;
      return `${y}-${String(m + 1).padStart(2, "0")}`;
    });
  }, []);

  const [year, monthNum] = selectedMonth.split("-").map(Number);
  const monthLabel = `${MONTHS[monthNum - 1]} ${year}`;
  const isCurrentMonth = selectedMonth === todayYYYYMM();

  return (
    <PeriodContext.Provider
      value={{ selectedMonth, viewMode, setSelectedMonth, setViewMode, prevMonth, nextMonth, monthLabel, isCurrentMonth }}
    >
      {children}
    </PeriodContext.Provider>
  );
}

export function usePeriod() {
  const ctx = useContext(PeriodContext);
  if (!ctx) throw new Error("usePeriod must be used within a PeriodProvider");
  return ctx;
}
