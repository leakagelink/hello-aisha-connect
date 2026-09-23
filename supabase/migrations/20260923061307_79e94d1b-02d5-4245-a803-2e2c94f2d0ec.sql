
-- 1. Media columns on messages
ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS media_kind text NOT NULL DEFAULT 'text',
  ADD COLUMN IF NOT EXISTS media_path text,
  ADD COLUMN IF NOT EXISTS media_mime text;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_media_kind_check
  CHECK (media_kind IN ('text','emoji','image','video')) NOT VALID;
ALTER TABLE public.messages VALIDATE CONSTRAINT messages_media_kind_check;

-- 2. Rewarded ad sessions
CREATE TABLE IF NOT EXISTS public.rewarded_ad_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('emoji','image','video')),
  plan_ads integer NOT NULL CHECK (plan_ads BETWEEN 1 AND 3),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','completed','failed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
GRANT SELECT ON public.rewarded_ad_events TO authenticated;
GRANT ALL ON public.rewarded_ad_events TO service_role;
ALTER TABLE public.rewarded_ad_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own rewarded ad events" ON public.rewarded_ad_events
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE INDEX IF NOT EXISTS rewarded_ad_events_user_day
  ON public.rewarded_ad_events (user_id, created_at);

-- 3. Feature unlocks
CREATE TABLE IF NOT EXISTS public.feature_unlocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL CHECK (feature IN ('emoji','image','video')),
  progress_ads integer NOT NULL DEFAULT 0,
  required_ads integer NOT NULL DEFAULT 1,
  plan_hours integer NOT NULL DEFAULT 24,
  unlocked_at timestamptz,
  expires_at timestamptz,
  source text NOT NULL DEFAULT 'rewarded_ad',
  status text NOT NULL DEFAULT 'in_progress',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature)
);
GRANT SELECT ON public.feature_unlocks TO authenticated;
GRANT ALL ON public.feature_unlocks TO service_role;
ALTER TABLE public.feature_unlocks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own feature unlocks" ON public.feature_unlocks
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE TRIGGER feature_unlocks_updated BEFORE UPDATE ON public.feature_unlocks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Daily rewarded ad limit
CREATE TABLE IF NOT EXISTS public.daily_reward_limits (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  completed_ads integer NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
GRANT SELECT ON public.daily_reward_limits TO authenticated;
GRANT ALL ON public.daily_reward_limits TO service_role;
ALTER TABLE public.daily_reward_limits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own daily reward limits" ON public.daily_reward_limits
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

-- 5. Authorization helpers
CREATE OR REPLACE FUNCTION public.media_allowed(_uid uuid, _feature text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT _feature = 'text'
      OR public.has_role(_uid,'admin')
      OR EXISTS (
        SELECT 1 FROM public.feature_unlocks f
        WHERE f.user_id = _uid AND f.feature = _feature
          AND f.status = 'unlocked' AND f.expires_at > now()
      );
$$;
REVOKE ALL ON FUNCTION public.media_allowed(uuid, text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.media_allowed(uuid, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.daily_ads_used(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT coalesce((SELECT completed_ads FROM public.daily_reward_limits
                   WHERE user_id = _uid AND day = (now() AT TIME ZONE 'utc')::date), 0);
$$;
REVOKE ALL ON FUNCTION public.daily_ads_used(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.daily_ads_used(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.get_media_access()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); admin boolean; used integer; result jsonb;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in.'; END IF;
  admin := public.has_role(uid,'admin');
  IF admin THEN
    RETURN jsonb_build_object(
      'is_admin', true, 'requires_rewarded_ad', false,
      'daily_limit', null, 'daily_used', 0, 'daily_remaining', null,
      'features', jsonb_build_object(
        'emoji', jsonb_build_object('unlocked', true),
        'image', jsonb_build_object('unlocked', true),
        'video', jsonb_build_object('unlocked', true)));
  END IF;
  used := public.daily_ads_used(uid);
  SELECT jsonb_object_agg(f.feature, jsonb_build_object(
      'unlocked', (u.status = 'unlocked' AND u.expires_at > now()),
      'expires_at', CASE WHEN u.status = 'unlocked' AND u.expires_at > now() THEN u.expires_at END,
      'progress_ads', coalesce(CASE WHEN u.status = 'in_progress' THEN u.progress_ads END, 0),
      'required_ads', coalesce(CASE WHEN u.status = 'in_progress' THEN u.required_ads END, 0),
      'plan_hours', CASE WHEN u.status = 'in_progress' THEN u.plan_hours END))
    INTO result
  FROM (VALUES ('emoji'),('image'),('video')) AS f(feature)
  LEFT JOIN public.feature_unlocks u ON u.user_id = uid AND u.feature = f.feature;

  RETURN jsonb_build_object(
    'is_admin', false, 'requires_rewarded_ad', true,
    'daily_limit', 10, 'daily_used', used, 'daily_remaining', greatest(10 - used, 0),
    'features', result);
END; $$;
REVOKE ALL ON FUNCTION public.get_media_access() FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_media_access() TO authenticated, service_role;

-- 6. Rewarded ad session start (explicit, user initiated)
CREATE OR REPLACE FUNCTION public.start_rewarded_ad(_feature text, _plan_ads integer)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); used integer; sess uuid; u public.feature_unlocks%ROWTYPE; hours integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in.'; END IF;
  IF public.has_role(uid,'admin') THEN RAISE EXCEPTION 'ADMIN_NO_ADS'; END IF;
  IF _feature NOT IN ('emoji','image','video') THEN RAISE EXCEPTION 'INVALID_FEATURE'; END IF;
  IF _feature = 'emoji' AND _plan_ads <> 1 THEN RAISE EXCEPTION 'INVALID_PLAN'; END IF;
  IF _plan_ads < 1 OR _plan_ads > 3 THEN RAISE EXCEPTION 'INVALID_PLAN'; END IF;

  IF _feature = 'image' AND NOT public.media_allowed(uid,'emoji') THEN RAISE EXCEPTION 'EMOJI_REQUIRED'; END IF;
  IF _feature = 'video' AND NOT public.media_allowed(uid,'image') THEN RAISE EXCEPTION 'IMAGE_REQUIRED'; END IF;

  used := public.daily_ads_used(uid);
  IF used >= 10 THEN RAISE EXCEPTION 'DAILY_LIMIT_REACHED'; END IF;

  hours := CASE _feature
    WHEN 'emoji' THEN 24
    WHEN 'image' THEN CASE _plan_ads WHEN 1 THEN 5 WHEN 2 THEN 12 ELSE 24 END
    ELSE CASE _plan_ads WHEN 1 THEN 1 WHEN 2 THEN 2 ELSE 5 END END;

  SELECT * INTO u FROM public.feature_unlocks WHERE user_id = uid AND feature = _feature FOR UPDATE;
  IF u.id IS NULL THEN
    INSERT INTO public.feature_unlocks (user_id, feature, progress_ads, required_ads, plan_hours, status)
    VALUES (uid, _feature, 0, _plan_ads, hours, 'in_progress');
  ELSIF u.status <> 'in_progress' OR u.required_ads <> _plan_ads THEN
    UPDATE public.feature_unlocks
       SET progress_ads = 0, required_ads = _plan_ads, plan_hours = hours, status = 'in_progress'
     WHERE id = u.id;
  END IF;

  INSERT INTO public.rewarded_ad_events (user_id, feature, plan_ads, status)
  VALUES (uid, _feature, _plan_ads, 'pending') RETURNING id INTO sess;
  RETURN sess;
END; $$;
REVOKE ALL ON FUNCTION public.start_rewarded_ad(text, integer) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.start_rewarded_ad(text, integer) TO authenticated;

-- 7. Reward completion (idempotent)
CREATE OR REPLACE FUNCTION public.complete_rewarded_ad(_session_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); ev public.rewarded_ad_events%ROWTYPE; u public.feature_unlocks%ROWTYPE; used integer;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in.'; END IF;

  UPDATE public.rewarded_ad_events
     SET status = 'completed', completed_at = now()
   WHERE id = _session_id AND user_id = uid AND status = 'pending'
   RETURNING * INTO ev;

  IF ev.id IS NULL THEN
    -- duplicate callback, unknown session, or already processed: no double reward
    RETURN public.get_media_access();
  END IF;

  used := public.daily_ads_used(uid);
  IF used >= 10 THEN
    RETURN public.get_media_access();
  END IF;

  INSERT INTO public.daily_reward_limits (user_id, day, completed_ads)
  VALUES (uid, (now() AT TIME ZONE 'utc')::date, 1)
  ON CONFLICT (user_id, day) DO UPDATE
    SET completed_ads = public.daily_reward_limits.completed_ads + 1, updated_at = now();

  SELECT * INTO u FROM public.feature_unlocks
   WHERE user_id = uid AND feature = ev.feature FOR UPDATE;
  IF u.id IS NULL THEN RETURN public.get_media_access(); END IF;

  IF u.status = 'in_progress' THEN
    UPDATE public.feature_unlocks
       SET progress_ads = u.progress_ads + 1
     WHERE id = u.id RETURNING * INTO u;

    IF u.progress_ads >= u.required_ads THEN
      UPDATE public.feature_unlocks
         SET status = 'unlocked', progress_ads = 0,
             unlocked_at = now(),
             expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(hours => u.plan_hours)
       WHERE id = u.id;
    END IF;
  END IF;

  RETURN public.get_media_access();
END; $$;
REVOKE ALL ON FUNCTION public.complete_rewarded_ad(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.complete_rewarded_ad(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.cancel_rewarded_ad(_session_id uuid)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.rewarded_ad_events SET status = 'failed'
   WHERE id = _session_id AND user_id = auth.uid() AND status = 'pending';
$$;
REVOKE ALL ON FUNCTION public.cancel_rewarded_ad(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.cancel_rewarded_ad(uuid) TO authenticated;

-- 8. Server-side enforcement on message insert
CREATE OR REPLACE FUNCTION public.moderate_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE recent INT; conv public.conversations%ROWTYPE; lowered TEXT; prof public.profiles%ROWTYPE; staff boolean;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF conv.id IS NULL THEN RAISE EXCEPTION 'Conversation not found.'; END IF;

  IF auth.uid() IS NOT NULL AND NOT public.guard_bypassed() THEN
    staff := public.is_staff(auth.uid());
    NEW.sender_id := auth.uid();
    NEW.is_system := false;
    NEW.moderation_status := 'allowed';
    NEW.is_read := false;

    SELECT * INTO prof FROM public.profiles WHERE id = auth.uid();
    IF prof.account_status IN ('banned','suspended') THEN RAISE EXCEPTION 'ACCOUNT_RESTRICTED'; END IF;
    IF prof.muted_until IS NOT NULL AND prof.muted_until > now() THEN RAISE EXCEPTION 'ACCOUNT_MUTED'; END IF;
    IF conv.blocked_by_user THEN RAISE EXCEPTION 'CONVERSATION_BLOCKED'; END IF;
    IF conv.status IN ('closed','declined') THEN RAISE EXCEPTION 'This conversation is closed.'; END IF;

    IF coalesce(NEW.media_kind,'text') <> 'text'
       AND NOT public.media_allowed(auth.uid(), NEW.media_kind) THEN
      RAISE EXCEPTION 'MEDIA_LOCKED';
    END IF;

    SELECT count(*) INTO recent FROM public.messages
      WHERE sender_id = auth.uid() AND created_at > now() - interval '1 minute';
    IF recent >= 20 THEN RAISE EXCEPTION 'RATE_LIMIT'; END IF;
  END IF;

  lowered := lower(NEW.content);
  IF lowered ~ '(kill you|kill myself|end my life|suicide|hurt myself|rape|i will find you|send nudes|nude pic|whatsapp me|telegram me|bitcoin|crypto invest|wire transfer|gift card|bank details|child|underage)' THEN
    NEW.moderation_status := 'flagged';
  END IF;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.moderate_message() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.moderate_message() TO service_role;

-- keep media path/kind immutable on update
CREATE OR REPLACE FUNCTION public.protect_message_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR public.guard_bypassed() THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.conversation_id := OLD.conversation_id;
  NEW.sender_id := OLD.sender_id;
  NEW.is_system := OLD.is_system;
  NEW.content := OLD.content;
  NEW.created_at := OLD.created_at;
  NEW.media_kind := OLD.media_kind;
  NEW.media_path := OLD.media_path;
  NEW.media_mime := OLD.media_mime;
  IF NOT public.is_staff(auth.uid()) THEN
    NEW.moderation_status := OLD.moderation_status;
  END IF;
  RETURN NEW;
END; $function$;
REVOKE ALL ON FUNCTION public.protect_message_fields() FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_message_fields() TO service_role;
