import AppLayout from "@/components/AppLayout";
import MesPage from "@/components/pages/MesPage";

export const metadata = {
  title: "Visão do Mês | Lumina Finance",
  description: "Controle detalhado de lançamentos do mês com edição inline, filtros e mini-gráficos.",
};

export default function Mes() {
  return (
    <AppLayout>
      <MesPage />
    </AppLayout>
  );
}
