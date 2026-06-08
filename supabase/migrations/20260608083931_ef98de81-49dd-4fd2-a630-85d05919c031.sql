CREATE TABLE public.holds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL,
  kind text NOT NULL DEFAULT 'withdrawn',
  notes text,
  occurred_on date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.holds TO authenticated;
GRANT ALL ON public.holds TO service_role;
ALTER TABLE public.holds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own holds select" ON public.holds FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own holds insert" ON public.holds FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own holds update" ON public.holds FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own holds delete" ON public.holds FOR DELETE USING (auth.uid() = user_id);
CREATE TRIGGER holds_set_updated_at BEFORE UPDATE ON public.holds FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();