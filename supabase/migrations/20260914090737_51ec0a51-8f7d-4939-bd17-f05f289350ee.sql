-- 1. Destructive maintenance routines: server-only
REVOKE ALL ON FUNCTION public.purge_user_data(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.purge_expired_safety_records() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.record_deletion_failure(uuid, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_data(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.purge_expired_safety_records() TO service_role;
GRANT EXECUTE ON FUNCTION public.record_deletion_failure(uuid, text) TO service_role;

-- 2. Trigger routines are never called directly
REVOKE ALL ON FUNCTION public.moderate_message() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_conversation_fields() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_message_fields() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_conversation() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;

-- 3. Abuse guard: message size limit
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_length_check
  CHECK (char_length(content) > 0 AND char_length(content) <= 4000) NOT VALID;
ALTER TABLE public.messages VALIDATE CONSTRAINT messages_content_length_check;

-- 4. Abuse guard: topic / report text size limits
ALTER TABLE public.conversations
  ADD CONSTRAINT conversations_topic_length_check
  CHECK (topic IS NULL OR char_length(topic) <= 300) NOT VALID;
ALTER TABLE public.conversations VALIDATE CONSTRAINT conversations_topic_length_check;

ALTER TABLE public.reports
  ADD CONSTRAINT reports_text_length_check
  CHECK (char_length(reason) <= 300 AND (description IS NULL OR char_length(description) <= 2000)) NOT VALID;
ALTER TABLE public.reports VALIDATE CONSTRAINT reports_text_length_check;