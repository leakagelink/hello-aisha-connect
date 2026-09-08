import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useProfile() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) return null;
      const [{ data: profile, error }, { data: roles }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
      ]);
      if (error) throw error;
      const roleList = (roles ?? []).map((r) => r.role);
      return {
        userId: user.id,
        email: user.email ?? null,
        profile,
        roles: roleList,
        isStaff: roleList.includes("admin") || roleList.includes("listener"),
        isAdmin: roleList.includes("admin"),
      };
    },
  });
}

export function useAvailability() {
  return useQuery({
    queryKey: ["availability"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listener_availability")
        .select("*")
        .order("is_primary", { ascending: false })
        .limit(1);
      if (error) throw error;
      return data?.[0] ?? null;
    },
    refetchInterval: 30000,
  });
}

export function useMyConversations() {
  return useQuery({
    queryKey: ["my-conversations"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return [];
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("user_id", auth.user.id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
}
