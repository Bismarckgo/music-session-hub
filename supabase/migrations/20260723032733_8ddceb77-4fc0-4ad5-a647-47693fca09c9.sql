
CREATE TABLE public.mie_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions(id) ON DELETE SET NULL,
  type text NOT NULL,
  actor text NOT NULL DEFAULT 'user',
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.mie_events TO authenticated;
GRANT ALL ON public.mie_events TO service_role;

ALTER TABLE public.mie_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own mie_events"
  ON public.mie_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mie_events"
  ON public.mie_events FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX mie_events_user_work_time_idx
  ON public.mie_events (user_id, work_id, occurred_at);
CREATE INDEX mie_events_type_idx
  ON public.mie_events (type);

-- Backfill from existing data
INSERT INTO public.mie_events (user_id, work_id, type, actor, payload, occurred_at)
SELECT user_id, id, 'WorkCreated', 'backfill',
  jsonb_build_object('title', title, 'status', status), created_at
FROM public.works;

INSERT INTO public.mie_events (user_id, work_id, session_id, type, actor, payload, occurred_at)
SELECT user_id, work_id, id, 'SessionStarted', 'backfill',
  jsonb_build_object('daw', daw), started_at
FROM public.sessions;

INSERT INTO public.mie_events (user_id, work_id, session_id, type, actor, payload, occurred_at)
SELECT user_id, work_id, id, 'SessionEnded', 'backfill',
  jsonb_build_object('duration_minutes', duration_minutes),
  started_at + (COALESCE(duration_minutes, 0) || ' minutes')::interval
FROM public.sessions
WHERE duration_minutes IS NOT NULL AND duration_minutes > 0;

INSERT INTO public.mie_events (user_id, work_id, type, actor, payload, occurred_at)
SELECT user_id, work_id, 'CollaboratorAdded', 'backfill',
  jsonb_build_object('name', name, 'role', role, 'split_percent', split_percent),
  created_at
FROM public.collaborators;
