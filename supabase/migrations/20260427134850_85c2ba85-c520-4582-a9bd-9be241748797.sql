
-- Profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Categories: income/expense buckets, with optional group (e.g. "Subscriptions" under expense)
CREATE TYPE public.category_kind AS ENUM ('income', 'expense');

CREATE TABLE public.categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  kind public.category_kind NOT NULL,
  group_name TEXT,
  color TEXT NOT NULL DEFAULT '#6366f1',
  icon TEXT,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.categories(user_id);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own cats select" ON public.categories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own cats insert" ON public.categories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own cats update" ON public.categories FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own cats delete" ON public.categories FOR DELETE USING (auth.uid() = user_id);

-- Transactions (line items)
CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  amount NUMERIC(12,2) NOT NULL,
  occurred_on DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.transactions(user_id, occurred_on);
CREATE INDEX ON public.transactions(category_id);
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own tx select" ON public.transactions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own tx insert" ON public.transactions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own tx update" ON public.transactions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own tx delete" ON public.transactions FOR DELETE USING (auth.uid() = user_id);

-- Budgets per category (monthly limit)
CREATE TABLE public.budgets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id UUID NOT NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  monthly_limit NUMERIC(12,2) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, category_id)
);
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own bud select" ON public.budgets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own bud insert" ON public.budgets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own bud update" ON public.budgets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own bud delete" ON public.budgets FOR DELETE USING (auth.uid() = user_id);

-- Auto-create profile + seed default categories on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));

  -- Income categories
  INSERT INTO public.categories (user_id, name, kind, group_name, color, sort_order) VALUES
    (NEW.id, 'Wages', 'income', 'Income', '#10b981', 1),
    (NEW.id, 'Interest/Dividends', 'income', 'Income', '#14b8a6', 2),
    (NEW.id, 'Business', 'income', 'Income', '#06b6d4', 3),
    (NEW.id, 'Miscellaneous', 'income', 'Income', '#0ea5e9', 4);

  -- Expense categories
  INSERT INTO public.categories (user_id, name, kind, group_name, color, sort_order) VALUES
    (NEW.id, 'Subscriptions', 'expense', 'Subscriptions', '#8b5cf6', 10),
    (NEW.id, 'Marketing', 'expense', 'Marketing', '#ec4899', 11),
    (NEW.id, 'Haircare', 'expense', 'Personal Care', '#f43f5e', 12),
    (NEW.id, 'Transportation', 'expense', 'Transportation', '#f59e0b', 13),
    (NEW.id, 'Entertainment', 'expense', 'Entertainment', '#ef4444', 14),
    (NEW.id, 'Health', 'expense', 'Health', '#22c55e', 15),
    (NEW.id, 'Vacations', 'expense', 'Vacations', '#3b82f6', 16),
    (NEW.id, 'Recreation', 'expense', 'Recreation', '#a855f7', 17),
    (NEW.id, 'Personal', 'expense', 'Personal', '#eab308', 18),
    (NEW.id, 'Financial Obligations', 'expense', 'Financial', '#64748b', 19);

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
