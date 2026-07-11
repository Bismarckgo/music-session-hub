
CREATE TABLE public.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  email text,
  default_role text,
  ipi text,
  pro text,
  publisher text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.contacts TO authenticated;
GRANT ALL ON public.contacts TO service_role;

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own contacts" ON public.contacts
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.collaborators
  ADD COLUMN contact_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  ADD COLUMN ipi text,
  ADD COLUMN pro text,
  ADD COLUMN publisher text;

ALTER TABLE public.works
  ADD COLUMN isrc text,
  ADD COLUMN iswc text;
