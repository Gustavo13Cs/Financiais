"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import NewTransactionModal from "./NewTransactionModal";
import NotificationDropdown from "./NotificationDropdown";
import { usePeriod } from "@/contexts/PeriodContext";

interface HeaderProps {
  title?: string;
}

export default function Header({ title }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { monthLabel, prevMonth, nextMonth, viewMode, setViewMode, isCurrentMonth } = usePeriod();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAnual   = pathname === "/ano";
  const isMensal  = !isAnual && viewMode !== "semanal";
  const isSemanal = !isAnual && viewMode === "semanal";

  const handleViewMode = (mode: typeof viewMode) => {
    setViewMode(mode);
    if (mode === "anual") {
      router.push("/ano");
    } else {
      router.push("/mes");
    }
  };

  return (
    <>
      <header className="fixed top-0 left-0 md:left-64 right-0 h-16 bg-surface-card/90 backdrop-blur-xl z-40 shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="h-16 w-full px-space-lg flex items-center justify-between gap-space-md">
          {/* Left: Period Selector */}
          <div className="flex items-center gap-space-md">
            <div className="flex items-center gap-space-xs bg-surface-container-lowest px-space-sm py-space-xs rounded-xl">
              <button
                aria-label="Mês anterior"
                onClick={prevMonth}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-base leading-none">chevron_left</span>
              </button>
              <span className="text-label-md font-semibold text-text-primary px-space-xs min-w-[130px] text-center select-none">
                {monthLabel}
              </span>
              <button
                aria-label="Próximo mês"
                onClick={nextMonth}
                className="flex items-center justify-center w-7 h-7 rounded-lg text-text-secondary hover:bg-surface-container hover:text-on-surface transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-base leading-none">chevron_right</span>
              </button>
            </div>

            {/* View switcher */}
            <div className="hidden md:flex items-center p-space-2xs bg-surface-container-lowest rounded-xl">
              <button
                type="button"
                onClick={() => handleViewMode("mensal")}
                className={`px-space-md py-space-2xs rounded-lg text-label-sm transition-all ${
                  isMensal
                    ? "bg-surface-card-elevated text-text-primary shadow-sm font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Mensal
              </button>
              <button
                type="button"
                onClick={() => handleViewMode("semanal")}
                className={`px-space-md py-space-2xs rounded-lg text-label-sm transition-all ${
                  isSemanal
                    ? "bg-surface-card-elevated text-text-primary shadow-sm font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Semanal
              </button>
              <button
                type="button"
                onClick={() => handleViewMode("anual")}
                className={`px-space-md py-space-2xs rounded-lg text-label-sm transition-all ${
                  isAnual
                    ? "bg-surface-card-elevated text-text-primary shadow-sm font-semibold"
                    : "text-text-secondary hover:text-text-primary"
                }`}
              >
                Anual
              </button>
            </div>
          </div>

          {/* Right: Search + Notifications + New Transaction */}
          <div className="flex items-center gap-space-sm">
            <div className="hidden lg:flex items-center gap-space-sm bg-surface-container-lowest px-space-md py-space-xs rounded-xl text-text-muted cursor-pointer hover:bg-surface-container transition-colors">
              <span className="material-symbols-outlined text-base leading-none text-text-secondary">search</span>
              <span className="text-body-md text-text-muted">Buscar lançamentos...</span>
              <kbd className="text-label-sm bg-surface-card-elevated text-text-secondary px-space-xs py-space-2xs rounded text-center">⌘K</kbd>
            </div>

            {/* Notification Bell */}
            <NotificationDropdown />

            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-space-xs bg-income-emerald hover:bg-income-emerald-hover text-white px-space-md py-space-xs rounded-xl text-headline-sm font-semibold transition-all shadow-glow active:scale-95"
              type="button"
              id="btn-novo-lancamento"
            >
              <span className="material-symbols-outlined text-lg leading-none">add</span>
              <span className="hidden sm:inline">Novo lançamento</span>
            </button>
          </div>
        </div>
      </header>

      <NewTransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
