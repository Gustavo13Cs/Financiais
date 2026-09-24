"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useFinance } from "@/contexts/FinanceContext";
import { FinanceAlert } from "@/types/finance";

export default function NotificationDropdown() {
  const { alerts, unreadAlertCount, markAlertAsRead, markAllAlertsAsRead } = useFinance();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  const getAlertIcon = (type: FinanceAlert["type"], severity: FinanceAlert["severity"]) => {
    switch (type) {
      case "BUDGET_EXCEEDED":
        return { icon: "crisis_alert", color: "text-expense-rose bg-expense-rose/10 border-expense-rose/20" };
      case "BUDGET_WARNING":
        return { icon: "trending_up", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
      case "OVERDUE":
        return { icon: "error", color: "text-expense-rose bg-expense-rose/10 border-expense-rose/20" };
      case "DUE_SOON":
        return { icon: "schedule", color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
      default:
        return { icon: "notifications", color: "text-goal-sky bg-goal-sky/10 border-goal-sky/20" };
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((prev) => !prev)}
        type="button"
        aria-label="Notificações e Alertas"
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-surface-container-lowest hover:bg-surface-container text-text-secondary hover:text-text-primary transition-all border border-[rgba(255,255,255,0.05)] cursor-pointer"
      >
        <span className="material-symbols-outlined text-xl">notifications</span>

        {unreadAlertCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] px-1 items-center justify-center rounded-full bg-expense-rose text-white text-[10px] font-bold shadow-[0_0_8px_rgba(244,63,94,0.6)] animate-pulse">
            {unreadAlertCount > 9 ? "9+" : unreadAlertCount}
          </span>
        )}
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-surface-card border border-[rgba(255,255,255,0.08)] shadow-2xl backdrop-blur-2xl z-50 overflow-hidden animate-fade-in-up">
          {/* Header */}
          <div className="p-space-md border-b border-[rgba(255,255,255,0.06)] flex items-center justify-between bg-surface-container-lowest/50">
            <div className="flex items-center gap-space-xs">
              <span className="text-body-md font-bold text-text-primary">Alertas & Notificações</span>
              {alerts.length > 0 && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-surface-container-high text-text-secondary">
                  {alerts.length}
                </span>
              )}
            </div>

            {unreadAlertCount > 0 && (
              <button
                onClick={markAllAlertsAsRead}
                type="button"
                className="text-label-sm text-income-emerald hover:text-income-emerald-hover font-semibold transition-colors cursor-pointer"
              >
                Limpar novos
              </button>
            )}
          </div>

          {/* Alert List */}
          <div className="max-h-96 overflow-y-auto divide-y divide-[rgba(255,255,255,0.04)]">
            {alerts.length === 0 ? (
              <div className="p-space-xl text-center flex flex-col items-center justify-center gap-space-xs">
                <span className="w-12 h-12 rounded-full bg-income-emerald/10 text-income-emerald flex items-center justify-center mb-1">
                  <span className="material-symbols-outlined text-2xl">verified</span>
                </span>
                <span className="text-body-md font-semibold text-text-primary">Tudo sob controle!</span>
                <p className="text-label-sm text-text-muted max-w-[220px]">
                  Nenhuma conta atrasada ou teto orçamentário ultrapassado.
                </p>
              </div>
            ) : (
              alerts.map((alert) => {
                const badge = getAlertIcon(alert.type, alert.severity);

                return (
                  <div
                    key={alert.id}
                    onClick={() => markAlertAsRead(alert.id)}
                    className={`p-space-md transition-colors flex items-start gap-space-sm cursor-pointer ${
                      alert.read
                        ? "bg-transparent hover:bg-surface-container-lowest/50 opacity-80"
                        : "bg-surface-container-lowest/80 hover:bg-surface-container-lowest"
                    }`}
                  >
                    <span
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${badge.color}`}
                    >
                      <span className="material-symbols-outlined text-base">{badge.icon}</span>
                    </span>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-body-sm font-semibold text-text-primary truncate">
                          {alert.title}
                        </span>
                        {!alert.read && (
                          <span className="w-2 h-2 rounded-full bg-expense-rose shrink-0" />
                        )}
                      </div>
                      <p className="text-label-sm text-text-secondary leading-snug line-clamp-2">
                        {alert.message}
                      </p>

                      {alert.link && (
                        <div className="mt-space-2xs">
                          <Link
                            href={alert.link}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center gap-0.5 text-[11px] font-semibold text-goal-sky hover:underline"
                          >
                            <span>Ver detalhes</span>
                            <span className="material-symbols-outlined text-xs">arrow_forward</span>
                          </Link>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="p-space-sm bg-surface-container-lowest border-t border-[rgba(255,255,255,0.06)] flex items-center justify-between">
            <span className="text-[11px] text-text-muted">Monitoramento em tempo real</span>
            <Link
              href="/configuracoes"
              onClick={() => setIsOpen(false)}
              className="text-[11px] font-semibold text-text-secondary hover:text-text-primary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-xs">settings</span>
              <span>Preferências</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
