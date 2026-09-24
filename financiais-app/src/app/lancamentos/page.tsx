import AppLayout from "@/components/AppLayout";
import LancamentosPage from "@/components/pages/LancamentosPage";

export const metadata = {
  title: "Lançamentos | Lumina Finance",
  description: "Histórico completo de todos os lançamentos financeiros com filtros avançados e exportação.",
};

export default function Lancamentos() {
  return (
    <AppLayout>
      <LancamentosPage />
    </AppLayout>
  );
}
