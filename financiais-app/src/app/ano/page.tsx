import AppLayout from "@/components/AppLayout";
import AnoPage from "@/components/pages/AnoPage";

export const metadata = {
  title: "Visão do Ano | Lumina Finance",
  description: "Visão anual com heatmap de categorias, gráfico combinado e evolução do patrimônio.",
};

export default function Ano() {
  return (
    <AppLayout>
      <AnoPage />
    </AppLayout>
  );
}
