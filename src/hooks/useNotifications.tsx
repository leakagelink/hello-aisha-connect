import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { isPushActive } from "@/lib/push";

type Permission = "default" | "granted" | "denied" | "unsupported";

export function useNotificationPermission() {
  const [permission, setPermission] = useState<Permission>("unsupported");

  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window) {
      setPermission(Notification.permission as Permission);
    }
  }, []);

  const request = useCallback(async () => {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    const result = await Notification.requestPermission();
    setPermission(result as Permission);
    return result;
  }, []);

  return { permission, request };
}

/**
 * Fallback device alert for background tabs. When real Firebase push is active
 * for this device, the service worker handles background delivery instead, so we
 * skip it here to avoid a duplicate notification.
 */
function show(title: string, body: string) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  if (typeof document !== "undefined" && document.visibilityState === "visible") return;
  if (isPushActive()) return;
  try {
    new Notification(title, { body, icon: "/icon-192.png", tag: title });
  } catch {
    /* notifications unavailable */
  }
}

/**
 * Listens for real Aisha replies and conversation status changes for the
 * signed-in member and surfaces them as in-app toasts plus (when the tab is in
 * the background and the member allowed it) a device notification.
 */
export function useMessageNotifications() {
  const { data: me } = useProfile();
  const queryClient = useQueryClient();
  const enabled = me?.profile?.notifications_enabled ?? true;
  const userId = me?.userId;
  const convIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!userId || !enabled) return;
    let cancelled = false;

    const load = async () => {
      const { data } = await supabase.from("conversations").select("id").eq("user_id", userId);
      if (!cancelled) convIds.current = new Set((data ?? []).map((c) => c.id));
    };
    void load();

    const channel = supabase
      .channel(`notify-${userId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload["new"] as {
            conversation_id: string;
            sender_id: string | null;
            content: string;
          };
          if (!convIds.current.has(row.conversation_id)) return;
          if (row.sender_id === userId) return;
          queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
          toast("Aisha replied to your message.");
          show("Aisha replied to your message.", row.content.slice(0, 120));
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `user_id=eq.${userId}` },
        (payload) => {
          const next = payload["new"] as { id: string; status: string };
          const prev = payload["old"] as { status?: string };
          convIds.current.add(next.id);
          if (prev?.status === next.status) return;
          queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
          if (next.status === "active") {
            toast("Your conversation request has been accepted.");
            show("Your conversation request has been accepted.", "Aisha is ready to talk.");
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "conversations", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload["new"] as { id: string };
          convIds.current.add(row.id);
        },
      )
      .subscribe();

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
    };
  }, [userId, enabled, queryClient]);
}
