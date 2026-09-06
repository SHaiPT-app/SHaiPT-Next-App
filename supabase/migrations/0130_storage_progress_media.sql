-- Private bucket for progress photos and videos (api/progress-media). Objects live under
-- `<user id>/<timestamp>.<ext>`; a user reads and writes only their own folder, coaches read
-- their active clients' folders, everything else goes through signed URLs from the API.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('progress-media', 'progress-media', false, 26214400,
        ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'video/mp4', 'video/quicktime', 'video/webm'])
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit, allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "progress_media_read_own" ON storage.objects;
CREATE POLICY "progress_media_read_own" ON storage.objects FOR SELECT TO authenticated
    USING (bucket_id = 'progress-media'
           AND ((storage.foldername(name))[1] = auth.uid()::text
                OR is_coach_of(((storage.foldername(name))[1])::uuid)));

DROP POLICY IF EXISTS "progress_media_insert_own" ON storage.objects;
CREATE POLICY "progress_media_insert_own" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'progress-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "progress_media_update_own" ON storage.objects;
CREATE POLICY "progress_media_update_own" ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'progress-media' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "progress_media_delete_own" ON storage.objects;
CREATE POLICY "progress_media_delete_own" ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'progress-media' AND (storage.foldername(name))[1] = auth.uid()::text);
