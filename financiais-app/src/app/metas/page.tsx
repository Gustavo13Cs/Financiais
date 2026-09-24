import AppLayout from "@/components/AppLayout";
import MetasPage from "@/components/pages/MetasPage";

export const metadata = {
  title: "Metas e Reservas | Lumina Finance",
  description: "Acompanhe suas metas financeiras, reservas e estimativas de conclusão.",
};

export default function Metas() {
  return (
    <AppLayout>
      <MetasPage />
    </AppLayout>
  );
}
