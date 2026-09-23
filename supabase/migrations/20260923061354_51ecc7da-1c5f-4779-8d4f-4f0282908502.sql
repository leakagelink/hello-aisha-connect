
CREATE POLICY "chat media readable by conversation members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-media'
  AND public.can_access_conversation(((storage.foldername(name))[1])::uuid)
);

CREATE POLICY "chat media upload when allowed"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-media'
  AND owner = auth.uid()
  AND public.can_access_conversation(((storage.foldername(name))[1])::uuid)
  AND (storage.foldername(name))[2] IN ('image','video')
  AND public.media_allowed(auth.uid(), (storage.foldername(name))[2])
);

CREATE POLICY "chat media owner delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'chat-media' AND owner = auth.uid());
