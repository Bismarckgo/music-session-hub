
CREATE TABLE public.publishing_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  publishing_type text NOT NULL DEFAULT 'SelfAdmin',
  pro text,
  publisher_name text,
  publisher_ipi text,
  writer_ipi text,
  external_identifiers jsonb NOT NULL DEFAULT '{}'::jsonb,
  last_sync timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.publishing_profiles TO authenticated;
GRANT ALL ON public.publishing_profiles TO service_role;
ALTER TABLE public.publishing_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own publishing profile" ON public.publishing_profiles
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_pub_profiles_updated BEFORE UPDATE ON public.publishing_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.work_registrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  platform text NOT NULL,
  status text NOT NULL DEFAULT 'no_configurado',
  registration_date timestamptz,
  external_id text,
  notes text,
  last_checked timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (work_id, platform)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_registrations TO authenticated;
GRANT ALL ON public.work_registrations TO service_role;
ALTER TABLE public.work_registrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own work registrations" ON public.work_registrations
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_work_reg_updated BEFORE UPDATE ON public.work_registrations
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_work_registrations_work ON public.work_registrations(work_id);
CREATE INDEX idx_work_registrations_user ON public.work_registrations(user_id);
