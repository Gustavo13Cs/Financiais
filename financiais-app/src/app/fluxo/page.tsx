import AppLayout from "@/components/AppLayout";
import FluxoCaixaPage from "@/components/pages/FluxoCaixaPage";

export const metadata = {
  title: "Fluxo de Caixa | Lumina Finance",
  description: "Projeção de fluxo de caixa baseada nos seus lançamentos recorrentes para os próximos meses.",
};

export default function FluxoCaixa() {
  return (
    <AppLayout>
      <FluxoCaixaPage />
    </AppLayout>
  );
}
