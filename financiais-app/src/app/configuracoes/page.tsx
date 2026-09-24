import AppLayout from "@/components/AppLayout";
import ConfiguracoesPage from "@/components/pages/ConfiguracoesPage";

export const metadata = {
  title: "Configurações | Lumina Finance",
  description: "Configure tema, moeda, lançamentos recorrentes e exportação de dados.",
};

export default function Configuracoes() {
  return (
    <AppLayout>
      <ConfiguracoesPage />
    </AppLayout>
  );
}
