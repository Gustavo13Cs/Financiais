"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";

interface NavItem {
  label: string;
  href: string;
  icon: string;
}

const navItems: NavItem[] = [
  { label: "Dashboard", href: "/", icon: "dashboard" },
  { label: "Mês", href: "/mes", icon: "calendar_view_month" },
  { label: "Ano", href: "/ano", icon: "date_range" },
  { label: "Lançamentos", href: "/lancamentos", icon: "receipt_long" },
  { label: "Calendário", href: "/calendario", icon: "calendar_month" },
  { label: "Fluxo de Caixa", href: "/fluxo", icon: "show_chart" },
  { label: "Categorias", href: "/categorias", icon: "category" },
  { label: "Metas e Reservas", href: "/metas", icon: "savings" },
];


export default function Sidebar() {
  const pathname = usePathname();
  const { user, profile, signOut } = useAuth();

  const displayName = profile?.full_name || user?.user_metadata?.full_name || (user?.email ? user.email.split("@")[0] : "Convidado");
  const initial = displayName.charAt(0).toUpperCase();

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex fixed left-0 top-0 h-full w-64 bg-surface-card z-50 flex-col justify-between shadow-[0_1px_8px_rgba(0,0,0,0.04)]">
        <div className="flex flex-col">
          {/* Logo */}
          <div className="h-16 px-space-lg flex items-center gap-space-sm border-b border-[rgba(255,255,255,0.05)]">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-income-emerald to-primary flex items-center justify-center shadow-glow">
              <span className="material-symbols-outlined text-sm text-on-primary">
                account_balance
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-headline-sm font-bold text-text-primary tracking-tight leading-none">
                Lumina
              </span>
              <span className="text-label-sm text-text-muted leading-none mt-0.5">
                Finance
              </span>
            </div>
          </div>

          {/* Main Navigation */}
          <nav className="flex flex-col gap-space-xs px-space-md pt-space-md">
            {navItems.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-xl transition-all duration-200 group ${
                    active
                      ? "bg-surface-container-high text-primary font-semibold"
                      : "text-text-secondary hover:bg-surface-container-high hover:text-on-surface"
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-lg leading-none transition-colors ${
                      active
                        ? "text-primary"
                        : "text-text-muted group-hover:text-text-secondary"
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span className="text-body-md">{item.label}</span>
                  {active && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom */}
        <div className="p-space-md border-t border-[rgba(255,255,255,0.05)]">
          <nav className="flex flex-col">
            <Link
              href="/configuracoes"
              className={`flex items-center gap-space-sm px-space-md py-space-sm rounded-xl transition-all duration-200 group ${
                pathname === "/configuracoes"
                  ? "bg-surface-container-high text-primary font-semibold"
                  : "text-text-secondary hover:bg-surface-container-high hover:text-on-surface"
              }`}
            >
              <span
                className={`material-symbols-outlined text-lg leading-none transition-colors ${
                  pathname === "/configuracoes"
                    ? "text-primary"
                    : "text-text-muted group-hover:text-text-secondary"
                }`}
              >
                settings
              </span>
              <span className="text-body-md">Configurações</span>
              {pathname === "/configuracoes" && (
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />
              )}
            </Link>
          </nav>
          {/* User info */}
          <div className="mt-space-sm flex items-center justify-between gap-space-xs px-space-sm py-space-xs rounded-xl bg-surface-container-lowest">
            <div className="flex items-center gap-space-sm min-w-0">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-extra-violet to-goal-sky flex items-center justify-center shrink-0">
                <span className="text-label-sm font-bold text-white">{initial}</span>
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-label-md text-text-primary font-semibold truncate">
                  {displayName}
                </span>
                <span className="text-[11px] text-text-muted truncate">
                  {user ? "Conectado" : "Modo Local"}
                </span>
              </div>
            </div>

            {user ? (
              <button
                onClick={() => signOut()}
                title="Sair da conta"
                type="button"
                className="p-1.5 text-text-muted hover:text-expense-rose transition-colors rounded-lg hover:bg-expense-rose/10 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base">logout</span>
              </button>
            ) : (
              <Link
                href="/login"
                title="Fazer Login"
                className="p-1.5 text-text-muted hover:text-income-emerald transition-colors rounded-lg hover:bg-income-emerald/10 cursor-pointer shrink-0"
              >
                <span className="material-symbols-outlined text-base">login</span>
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Tab Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-surface-card border-t border-[rgba(255,255,255,0.07)] flex items-center justify-between px-space-xs py-space-2xs safe-bottom overflow-x-auto">
        {[
          ...navItems,
          { label: "Ajustes", href: "/configuracoes", icon: "settings" },
        ].map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 px-space-xs py-1 rounded-xl transition-all min-w-[48px] shrink-0 ${
                active ? "text-primary font-semibold" : "text-text-muted hover:text-text-secondary"
              }`}
            >
              <span className="material-symbols-outlined text-lg leading-none">
                {item.icon}
              </span>
              <span className="text-[9px] truncate max-w-[48px] text-center">{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
