
CREATE OR REPLACE FUNCTION public.purge_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE ref text;
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user id required'; END IF;
  ref := encode(sha256(convert_to(_user_id::text || 'hello-aisha-safety', 'UTF8')), 'hex');

  PERFORM set_config('app.bypass_guard','on', true);

  INSERT INTO public.retained_safety_records (subject_ref, record_type, reason, occurred_at)
  SELECT ref, 'report', left(coalesce(r.reason,''), 120), r.created_at
  FROM public.reports r WHERE r.reporter_id = _user_id;

  INSERT INTO public.retained_safety_records (subject_ref, record_type, reason, occurred_at)
  SELECT ref, 'moderation_action:' || m.action, left(coalesce(m.reason,''), 120), m.created_at
  FROM public.moderation_actions m WHERE m.target_user_id = _user_id;

  DELETE FROM public.internal_notes
    WHERE author_id = _user_id
       OR conversation_id IN (SELECT id FROM public.conversations WHERE user_id = _user_id);
  DELETE FROM public.messages WHERE sender_id = _user_id;
  DELETE FROM public.messages
    WHERE conversation_id IN (SELECT id FROM public.conversations WHERE user_id = _user_id);
  DELETE FROM public.reports WHERE reporter_id = _user_id;
  DELETE FROM public.conversations WHERE user_id = _user_id;
  DELETE FROM public.daily_checkins WHERE user_id = _user_id;
  DELETE FROM public.user_onboarding WHERE user_id = _user_id;
  DELETE FROM public.push_tokens WHERE user_id = _user_id;
  DELETE FROM public.analytics_events WHERE user_id = _user_id;
  DELETE FROM public.moderation_actions WHERE target_user_id = _user_id;
  DELETE FROM public.user_roles WHERE user_id = _user_id;
  DELETE FROM public.listener_availability WHERE listener_id = _user_id;
  DELETE FROM public.profiles WHERE id = _user_id;
  DELETE FROM public.account_deletion_requests WHERE user_id = _user_id;

  PERFORM set_config('app.bypass_guard','off', true);
END; $$;

REVOKE ALL ON FUNCTION public.purge_user_data(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_user_data(uuid) TO service_role;
