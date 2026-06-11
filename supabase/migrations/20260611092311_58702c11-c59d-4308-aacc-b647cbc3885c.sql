GRANT SELECT, INSERT, UPDATE, DELETE ON public.holds TO authenticated;
GRANT ALL ON public.holds TO service_role;
NOTIFY pgrst, 'reload schema';