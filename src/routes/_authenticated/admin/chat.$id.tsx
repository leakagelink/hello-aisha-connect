import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ArrowLeft, Send } from "lucide-react";
import { sendConversationPush } from "@/lib/notifications.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LoadingView, ErrorView } from "@/components/StateViews";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { formatTime, formatWhen, logEvent } from "@/lib/aisha";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/chat/$id")({
  component: AdminChat,
});

function AdminChat() {
  const { id } = Route.useParams();
  const me = useProfile().data;
  const queryClient = useQueryClient();
  const sendPush = useServerFn(sendConversationPush);
  const [draft, setDraft] = useState("");
  const [note, setNote] = useState("");
  const [action, setAction] = useState("warning");
  const [reason, setReason] = useState("");
  const endRef = useRef<HTMLDivElement>(null);

  const conversation = useQuery({
    queryKey: ["admin-conversation", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const member = useQuery({
    queryKey: ["admin-member", conversation.data?.user_id],
    enabled: !!conversation.data?.user_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, account_status")
        .eq("id", conversation.data!.user_id)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const messages = useQuery({
    queryKey: ["admin-messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data ?? [];
    },
  });

  const notes = useQuery({
    queryKey: ["admin-notes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("internal_notes")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    const channel = supabase
      .channel(`admin-conversation-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => queryClient.invalidateQueries({ queryKey: ["admin-messages", id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data]);

  const send = async () => {
    const content = draft.trim();
    if (!content || !me?.userId) return;
    const conv = conversation.data;
    if (conv && conv.status !== "active") {
      const { error: statusError } = await supabase
        .from("conversations")
        .update({ status: "active", listener_id: me.userId, accepted_at: new Date().toISOString() })
        .eq("id", id);
      if (statusError) {
        toast.error(statusError.message);
        return;
      }
      await logEvent("conversation_accepted");
    }
    const { error } = await supabase
      .from("messages")
      .insert({ conversation_id: id, sender_id: me.userId, content });
    if (error) {
      toast.error(error.message);
      return;
    }
    setDraft("");
    await logEvent("first_human_reply_received");
    // Send a real push so the member is alerted even if the app is closed.
    sendPush({ data: { conversationId: id, type: "reply", content } }).catch((err) =>
      console.error("Push send failed:", err),
    );
    queryClient.invalidateQueries({ queryKey: ["admin-messages", id] });
    queryClient.invalidateQueries({ queryKey: ["admin-conversation", id] });
  };

  const close = async () => {
    const { error } = await supabase
      .from("conversations")
      .update({ status: "closed", closed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await logEvent("conversation_closed");
    queryClient.invalidateQueries({ queryKey: ["admin-conversation", id] });
  };

  const addNote = async () => {
    if (!note.trim() || !me?.userId) return;
    const { error } = await supabase
      .from("internal_notes")
      .insert({ conversation_id: id, author_id: me.userId, note: note.trim() });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNote("");
    queryClient.invalidateQueries({ queryKey: ["admin-notes", id] });
  };

  const applyModeration = async () => {
    const target = conversation.data?.user_id;
    if (!target || !me?.isAdmin) return;
    const expires =
      action === "temporary_mute"
        ? new Date(Date.now() + 24 * 3600 * 1000).toISOString()
        : action === "temporary_suspension"
          ? new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString()
          : null;
    const { error } = await supabase.from("moderation_actions").insert({
      target_user_id: target,
      actor_id: me.userId,
      action,
      reason: reason || null,
      expires_at: expires,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    const statusMap: Record<string, string> = {
      warning: "warned",
      temporary_mute: "muted",
      temporary_suspension: "suspended",
      permanent_ban: "banned",
    };
    await supabase
      .from("profiles")
      .update({ account_status: statusMap[action] as never, muted_until: expires })
      .eq("id", target);
    setReason("");
    toast.success("Action recorded.");
    queryClient.invalidateQueries({ queryKey: ["admin-member", target] });
  };

  if (conversation.isLoading || messages.isLoading) return <LoadingView />;
  if (conversation.isError || messages.isError) {
    return <ErrorView onRetry={() => conversation.refetch()} />;
  }

  return (
    <main className="flex min-h-screen flex-col bg-soft-gradient">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 px-4 py-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3">
          <Link
            to="/admin"
            aria-label="Back to admin"
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold">{member.data?.username ?? "Member"}</p>
            <p className="text-xs text-muted-foreground">
              {conversation.data?.status} · {conversation.data?.topic ?? "No topic"}
            </p>
          </div>
          <Button variant="outline" className="min-h-11 rounded-full" onClick={close}>
            Close
          </Button>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-4">
        <Tabs defaultValue="chat">
          <TabsList className="grid w-full grid-cols-3 rounded-2xl">
            <TabsTrigger value="chat">Chat</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="actions">Actions</TabsTrigger>
          </TabsList>

          <TabsContent value="chat" className="mt-4">
            <ul className="space-y-3">
              {(messages.data ?? []).map((m) => {
                const mine = m.sender_id === me?.userId && !m.is_system;
                return (
                  <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[82%] rounded-3xl px-4 py-3 text-[15px] shadow-soft",
                        m.is_system
                          ? "w-full bg-secondary text-secondary-foreground"
                          : mine
                            ? "rounded-br-lg bg-primary text-primary-foreground"
                            : "rounded-bl-lg bg-card",
                      )}
                    >
                      {m.is_system ? (
                        <p className="text-[10px] font-bold uppercase text-primary">
                          Hello Aisha Team · Welcome message
                        </p>
                      ) : null}
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p className="mt-1 text-[10px] opacity-70">
                        {formatTime(m.created_at)}
                        {m.moderation_status !== "allowed" ? ` · ${m.moderation_status}` : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div ref={endRef} />
            <div className="sticky bottom-0 mt-4 flex items-end gap-2 bg-transparent pb-4">
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                placeholder="Write as Aisha…"
                aria-label="Reply"
                rows={1}
                className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl bg-card"
              />
              <Button
                size="icon"
                aria-label="Send"
                className="size-12 shrink-0 rounded-full"
                disabled={!draft.trim()}
                onClick={() => void send()}
              >
                <Send className="size-5" />
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="notes" className="mt-4 space-y-3">
            <p className="text-xs text-muted-foreground">
              Internal notes are never visible to the member.
            </p>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an internal note"
              className="min-h-24 rounded-2xl bg-card"
            />
            <Button className="min-h-11 rounded-full" onClick={() => void addNote()}>
              Save note
            </Button>
            <ul className="space-y-2">
              {(notes.data ?? []).map((n) => (
                <li key={n.id} className="card-soft p-4 text-sm">
                  <p className="whitespace-pre-wrap">{n.note}</p>
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    {formatWhen(n.created_at)}
                  </p>
                </li>
              ))}
            </ul>
          </TabsContent>

          <TabsContent value="actions" className="mt-4 space-y-3">
            <p className="text-sm">
              Member status:{" "}
              <span className="font-semibold">{member.data?.account_status ?? "active"}</span>
            </p>
            {me?.isAdmin ? (
              <>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="min-h-12 rounded-xl bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="warning">Warning</SelectItem>
                    <SelectItem value="temporary_mute">Temporary mute (24h)</SelectItem>
                    <SelectItem value="temporary_suspension">
                      Temporary suspension (7 days)
                    </SelectItem>
                    <SelectItem value="permanent_ban">Permanent ban</SelectItem>
                  </SelectContent>
                </Select>
                <Textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Reason (recorded in the moderation log)"
                  className="min-h-20 rounded-2xl bg-card"
                />
                <Button
                  variant="destructive"
                  className="min-h-11 rounded-full"
                  onClick={() => void applyModeration()}
                >
                  Apply action
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Only admins can apply moderation actions.
              </p>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}
