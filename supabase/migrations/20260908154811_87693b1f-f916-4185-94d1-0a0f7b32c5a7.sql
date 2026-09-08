-- 1) Guard flag helper
CREATE OR REPLACE FUNCTION public.guard_bypassed()
RETURNS boolean LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.bypass_guard', true), '') = 'on';
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_uid,'admin') OR public.has_role(_uid,'listener');
$$;

-- 2) Profiles: lock admin-only fields
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NOT public.has_role(auth.uid(),'admin') AND NOT public.guard_bypassed() THEN
    NEW.id := OLD.id;
    NEW.email := OLD.email;
    NEW.account_status := OLD.account_status;
    NEW.muted_until := OLD.muted_until;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS profiles_protect ON public.profiles;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- 3) Conversations: block direct inserts, restrict updates
DROP POLICY IF EXISTS "user creates own conversation" ON public.conversations;

CREATE OR REPLACE FUNCTION public.protect_conversation_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE staff boolean;
BEGIN
  IF auth.uid() IS NULL OR public.guard_bypassed() THEN RETURN NEW; END IF;
  staff := public.is_staff(auth.uid());

  IF NOT staff THEN
    NEW.user_id := OLD.user_id;
    NEW.listener_id := OLD.listener_id;
    NEW.accepted_at := OLD.accepted_at;
    NEW.requested_at := OLD.requested_at;
    IF NEW.status IS DISTINCT FROM OLD.status AND NEW.status <> 'closed' THEN
      NEW.status := OLD.status;
    END IF;
    IF OLD.blocked_by_user AND NOT NEW.blocked_by_user THEN
      NEW.blocked_by_user := true;
    END IF;
  ELSE
    IF NEW.listener_id IS DISTINCT FROM OLD.listener_id
       AND NOT public.has_role(auth.uid(),'admin')
       AND NEW.listener_id IS DISTINCT FROM auth.uid() THEN
      RAISE EXCEPTION 'Not allowed to assign another listener.';
    END IF;
    NEW.user_id := OLD.user_id;
  END IF;

  IF OLD.blocked_by_user THEN
    NEW.blocked_by_user := true;
    NEW.status := 'closed';
  END IF;

  IF NEW.status = 'closed' AND OLD.status <> 'closed' AND NEW.closed_at IS NULL THEN
    NEW.closed_at := now();
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS conversations_protect ON public.conversations;
CREATE TRIGGER conversations_protect BEFORE UPDATE ON public.conversations
FOR EACH ROW EXECUTE FUNCTION public.protect_conversation_fields();

-- 4) Secure conversation creation
CREATE OR REPLACE FUNCTION public.create_conversation(_topic text DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid(); conv_id uuid; aisha uuid; st account_status;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in.'; END IF;
  SELECT account_status INTO st FROM public.profiles WHERE id = uid;
  IF st IN ('banned','suspended') THEN RAISE EXCEPTION 'ACCOUNT_RESTRICTED'; END IF;

  SELECT listener_id INTO aisha FROM public.listener_availability
   ORDER BY is_primary DESC, updated_at ASC LIMIT 1;

  PERFORM set_config('app.bypass_guard','on', true);
  INSERT INTO public.conversations (user_id, listener_id, topic, status)
  VALUES (uid, aisha, nullif(btrim(coalesce(_topic,'')),''), 'requested')
  RETURNING id INTO conv_id;

  INSERT INTO public.messages (conversation_id, sender_id, is_system, content)
  VALUES (conv_id, NULL, true,
    'Thanks for reaching out. Aisha will reply when she is available. Wait times may vary depending on availability.');
  PERFORM set_config('app.bypass_guard','off', true);
  RETURN conv_id;
END; $$;

REVOKE ALL ON FUNCTION public.create_conversation(text) FROM public;
GRANT EXECUTE ON FUNCTION public.create_conversation(text) TO authenticated;

-- 5) Messages: immutable except read marker
CREATE OR REPLACE FUNCTION public.protect_message_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF auth.uid() IS NULL OR public.guard_bypassed() THEN RETURN NEW; END IF;
  NEW.id := OLD.id;
  NEW.conversation_id := OLD.conversation_id;
  NEW.sender_id := OLD.sender_id;
  NEW.is_system := OLD.is_system;
  NEW.content := OLD.content;
  NEW.created_at := OLD.created_at;
  IF NOT public.is_staff(auth.uid()) THEN
    NEW.moderation_status := OLD.moderation_status;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS messages_protect ON public.messages;
CREATE TRIGGER messages_protect BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.protect_message_fields();

-- 6) Hardened insert moderation
CREATE OR REPLACE FUNCTION public.moderate_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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

    SELECT count(*) INTO recent FROM public.messages
      WHERE sender_id = auth.uid() AND created_at > now() - interval '1 minute';
    IF recent >= 20 THEN RAISE EXCEPTION 'RATE_LIMIT'; END IF;
  END IF;

  lowered := lower(NEW.content);
  IF lowered ~ '(kill you|kill myself|end my life|suicide|hurt myself|rape|i will find you|send nudes|nude pic|whatsapp me|telegram me|bitcoin|crypto invest|wire transfer|gift card|bank details|child|underage)' THEN
    NEW.moderation_status := 'flagged';
  END IF;
  RETURN NEW;
END; $$;

-- 7) Secure account deletion request
CREATE OR REPLACE FUNCTION public.request_account_deletion(_reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'Not signed in.'; END IF;
  INSERT INTO public.account_deletion_requests (user_id, email, reason)
  SELECT uid, p.email, _reason FROM public.profiles p WHERE p.id = uid;
  PERFORM set_config('app.bypass_guard','on', true);
  UPDATE public.profiles SET account_status = 'deletion_requested' WHERE id = uid;
  PERFORM set_config('app.bypass_guard','off', true);
END; $$;

REVOKE ALL ON FUNCTION public.request_account_deletion(text) FROM public;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;