
CREATE TABLE IF NOT EXISTS public.retained_safety_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_ref text NOT NULL,
  record_type text NOT NULL,
  reason text,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  retain_until timestamptz NOT NULL DEFAULT (now() + interval '12 months'),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.retained_safety_records TO authenticated;
GRANT ALL ON public.retained_safety_records TO service_role;

ALTER TABLE public.retained_safety_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin reads retained safety records" ON public.retained_safety_records;
CREATE POLICY "admin reads retained safety records"
ON public.retained_safety_records FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE public.account_deletion_requests
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_error text;

CREATE OR REPLACE FUNCTION public.purge_expired_safety_records()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  DELETE FROM public.retained_safety_records WHERE retain_until < now();
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END; $$;

REVOKE ALL ON FUNCTION public.purge_expired_safety_records() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_safety_records() TO service_role;

CREATE OR REPLACE FUNCTION public.purge_user_data(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE ref text := encode(digest(_user_id::text || 'hello-aisha-safety', 'sha256'), 'hex');
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'user id required'; END IF;

  PERFORM set_config('app.bypass_guard','on', true);

  -- Keep only a minimal pseudonymous safety record where the account was
  -- involved in a report or a moderation action.
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

CREATE OR REPLACE FUNCTION public.record_deletion_failure(_user_id uuid, _error text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.account_deletion_requests
     SET status = 'failed', attempts = attempts + 1, last_error = left(coalesce(_error,''), 500)
   WHERE user_id = _user_id AND status <> 'completed';
END; $$;

REVOKE ALL ON FUNCTION public.record_deletion_failure(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_deletion_failure(uuid, text) TO service_role;
