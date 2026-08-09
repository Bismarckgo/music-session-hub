-- work_versions
CREATE TABLE public.work_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  name text NOT NULL,
  version_type text NOT NULL DEFAULT 'original',
  isrc text,
  duration_sec integer,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.work_versions TO authenticated;
GRANT ALL ON public.work_versions TO service_role;
ALTER TABLE public.work_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own work versions" ON public.work_versions FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER work_versions_set_updated_at BEFORE UPDATE ON public.work_versions FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_work_versions_work ON public.work_versions(user_id, work_id);
CREATE INDEX idx_work_versions_isrc ON public.work_versions(user_id, isrc);

-- releases
CREATE TABLE public.releases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  title text NOT NULL,
  release_type text NOT NULL DEFAULT 'single',
  release_date date,
  upc text,
  distributor text,
  label_name text,
  cover_path text,
  status text NOT NULL DEFAULT 'planned',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.releases TO authenticated;
GRANT ALL ON public.releases TO service_role;
ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own releases" ON public.releases FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER releases_set_updated_at BEFORE UPDATE ON public.releases FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- release_tracks
CREATE TABLE public.release_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  release_id uuid NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  work_id uuid NOT NULL REFERENCES public.works(id) ON DELETE CASCADE,
  version_id uuid REFERENCES public.work_versions(id) ON DELETE SET NULL,
  track_no integer NOT NULL DEFAULT 1,
  isrc text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.release_tracks TO authenticated;
GRANT ALL ON public.release_tracks TO service_role;
ALTER TABLE public.release_tracks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own release tracks" ON public.release_tracks FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER release_tracks_set_updated_at BEFORE UPDATE ON public.release_tracks FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_release_tracks_release ON public.release_tracks(user_id, release_id, track_no);

-- royalty_reports
CREATE TABLE public.royalty_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  period_start date,
  period_end date,
  currency text NOT NULL DEFAULT 'USD',
  file_name text,
  total_amount numeric NOT NULL DEFAULT 0,
  line_count integer NOT NULL DEFAULT 0,
  matched_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.royalty_reports TO authenticated;
GRANT ALL ON public.royalty_reports TO service_role;
ALTER TABLE public.royalty_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own royalty reports" ON public.royalty_reports FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER royalty_reports_set_updated_at BEFORE UPDATE ON public.royalty_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- royalty_lines
CREATE TABLE public.royalty_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  report_id uuid NOT NULL REFERENCES public.royalty_reports(id) ON DELETE CASCADE,
  work_id uuid REFERENCES public.works(id) ON DELETE SET NULL,
  version_id uuid REFERENCES public.work_versions(id) ON DELETE SET NULL,
  isrc text,
  title text,
  artist text,
  platform text,
  territory text,
  units numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'USD',
  match_method text NOT NULL DEFAULT 'unmatched',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.royalty_lines TO authenticated;
GRANT ALL ON public.royalty_lines TO service_role;
ALTER TABLE public.royalty_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own royalty lines" ON public.royalty_lines FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE INDEX idx_royalty_lines_report ON public.royalty_lines(user_id, report_id);
CREATE INDEX idx_royalty_lines_work ON public.royalty_lines(user_id, work_id);
CREATE INDEX idx_royalty_lines_isrc ON public.royalty_lines(user_id, isrc);