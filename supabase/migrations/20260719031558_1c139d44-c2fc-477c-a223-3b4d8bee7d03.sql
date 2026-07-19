
ALTER TABLE public.works
  ADD COLUMN IF NOT EXISTS cover_path text,
  ADD COLUMN IF NOT EXISTS distributor_name text,
  ADD COLUMN IF NOT EXISTS distributor_url text,
  ADD COLUMN IF NOT EXISTS distribution_status text NOT NULL DEFAULT 'sin_distribuir',
  ADD COLUMN IF NOT EXISTS channel_links jsonb NOT NULL DEFAULT '{}'::jsonb;

DROP POLICY IF EXISTS "Users read own covers" ON storage.objects;
CREATE POLICY "Users read own covers"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users upload own covers" ON storage.objects;
CREATE POLICY "Users upload own covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users update own covers" ON storage.objects;
CREATE POLICY "Users update own covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "Users delete own covers" ON storage.objects;
CREATE POLICY "Users delete own covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'covers' AND auth.uid()::text = (storage.foldername(name))[1]);
