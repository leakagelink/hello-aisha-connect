
-- ROLES
CREATE TYPE public.app_role AS ENUM ('user','listener','admin');
CREATE TYPE public.conversation_status AS ENUM ('requested','waiting','active','closed','declined');
CREATE TYPE public.moderation_status AS ENUM ('allowed','flagged','blocked','under_review');
CREATE TYPE public.availability_status AS ENUM ('available','away','not_accepting');
CREATE TYPE public.account_status AS ENUM ('active','warned','muted','suspended','banned','deletion_requested');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- PROFILES
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  email TEXT,
  account_status public.account_status NOT NULL DEFAULT 'active',
  muted_until TIMESTAMPTZ,
  notifications_enabled BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'listener'));
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "own profile insert" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());
CREATE TRIGGER profiles_updated BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "read own roles" ON public.user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, username)
  VALUES (NEW.id, NEW.email, NULL)
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id,'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ONBOARDING
CREATE TABLE public.user_onboarding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  selected_reasons TEXT[] NOT NULL DEFAULT '{}',
  is_adult_confirmed BOOLEAN NOT NULL DEFAULT false,
  terms_accepted BOOLEAN NOT NULL DEFAULT false,
  peer_support_acknowledged BOOLEAN NOT NULL DEFAULT false,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.user_onboarding TO authenticated;
GRANT ALL ON public.user_onboarding TO service_role;
ALTER TABLE public.user_onboarding ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own onboarding" ON public.user_onboarding FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- LISTENER AVAILABILITY
CREATE TABLE public.listener_availability (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listener_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL DEFAULT 'Aisha',
  status public.availability_status NOT NULL DEFAULT 'away',
  is_primary BOOLEAN NOT NULL DEFAULT false,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.listener_availability TO authenticated;
GRANT INSERT, UPDATE ON public.listener_availability TO authenticated;
GRANT ALL ON public.listener_availability TO service_role;
ALTER TABLE public.listener_availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone signed in can see availability" ON public.listener_availability
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "listener manages own availability" ON public.listener_availability
  FOR UPDATE TO authenticated
  USING (listener_id = auth.uid() OR public.has_role(auth.uid(),'admin'))
  WITH CHECK (listener_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin adds availability" ON public.listener_availability
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(),'admin'));

-- CONVERSATIONS
CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  listener_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status public.conversation_status NOT NULL DEFAULT 'requested',
  topic TEXT,
  blocked_by_user BOOLEAN NOT NULL DEFAULT false,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  accepted_at TIMESTAMPTZ,
  closed_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.conversations TO authenticated;
GRANT ALL ON public.conversations TO service_role;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or assigned conversations" ON public.conversations FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR listener_id = auth.uid()
    OR public.has_role(auth.uid(),'admin')
    OR (listener_id IS NULL AND public.has_role(auth.uid(),'listener')));
CREATE POLICY "user creates own conversation" ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "update own or assigned conversation" ON public.conversations FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR listener_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR (listener_id IS NULL AND public.has_role(auth.uid(),'listener')))
  WITH CHECK (user_id = auth.uid() OR listener_id = auth.uid() OR public.has_role(auth.uid(),'admin')
    OR public.has_role(auth.uid(),'listener'));
CREATE TRIGGER conversations_updated BEFORE UPDATE ON public.conversations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.can_access_conversation(_conversation_id UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conversation_id
      AND (c.user_id = auth.uid() OR c.listener_id = auth.uid()
           OR public.has_role(auth.uid(),'admin'))
  );
$$;

-- MESSAGES
CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_system BOOLEAN NOT NULL DEFAULT false,
  content TEXT NOT NULL CHECK (char_length(content) BETWEEN 1 AND 4000),
  moderation_status public.moderation_status NOT NULL DEFAULT 'allowed',
  is_read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read messages in own conversations" ON public.messages FOR SELECT TO authenticated
  USING (public.can_access_conversation(conversation_id) AND moderation_status <> 'blocked');
CREATE POLICY "send messages in own conversations" ON public.messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid() AND public.can_access_conversation(conversation_id));
CREATE POLICY "update read state" ON public.messages FOR UPDATE TO authenticated
  USING (public.can_access_conversation(conversation_id))
  WITH CHECK (public.can_access_conversation(conversation_id));
CREATE INDEX messages_conversation_idx ON public.messages (conversation_id, created_at);

-- moderation + rate limit trigger
CREATE OR REPLACE FUNCTION public.moderate_message()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE recent INT; conv public.conversations%ROWTYPE; lowered TEXT;
BEGIN
  SELECT * INTO conv FROM public.conversations WHERE id = NEW.conversation_id;
  IF conv.status IN ('closed','declined') THEN
    RAISE EXCEPTION 'This conversation is closed.';
  END IF;
  IF NOT NEW.is_system THEN
    SELECT count(*) INTO recent FROM public.messages
      WHERE sender_id = NEW.sender_id AND created_at > now() - interval '1 minute';
    IF recent >= 20 THEN
      RAISE EXCEPTION 'RATE_LIMIT';
    END IF;
  END IF;
  lowered := lower(NEW.content);
  IF lowered ~ '(kill you|rape|i will find you|send nudes|whatsapp me|bitcoin|crypto invest|wire transfer|nude pic)' THEN
    NEW.moderation_status := 'flagged';
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER messages_moderate BEFORE INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.moderate_message();

CREATE OR REPLACE FUNCTION public.touch_conversation()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END; $$;
CREATE TRIGGER messages_touch AFTER INSERT ON public.messages
  FOR EACH ROW EXECUTE FUNCTION public.touch_conversation();

-- DAILY CHECKINS
CREATE TABLE public.daily_checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mood TEXT NOT NULL,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.daily_checkins TO authenticated;
GRANT ALL ON public.daily_checkins TO service_role;
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own checkins" ON public.daily_checkins FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- REPORTS
CREATE TABLE public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolved_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.reports TO authenticated;
GRANT ALL ON public.reports TO service_role;
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "reporter reads own reports" ON public.reports FOR SELECT TO authenticated
  USING (reporter_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create own report" ON public.reports FOR INSERT TO authenticated
  WITH CHECK (reporter_id = auth.uid());
CREATE POLICY "admin updates reports" ON public.reports FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- MODERATION ACTIONS
CREATE TABLE public.moderation_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  target_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  reason TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.moderation_actions TO authenticated;
GRANT ALL ON public.moderation_actions TO service_role;
ALTER TABLE public.moderation_actions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin only moderation actions" ON public.moderation_actions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- INTERNAL NOTES
CREATE TABLE public.internal_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  note TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.internal_notes TO authenticated;
GRANT ALL ON public.internal_notes TO service_role;
ALTER TABLE public.internal_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "staff only notes" ON public.internal_notes FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'listener'))
  WITH CHECK (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'listener'));

-- ACCOUNT DELETION
CREATE TABLE public.account_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  processed_at TIMESTAMPTZ
);
GRANT SELECT, INSERT ON public.account_deletion_requests TO authenticated;
GRANT ALL ON public.account_deletion_requests TO service_role;
ALTER TABLE public.account_deletion_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own deletion requests" ON public.account_deletion_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "create own deletion request" ON public.account_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ANALYTICS
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_name TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT SELECT ON public.analytics_events TO service_role;
GRANT ALL ON public.analytics_events TO service_role;
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "insert own events" ON public.analytics_events FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "admin reads events" ON public.analytics_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;
