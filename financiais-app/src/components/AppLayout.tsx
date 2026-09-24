"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { AuthProvider } from "@/contexts/AuthContext";
import { FinanceProvider } from "@/contexts/FinanceContext";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <FinanceProvider>
        <div className="min-h-screen bg-surface-base">
          <Sidebar />
          <div className="md:pl-64 flex flex-col min-h-screen">
            <Header />
            <main className="flex-1 pt-16 pb-20 md:pb-0">
              {children}
            </main>
          </div>
        </div>
      </FinanceProvider>
    </AuthProvider>
  );
}
