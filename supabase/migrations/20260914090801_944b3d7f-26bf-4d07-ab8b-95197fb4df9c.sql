REVOKE ALL ON FUNCTION public.is_staff(uuid) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff(uuid) TO service_role;