-- Planned (to-spend) items: things the user plans or needs to spend in the future
CREATE TABLE public.planned_expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  category_id UUID,
  title TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  priority TEXT NOT NULL DEFAULT 'medium',
  target_date DATE,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.planned_expenses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own planned select" ON public.planned_expenses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own planned insert" ON public.planned_expenses FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own planned update" ON public.planned_expenses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own planned delete" ON public.planned_expenses FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_planned_user ON public.planned_expenses(user_id, status, target_date);

-- Reuse existing updated_at function if present, otherwise create it
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER trg_planned_updated_at
BEFORE UPDATE ON public.planned_expenses
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();