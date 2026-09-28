import AppLayout from "@/components/AppLayout";
import CalendarioPage from "@/components/pages/CalendarioPage";

export const metadata = {
  title: "Calendário Financeiro | Lumina Finance",
  description: "Visualize seus lançamentos financeiros organizados por dia no calendário mensal.",
};

export default function Calendario() {
  return (
    <AppLayout>
      <CalendarioPage />
    </AppLayout>
  );
}
