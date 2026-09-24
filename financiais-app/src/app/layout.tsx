import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Lumina Finance – Controle Financeiro Pessoal",
  description:
    "Painel financeiro pessoal moderno: acompanhe entradas, gastos, metas e reservas em tempo real. Design fintech premium.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="pt-BR" className={`dark h-full ${plusJakartaSans.variable}`}>
      <head>
        {/* Material Symbols icon font – loaded via <link> in <head> */}
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200&display=swap"
        />
      </head>
      <body className="min-h-full antialiased">{children}</body>
    </html>
  );
}
