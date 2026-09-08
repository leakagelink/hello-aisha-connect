-- 1) Lock down SECURITY DEFINER functions from direct execution by signed-in users
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.moderate_message() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_conversation_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_message_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_profile_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.touch_conversation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.update_updated_at_column() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM PUBLIC, anon, authenticated;

-- Keep the routines the app legitimately calls
GRANT EXECUTE ON FUNCTION public.create_conversation(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_account_deletion(text) TO authenticated;
-- Needed inside RLS policies evaluated as the calling role
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_conversation(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_bypassed() TO authenticated;

-- 2) listener_availability: allow admins to delete stale rows
DROP POLICY IF EXISTS "admin deletes availability" ON public.listener_availability;
CREATE POLICY "admin deletes availability"
ON public.listener_availability FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- 3) profiles: listeners only see profiles of users in their conversations
DROP POLICY IF EXISTS "own profile read" ON public.profiles;
CREATE POLICY "own profile read"
ON public.profiles FOR SELECT TO authenticated
USING (
  id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR (
    public.has_role(auth.uid(), 'listener')
    AND EXISTS (
      SELECT 1 FROM public.conversations c
      WHERE c.user_id = profiles.id
        AND c.listener_id = auth.uid()
    )
  )
);

-- 4) user_roles: explicit admin-only management path
DROP POLICY IF EXISTS "admin inserts roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin updates roles" ON public.user_roles;
DROP POLICY IF EXISTS "admin deletes roles" ON public.user_roles;
CREATE POLICY "admin inserts roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin updates roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin deletes roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT DELETE ON public.listener_availability TO authenticated;