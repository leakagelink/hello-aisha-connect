CREATE OR REPLACE FUNCTION public.guard_bypassed()
RETURNS boolean LANGUAGE sql STABLE SET search_path = public AS $$
  SELECT coalesce(current_setting('app.bypass_guard', true), '') = 'on';
$$;

REVOKE ALL ON FUNCTION public.guard_bypassed() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM public, anon;
REVOKE ALL ON FUNCTION public.can_access_conversation(uuid) FROM public, anon;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderate_message() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_conversation() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_conversation_fields() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_message_fields() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.create_conversation(text) FROM public, anon;
REVOKE ALL ON FUNCTION public.request_account_deletion(text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.create_conversation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;