# Prompt para o Stitch — Painel de Finanças Pessoais

## 1. Resumo do projeto

Crie o front-end de um **web app de controle financeiro pessoal** para uso de uma única pessoa (sem multiusuário, sem tela de empresa). Ele substitui uma planilha: precisa ter a **liberdade e a rapidez de uma planilha**, mas com a **organização, os gráficos e o visual de um app de finanças moderno**.

O ponto principal: a renda e os gastos **não são fixos**. Quase toda semana entra um dinheiro extra ou aparece um gasto novo. O app precisa tornar o lançamento disso **extremamente rápido** (2 a 3 toques) e refletir tudo na hora nos gráficos e totais.

**Idioma da interface:** Português do Brasil. **Moeda:** Real (R$), formato `R$ 1.234,56`. **Datas:** `dd/mm/aaaa`.

---

## 2. Estilo visual

- **Tema:** dark mode como padrão (fundo grafite/azul-marinho bem escuro), com opção de tema claro.
- **Sensação:** fintech moderna, limpa, profissional e "premium", sem parecer banco tradicional. Nada de visual poluído.
- **Cores semânticas (importante manter consistência):**
  - Verde/esmeralda → entradas e saldo positivo
  - Vermelho/coral → saídas e saldo negativo
  - Azul/ciano → metas, reservas e destaques neutros
  - Âmbar → alertas (ex.: gasto perto do limite)
  - Roxo/violeta → dinheiro extra (para diferenciar da renda fixa)
- **Cards** com cantos arredondados (16 a 20px), sombras suaves e leve efeito de vidro (glassmorphism sutil).
- **Tipografia:** sans-serif geométrica (Inter, Plus Jakarta Sans ou similar). Valores monetários grandes e em destaque, com fonte numérica tabular.
- **Gráficos:** coloridos, arredondados, com tooltips, animações suaves de entrada e legendas claras.
- **Microinterações:** hover nos cards, transições suaves entre meses, números que "contam" ao carregar.
- **Layout:** desktop-first, mas totalmente **responsivo** (no celular a navegação vira barra inferior e o botão de lançamento rápido fica sempre visível).

---

## 3. Navegação

**Sidebar fixa à esquerda** (no mobile: bottom bar) com:

1. Dashboard
2. Mês (visão detalhada)
3. Ano (visão anual)
4. Lançamentos (tabela completa)
5. Categorias
6. Metas e Reservas
7. Configurações

**Barra superior** com:
- Seletor de período (setas `<` `>` + mês/ano, ex.: "Setembro 2026")
- Botão de alternar entre visão **Mensal / Semanal / Anual**
- **Botão grande "+ Novo lançamento"** sempre visível
- Atalho de busca

---

## 4. Telas

### 4.1 Dashboard (tela inicial)

Resumo do mês atual, de relance.

- **Linha de cards de resumo (KPIs):**
  - Saldo do mês
  - Total de entradas (com selo mostrando quanto veio de "extra")
  - Total de saídas
  - Quanto sobrou / % da renda poupada
  - Cada card com variação vs. mês anterior (seta verde/vermelha + %)
- **Gráfico de barras:** entradas x saídas por semana do mês atual.
- **Gráfico de rosca (donut):** gastos por categoria, com valor e % ao passar o mouse.
- **Gráfico de linha:** evolução do saldo acumulado ao longo do mês, com linha de projeção até o fim do mês.
- **Lista "Últimos lançamentos"** (5 a 8 itens) com ícone da categoria, descrição, data e valor colorido.
- **Bloco "Dinheiro extra do mês":** total recebido de fontes avulsas, com lista curta.
- **Barras de progresso** de orçamento por categoria (ex.: Alimentação 72% do limite).

### 4.2 Visão do Mês (estilo planilha, mas bonita)

A tela mais importante: precisa lembrar uma planilha, mas com cara de app.

- **Cabeçalho do mês** com totais fixos no topo (entradas, saídas, saldo).
- **Abas ou chips de semana:** Semana 1, 2, 3, 4, 5, com o subtotal de cada uma. Também a opção "Mês inteiro".
- **Tabela editável (edição direta na célula, como planilha):**
  - Colunas: Data | Descrição | Categoria (chip colorido) | Tipo (Entrada fixa / Entrada extra / Gasto fixo / Gasto variável) | Valor | Status (pago/pendente/recebido)
  - Linha vazia no final para adicionar rápido ("+ adicionar linha")
  - Ordenar e filtrar por coluna
  - Linhas de gasto fixo recorrente com ícone de repetição
  - Linhas de entrada extra com destaque na cor roxa
  - Rodapé com soma da coluna filtrada
- **Painel lateral (ou abaixo) com mini gráficos** que atualizam conforme a tabela é filtrada.
- **Comparativo com o mês anterior** por categoria.

### 4.3 Visão do Ano

