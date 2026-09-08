import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { listenForegroundPush } from "@/lib/push";
import {
  listenNativePush,
  autoRegisterNativePush,
  startNativeTokenSync,
} from "@/lib/native-push";

/**
 * Live alerts for members: a real toast (and a browser notification when the
 * tab is in the background) whenever Aisha replies or becomes available.
 * Only real database events drive these — nothing is simulated.
 */
export function LiveAlerts() {
  const me = useProfile().data;
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  useEffect(() => {
    if (!me?.userId || me.isStaff) return;

    const notify = (title: string, body: string, path: string) => {
      toast(title, {
        description: body || undefined,
        action: { label: "Open", onClick: () => navigate({ to: path as never }) },
      });
      if (
        typeof window !== "undefined" &&
        "Notification" in window &&
        Notification.permission === "granted" &&
        document.visibilityState !== "visible"
      ) {
        try {
          const n = new Notification(title, { body, icon: "/favicon.png", tag: path });
          n.onclick = () => {
            window.focus();
            navigate({ to: path as never });
          };
        } catch {
          /* notification not allowed in this context */
        }
      }
    };

    const channel = supabase
      .channel(`member-alerts-${me.userId}`)
      // RLS keeps this to conversations the member is part of.
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const row = payload.new as {
            sender_id: string | null;
            is_system: boolean;
            content: string;
            conversation_id: string;
          };
          if (row.is_system || !row.sender_id || row.sender_id === me.userId) return;
          queryClient.invalidateQueries({ queryKey: ["chats"] });
          notify("Aisha replied to your message.", row.content.slice(0, 120), `/chat/${row.conversation_id}`);
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "listener_availability" },
        (payload) => {
          const next = payload.new as { status: string };
          const prev = payload.old as { status?: string };
          queryClient.invalidateQueries({ queryKey: ["availability"] });
          if (next.status === "available" && prev?.status !== "available") {
            notify("Aisha is available.", "You can start a conversation now.", "/home");
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations" },
        (payload) => {
          const next = payload.new as { status: string; id: string; user_id: string };
          const prev = payload.old as { status?: string };
          if (next.user_id !== me.userId) return;
          queryClient.invalidateQueries({ queryKey: ["chats"] });
          if (next.status === "active" && prev?.status !== "active") {
            notify(
              "Your conversation request has been accepted.",
              "Aisha is ready to talk.",
              `/chat/${next.id}`,
            );
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.userId, me?.isStaff, queryClient, navigate]);

  // If the phone already granted notification permission (e.g. at install),
  // register this device silently so pushes arrive even when the app is closed.
  useEffect(() => {
    if (!me?.userId) return;
    const stopSync = startNativeTokenSync(me.userId);
    void autoRegisterNativePush(me.userId);
    return stopSync;
  }, [me?.userId]);

  // Native (Android app) pushes: foreground delivery and taps on a
  // background/system notification.
  useEffect(() => {
    if (!me?.userId || me.isStaff) return;
    return listenNativePush({
      onForeground: (n) => {
        toast(n.title ?? "Hello Aisha", {
          description: n.body,
          action: n.path
            ? { label: "Open", onClick: () => navigate({ to: n.path as never }) }
            : undefined,
        });
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      },
      onOpen: (path) => navigate({ to: path as never }),
    });
  }, [me?.userId, me?.isStaff, navigate, queryClient]);

  // Push messages that arrive while the app is open in the foreground.
  useEffect(() => {
    if (!me?.userId || me.isStaff) return;
    const stop = listenForegroundPush((payload) => {
      const title = payload.title ?? "Hello Aisha";
      toast(title, {
        description: payload.body,
        action: payload.path
          ? { label: "Open", onClick: () => navigate({ to: payload.path as never }) }
          : undefined,
      });
    });
    return stop;
  }, [me?.userId, me?.isStaff, navigate]);

  return null;
}
