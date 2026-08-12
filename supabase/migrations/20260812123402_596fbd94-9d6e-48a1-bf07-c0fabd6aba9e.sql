-- ============ COMPOSITIONS ============
CREATE TABLE public.compositions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  title text NOT NULL,
  iswc text,
  genre text,
  bpm integer,
  musical_key text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.compositions TO authenticated;
GRANT ALL ON public.compositions TO service_role;
ALTER TABLE public.compositions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own compositions" ON public.compositions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX compositions_user_iswc_key ON public.compositions (user_id, iswc) WHERE iswc IS NOT NULL;
CREATE INDEX compositions_work_id_idx ON public.compositions (work_id);
CREATE TRIGGER compositions_set_updated_at BEFORE UPDATE ON public.compositions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ RECORDINGS ============
CREATE TABLE public.recordings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  work_id uuid REFERENCES public.works(id) ON DELETE CASCADE,
  composition_id uuid REFERENCES public.compositions(id) ON DELETE SET NULL,
  title text NOT NULL,
  isrc text,
  cover_path text,
  duration_sec integer,
  distributor_name text,
  distributor_url text,
  distribution_status text NOT NULL DEFAULT 'sin_distribuir',
  channel_links jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recordings TO authenticated;
GRANT ALL ON public.recordings TO service_role;
ALTER TABLE public.recordings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recordings" ON public.recordings
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE UNIQUE INDEX recordings_user_isrc_key ON public.recordings (user_id, isrc) WHERE isrc IS NOT NULL;
CREATE INDEX recordings_work_id_idx ON public.recordings (work_id);
CREATE INDEX recordings_composition_id_idx ON public.recordings (composition_id);
CREATE TRIGGER recordings_set_updated_at BEFORE UPDATE ON public.recordings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ COMPOSITION SHARES ============
CREATE TABLE public.composition_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  composition_id uuid NOT NULL REFERENCES public.compositions(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  name text,
  role text NOT NULL,
  writer_share numeric NOT NULL DEFAULT 0 CHECK (writer_share >= 0 AND writer_share <= 100),
  publisher_share numeric NOT NULL DEFAULT 0 CHECK (publisher_share >= 0 AND publisher_share <= 100),
  territory text NOT NULL DEFAULT 'WORLD',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.composition_shares TO authenticated;
GRANT ALL ON public.composition_shares TO service_role;
ALTER TABLE public.composition_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own composition shares" ON public.composition_shares
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX composition_shares_composition_id_idx ON public.composition_shares (composition_id);

-- ============ RECORDING SHARES ============
CREATE TABLE public.recording_shares (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  recording_id uuid NOT NULL REFERENCES public.recordings(id) ON DELETE CASCADE,
  person_id uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  name text,
  role text NOT NULL,
  artist_share numeric NOT NULL DEFAULT 0 CHECK (artist_share >= 0 AND artist_share <= 100),
  label_share numeric NOT NULL DEFAULT 0 CHECK (label_share >= 0 AND label_share <= 100),
  producer_points numeric NOT NULL DEFAULT 0 CHECK (producer_points >= 0 AND producer_points <= 100),
  points_type text NOT NULL DEFAULT 'gross',
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.recording_shares TO authenticated;
GRANT ALL ON public.recording_shares TO service_role;
ALTER TABLE public.recording_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own recording shares" ON public.recording_shares
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX recording_shares_recording_id_idx ON public.recording_shares (recording_id);

-- ============ BACKFILL ============
-- Una composición por obra existente (dedup ISWC por usuario)
INSERT INTO public.compositions (user_id, work_id, title, iswc, genre, bpm, musical_key, created_at)
SELECT w.user_id, w.id, w.title, w.iswc, w.genre, w.bpm, w.musical_key, w.created_at
FROM public.works w
WHERE w.iswc IS NULL
   OR w.id = (SELECT w2.id FROM public.works w2
              WHERE w2.user_id = w.user_id AND w2.iswc = w.iswc
              ORDER BY w2.created_at, w2.id LIMIT 1);

-- Una grabación por obra existente (dedup ISRC por usuario)
INSERT INTO public.recordings (
  user_id, work_id, composition_id, title, isrc, cover_path,
  distributor_name, distributor_url, distribution_status, channel_links, created_at
)
SELECT w.user_id, w.id, c.id, w.title, w.isrc, w.cover_path,
       w.distributor_name, w.distributor_url, w.distribution_status, w.channel_links, w.created_at
FROM public.works w
LEFT JOIN public.compositions c ON c.work_id = w.id
WHERE w.isrc IS NULL
   OR w.id = (SELECT w2.id FROM public.works w2
              WHERE w2.user_id = w.user_id AND w2.isrc = w.isrc
              ORDER BY w2.created_at, w2.id LIMIT 1);

-- Colaboradores de composición -> composition_shares
INSERT INTO public.composition_shares (user_id, composition_id, person_id, name, role, writer_share, created_at)
SELECT col.user_id, c.id, col.contact_id, col.name, col.role,
       LEAST(GREATEST(col.split_percent, 0), 100), col.created_at
FROM public.collaborators col
JOIN public.compositions c ON c.work_id = col.work_id
WHERE lower(col.role) IN ('compositor','autor','letrista','composer','songwriter','author','lyricist','topliner');

-- Resto de colaboradores -> recording_shares
INSERT INTO public.recording_shares (user_id, recording_id, person_id, name, role, artist_share, created_at)
SELECT col.user_id, r.id, col.contact_id, col.name, col.role,
       LEAST(GREATEST(col.split_percent, 0), 100), col.created_at
FROM public.collaborators col
JOIN public.recordings r ON r.work_id = col.work_id
WHERE lower(col.role) NOT IN ('compositor','autor','letrista','composer','songwriter','author','lyricist','topliner');

-- ============ VISTA DE COMPATIBILIDAD ============
CREATE VIEW public.works_view
WITH (security_invoker = true)
AS
SELECT
  w.id,
  w.user_id,
  w.title,
  w.fingerprint,
  w.status,
  w.channels,
  w.created_at,
  w.updated_at,
  c.id   AS composition_id,
  c.iswc,
  c.genre,
  c.bpm,
  c.musical_key,
  r.id   AS recording_id,
  r.isrc,
  r.cover_path,
  r.duration_sec,
  r.distributor_name,
  r.distributor_url,
  r.distribution_status,
  r.channel_links
FROM public.works w
LEFT JOIN public.compositions c ON c.work_id = w.id
LEFT JOIN public.recordings r ON r.work_id = w.id;

GRANT SELECT ON public.works_view TO authenticated;
GRANT ALL ON public.works_view TO service_role;