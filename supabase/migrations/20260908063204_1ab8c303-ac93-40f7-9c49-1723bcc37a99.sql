
GRANT DELETE ON public.conversations TO authenticated;
CREATE POLICY "user deletes own conversations" ON public.conversations FOR DELETE TO authenticated
  USING (user_id = auth.uid());
GRANT DELETE ON public.messages TO authenticated;
CREATE POLICY "user deletes messages in own conversations" ON public.messages FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
