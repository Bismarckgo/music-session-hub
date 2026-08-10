CREATE TABLE public.mie_memory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  scope text NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  observations integer NOT NULL DEFAULT 1,
  confidence numeric NOT NULL DEFAULT 0,
  last_seen timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, scope, key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mie_memory TO authenticated;
GRANT ALL ON public.mie_memory TO service_role;

ALTER TABLE public.mie_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mie memory" ON public.mie_memory
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mie_memory_set_updated_at
  BEFORE UPDATE ON public.mie_memory
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX mie_memory_user_scope_idx ON public.mie_memory (user_id, scope, confidence DESC);

CREATE TABLE public.mie_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  code text NOT NULL,
  decision text NOT NULL DEFAULT 'dismissed',
  note text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, work_id, code)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mie_feedback TO authenticated;
GRANT ALL ON public.mie_feedback TO service_role;

ALTER TABLE public.mie_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own mie feedback" ON public.mie_feedback
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER mie_feedback_set_updated_at
  BEFORE UPDATE ON public.mie_feedback
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();