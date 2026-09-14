import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Shared online-presence channel.
 *
 * Every signed-in person (member or Aisha) joins the same Realtime presence
 * channel and tracks their own user id. Anyone on the channel can therefore
 * see, in real time, which other user ids currently have the app open.
 */
const PRESENCE_CHANNEL = "hello-aisha-presence";

export function useOnlineUsers(userId: string | null | undefined) {
  const [online, setOnline] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (!userId) return;
    const channel = supabase.channel(PRESENCE_CHANNEL, {
      config: { presence: { key: userId } },
    });

    const sync = () => {
      const state = channel.presenceState();
      setOnline(new Set(Object.keys(state)));
    };

    channel
      .on("presence", { event: "sync" }, sync)
      .on("presence", { event: "join" }, sync)
      .on("presence", { event: "leave" }, sync)
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          void channel.track({ user_id: userId, at: new Date().toISOString() });
        }
      });

    return () => {
      void channel.untrack();
      supabase.removeChannel(channel);
      setOnline(new Set());
    };
  }, [userId]);

  return online;
}

export function isOnline(online: Set<string>, id: string | null | undefined) {
  return !!id && online.has(id);
}