- **Grade de 12 meses** (tipo tabela cruzada): linhas = categorias, colunas = janeiro a dezembro, com **mapa de calor** (quanto mais gasto, mais intensa a cor da célula). Última coluna = total do ano.
- **Gráfico combinado:** barras de entradas e saídas por mês + linha do saldo acumulado.
- **Cards do ano:** total ganho, total gasto, total economizado, média mensal, melhor mês, pior mês.
- **Gráfico de evolução do patrimônio/reserva** ao longo do ano.
- Seletor de ano no topo e comparação com o ano anterior.
- Clicar em um mês leva para a Visão do Mês correspondente.

### 4.4 Lançamentos (tabela completa)

- Todos os lançamentos de todos os períodos em uma tabela grande.
- Filtros avançados: período, categoria, tipo, faixa de valor, status, texto livre.
- Filtros salvos como chips (ex.: "Só extras", "Gastos fixos", "Pendentes").
- Seleção múltipla para editar/excluir em lote.
- Botão **Exportar (CSV/Excel)** e **Importar planilha**.

### 4.5 Categorias

- Lista de categorias em cards com ícone, cor, gasto do mês e limite mensal opcional.
- Criar, editar, arquivar categoria (escolha de ícone e cor).
- Sugestão inicial de categorias: Moradia, Alimentação, Transporte, Saúde, Lazer, Assinaturas, Educação, Investimentos, Dívidas, Outros. Para entradas: Salário, Freelance, Extra, Rendimentos, Outros.

### 4.6 Metas e Reservas

- Cards de meta com **barra de progresso circular**, valor guardado, valor alvo e prazo (ex.: "Reserva de emergência", "Viagem", "Equipamento").
- Botão "Adicionar aporte" em cada meta.
- Estimativa de "quando eu chego lá" com base no ritmo atual.

### 4.7 Configurações

- Tema (escuro/claro), moeda, dia de início do mês financeiro (ex.: virada no dia 5).
- Gerenciar lançamentos recorrentes.
- Backup/exportar dados.

---

## 5. Componente-chave: Lançamento Rápido

Ao clicar em **"+ Novo lançamento"** abre um **modal/bottom sheet** limpo, pensado para ser preenchido em segundos:

1. **Seletor grande de tipo** (segmented control): `Entrada` | `Entrada extra` | `Gasto` | `Transferência p/ meta`
2. **Campo de valor gigante** no topo, com teclado numérico no mobile
3. **Descrição** (com autocomplete de lançamentos anteriores)
4. **Categoria** (chips de escolha rápida das mais usadas)
5. **Data** (padrão = hoje; atalhos "Hoje", "Ontem", "Escolher")
6. **Opções extras (recolhidas):** repetir (mensal / semanal / parcelado em X vezes), marcar como pendente, anotação
7. Botões: **Salvar** e **Salvar e adicionar outro**

Após salvar: toast de confirmação, com opção "Desfazer", e os gráficos atualizam com animação.

---

## 6. Flexibilidade (requisitos de comportamento)

Mostrar visualmente na interface:

- Lançamentos **avulsos/extras** em destaque separados dos fixos.
- **Recorrência editável** (fixos mensais entram sozinhos, mas dá para ajustar o valor de um mês específico).
- **Projeção do fim do mês:** "no ritmo atual, você fecha o mês com R$ X".
- Possibilidade de **mover um lançamento** de mês/semana arrastando (drag and drop) na visão do mês.
- **Estados vazios bonitos** (mês novo sem lançamentos: ilustração + botão "Adicionar primeiro lançamento").
- **Alertas suaves:** categoria estourando o limite, saldo previsto negativo.

---

## 7. Dados de exemplo para preencher as telas

Use dados realistas em vez de "Lorem ipsum":

- Entradas: Salário R$ 4.500,00 | Freelance site R$ 800,00 (extra) | Venda de item usado R$ 150,00 (extra)
- Saídas: Aluguel R$ 1.100,00 | Mercado R$ 620,00 | Combustível R$ 240,00 | Academia R$ 110,00 | Streaming R$ 55,90 | Lazer/Restaurante R$ 180,00 | Internet R$ 99,90
- Metas: Reserva de emergência (R$ 6.200 de R$ 15.000) | Viagem (R$ 1.400 de R$ 5.000)
- Meses com valores variados para os gráficos anuais parecerem reais.

---

## 8. O que evitar

- Nada de layout de "planilha crua" sem estilo.
- Nada de excesso de cores competindo: usar as cores semânticas com moderação.
- Nada de telas cheias de texto: priorizar números grandes e gráficos.
- Não criar login, cadastro ou planos de assinatura neste momento.

---

## 9. Entregável esperado

Gerar as telas: **Dashboard, Visão do Mês, Visão do Ano, Lançamentos, Metas e Reservas** e o **modal de Lançamento Rápido**, em versão **desktop e mobile**, mantendo o mesmo design system (cores, tipografia, espaçamento e componentes) em todas.
