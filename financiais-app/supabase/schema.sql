-- ========================================================
-- LUMINA FINANCE - ESQUEMA SUPABASE / POSTGRESQL (MULTI-USER + RLS + RECORRÊNCIA)
-- ========================================================

-- Habilitar UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Tabela de Perfis de Usuário (Integrada com Supabase Auth)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabela de Categorias
CREATE TABLE IF NOT EXISTS public.categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE')),
  icon TEXT NOT NULL DEFAULT 'category',
  color TEXT NOT NULL DEFAULT '#10B981',
  monthly_limit NUMERIC(14,2) DEFAULT NULL,
  archived_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabela de Metas e Reservas
CREATE TABLE IF NOT EXISTS public.goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  target_amount NUMERIC(14,2) NOT NULL,
  current_amount NUMERIC(14,2) NOT NULL DEFAULT 0,
  target_date DATE DEFAULT NULL,
  icon TEXT NOT NULL DEFAULT 'savings',
  color TEXT NOT NULL DEFAULT '#0EA5E9',
  archived_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabela de Lançamentos (Transactions)
CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('INCOME', 'EXPENSE', 'GOAL_CONTRIBUTION')),
  nature TEXT NOT NULL CHECK (nature IN ('FIXED', 'VARIABLE', 'EXTRA')),
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  date DATE NOT NULL,
  competence_month TEXT NOT NULL, -- formato YYYY-MM
  status TEXT NOT NULL DEFAULT 'SETTLED' CHECK (status IN ('PENDING', 'SETTLED')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  goal_id UUID REFERENCES public.goals(id) ON DELETE SET NULL,
  notes TEXT DEFAULT NULL,
  deleted_at TIMESTAMPTZ DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Tabela de Configurações (Recriar se a versão antiga com 'id global' existir)
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' AND table_name = 'settings' AND column_name = 'id'
  ) THEN
    DROP TABLE IF EXISTS public.settings CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  financial_month_start_day INT NOT NULL DEFAULT 1,
  theme TEXT NOT NULL DEFAULT 'dark',
  currency TEXT NOT NULL DEFAULT 'BRL',
  date_format TEXT NOT NULL DEFAULT 'DD/MM/AAAA',
  alert_limit BOOLEAN NOT NULL DEFAULT true,
  alert_due_date BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Tabela de Regras de Lançamentos Recorrentes e Assinaturas
CREATE TABLE IF NOT EXISTS public.recurring_rules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(14,2) NOT NULL CHECK (amount >= 0),
  kind TEXT NOT NULL DEFAULT 'EXPENSE' CHECK (kind IN ('INCOME', 'EXPENSE')),
  category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  category_name TEXT,
  day_of_month INT NOT NULL CHECK (day_of_month BETWEEN 1 AND 31),
  frequency TEXT NOT NULL DEFAULT 'MONTHLY' CHECK (frequency IN ('MONTHLY', 'WEEKLY', 'YEARLY')),
  icon TEXT NOT NULL DEFAULT 'receipt',
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_generated_month TEXT DEFAULT NULL, -- formato YYYY-MM
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ========================================================
-- GARANTIR COLUNAS EM TABELAS EXISTENTES (MIGRAÇÃO AUTOMÁTICA)
-- ========================================================
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.goals ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.transactions ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS alert_limit BOOLEAN DEFAULT true;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS alert_due_date BOOLEAN DEFAULT true;
ALTER TABLE public.recurring_rules ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- Índices de performance
CREATE INDEX IF NOT EXISTS idx_transactions_user ON public.transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON public.transactions(date);
CREATE INDEX IF NOT EXISTS idx_transactions_competence ON public.transactions(competence_month);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON public.transactions(category_id);
CREATE INDEX IF NOT EXISTS idx_categories_user ON public.categories(user_id);
CREATE INDEX IF NOT EXISTS idx_goals_user ON public.goals(user_id);
CREATE INDEX IF NOT EXISTS idx_recurring_user ON public.recurring_rules(user_id);

-- ========================================================
-- TRIGGER DE BOAS-VINDAS: AUTO-PROVISIONAMENTO DE NOVO USUÁRIO
-- ========================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  -- 1. Cria o registro de perfil
  INSERT INTO public.profiles (id, full_name, avatar_url)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2. Cria as configurações padrão
  INSERT INTO public.settings (user_id, financial_month_start_day, theme, currency, date_format)
  VALUES (new.id, 1, 'dark', 'BRL', 'DD/MM/AAAA')
  ON CONFLICT (user_id) DO NOTHING;

  -- 3. Provisiona kit de categorias essenciais para o novo usuário
  INSERT INTO public.categories (user_id, name, kind, icon, color, monthly_limit) VALUES
    (new.id, 'Moradia', 'EXPENSE', 'home', '#0EA5E9', 800.00),
    (new.id, 'Alimentação', 'EXPENSE', 'restaurant', '#10B981', 700.00),
    (new.id, 'Transporte', 'EXPENSE', 'directions_car', '#F59E0B', 350.00),
    (new.id, 'Saúde', 'EXPENSE', 'favorite', '#F43F5E', 200.00),
    (new.id, 'Lazer', 'EXPENSE', 'sports_esports', '#8B5CF6', 250.00),
    (new.id, 'Assinaturas', 'EXPENSE', 'subscriptions', '#4EDEA3', 100.00),
    (new.id, 'Educação', 'EXPENSE', 'school', '#89CEFF', 350.00),
    (new.id, 'Utilidades', 'EXPENSE', 'receipt_long', '#F59E0B', 250.00),
    (new.id, 'Salário', 'INCOME', 'payments', '#10B981', NULL),
    (new.id, 'Freelance', 'INCOME', 'laptop', '#8B5CF6', NULL),
    (new.id, 'Vendas', 'INCOME', 'storefront', '#8B5CF6', NULL),
    (new.id, 'Rendimentos', 'INCOME', 'trending_up', '#0EA5E9', NULL);

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Instala o trigger de novos cadastros
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ========================================================
-- TRIGGER PARA SINCRONIZAÇÃO AUTOMÁTICA DE APORTE EM METAS
-- ========================================================

