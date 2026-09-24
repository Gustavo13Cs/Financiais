import AppLayout from "@/components/AppLayout";
import CategoriasPage from "@/components/pages/CategoriasPage";

export const metadata = {
  title: "Categorias | Lumina Finance",
  description: "Gerencie categorias de receitas e despesas com ícones e limites mensais.",
};

export default function Categorias() {
  return (
    <AppLayout>
      <CategoriasPage />
    </AppLayout>
  );
}
