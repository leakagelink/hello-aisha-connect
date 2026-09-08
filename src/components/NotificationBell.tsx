import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Bell that links to Chats and shows the member's real unread message count.
 * The count only ever comes from real unread messages in the database.
 */
export function NotificationBell() {
  const { data: unread = 0 } = useQuery({
    queryKey: ["unread-count"],
    queryFn: async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return 0;
      const { data: convs } = await supabase
        .from("conversations")
        .select("id")
        .eq("user_id", auth.user.id);
      const ids = (convs ?? []).map((c) => c.id);
      if (ids.length === 0) return 0;
      const { count } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids)
        .eq("is_read", false)
        .neq("sender_id", auth.user.id);
      return count ?? 0;
    },
    refetchInterval: 20000,
  });

  return (
    <Link
      to="/chats"
      aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
      className="relative inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-accent/20"
    >
      <Bell className="size-5" aria-hidden="true" />
      {unread > 0 ? (
        <span className="absolute right-1.5 top-1.5 inline-flex min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold leading-4 text-primary-foreground">
          {unread > 9 ? "9+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