CREATE OR REPLACE FUNCTION public.fn_sync_goal_progress()
RETURNS trigger AS $$
DECLARE
  target_goal_id UUID;
BEGIN
  target_goal_id := COALESCE(NEW.goal_id, OLD.goal_id);
  IF target_goal_id IS NOT NULL THEN
    UPDATE public.goals
    SET current_amount = COALESCE((
      SELECT SUM(amount)
      FROM public.transactions
      WHERE goal_id = target_goal_id
        AND kind = 'GOAL_CONTRIBUTION'
        AND deleted_at IS NULL
    ), 0)
    WHERE id = target_goal_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_goal_progress ON public.transactions;
CREATE TRIGGER trigger_sync_goal_progress
  AFTER INSERT OR UPDATE OR DELETE ON public.transactions
  FOR EACH ROW EXECUTE PROCEDURE public.fn_sync_goal_progress();

-- ========================================================
-- FUNÇÃO SQL PARA GERAÇÃO AUTOMÁTICA DE LANÇAMENTOS RECORRENTES
-- ========================================================

CREATE OR REPLACE FUNCTION public.generate_monthly_recurring_transactions(target_month TEXT)
RETURNS INTEGER AS $$
DECLARE
  rule RECORD;
  generated_count INTEGER := 0;
  target_date DATE;
  year_int INTEGER;
  month_int INTEGER;
  max_day INTEGER;
  actual_day INTEGER;
BEGIN
  year_int := split_part(target_month, '-', 1)::INTEGER;
  month_int := split_part(target_month, '-', 2)::INTEGER;

  FOR rule IN
    SELECT * FROM public.recurring_rules
    WHERE is_active = true
      AND (last_generated_month IS NULL OR last_generated_month < target_month)
  LOOP
    -- Calcula último dia válido do mês
    max_day := EXTRACT(DAY FROM (date_trunc('month', make_date(year_int, month_int, 1)) + interval '1 month - 1 day'))::INTEGER;
    actual_day := LEAST(rule.day_of_month, max_day);
    target_date := make_date(year_int, month_int, actual_day);

    -- Insere lançamento como FIXED e PENDING
    INSERT INTO public.transactions (
      user_id,
      kind,
      nature,
      description,
      amount,
      date,
      competence_month,
      status,
      category_id
    ) VALUES (
      rule.user_id,
      rule.kind,
      'FIXED',
      rule.description,
      rule.amount,
      target_date,
      target_month,
      'PENDING',
      rule.category_id
    );

    -- Marca regra como gerada no mês
    UPDATE public.recurring_rules
    SET last_generated_month = target_month,
        updated_at = now()
    WHERE id = rule.id;

    generated_count := generated_count + 1;
  END LOOP;

  RETURN generated_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================================
-- POLÍTICAS RLS (Row Level Security) - ISOLAMENTO MULTI-USUÁRIO
-- ========================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recurring_rules ENABLE ROW LEVEL SECURITY;

-- Limpar políticas antigas se existirem
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can insert own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can update own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON public.categories;
DROP POLICY IF EXISTS "Users can view own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can insert own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can update own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can delete own goals" ON public.goals;
DROP POLICY IF EXISTS "Users can view own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can insert own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can update own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can delete own transactions" ON public.transactions;
DROP POLICY IF EXISTS "Users can view own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can update own settings" ON public.settings;
DROP POLICY IF EXISTS "Users can view own recurring rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Users can insert own recurring rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Users can update own recurring rules" ON public.recurring_rules;
DROP POLICY IF EXISTS "Users can delete own recurring rules" ON public.recurring_rules;

-- 1. Profiles
CREATE POLICY "Users can view own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- 2. Categories
CREATE POLICY "Users can view own categories" ON public.categories
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own categories" ON public.categories
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own categories" ON public.categories
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own categories" ON public.categories
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 3. Goals
CREATE POLICY "Users can view own goals" ON public.goals
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own goals" ON public.goals
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own goals" ON public.goals
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own goals" ON public.goals
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 4. Transactions
CREATE POLICY "Users can view own transactions" ON public.transactions
  FOR SELECT USING ((auth.uid() = user_id OR user_id IS NULL) AND deleted_at IS NULL);

CREATE POLICY "Users can insert own transactions" ON public.transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own transactions" ON public.transactions
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own transactions" ON public.transactions
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- 5. Settings
CREATE POLICY "Users can view own settings" ON public.settings
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own settings" ON public.settings
  FOR ALL USING (auth.uid() = user_id OR user_id IS NULL);

-- 6. Recurring Rules
CREATE POLICY "Users can view own recurring rules" ON public.recurring_rules
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert own recurring rules" ON public.recurring_rules
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() IS NULL);

CREATE POLICY "Users can update own recurring rules" ON public.recurring_rules
  FOR UPDATE USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can delete own recurring rules" ON public.recurring_rules
  FOR DELETE USING (auth.uid() = user_id OR user_id IS NULL);

-- ========================================================
-- REPLICAÇÃO EM TEMPO REAL (SUPABASE REALTIME)
-- ========================================================
DO $$
BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.transactions;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.categories;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.goals;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.recurring_rules;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;

  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.settings;
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;
