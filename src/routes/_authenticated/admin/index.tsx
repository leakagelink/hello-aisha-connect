import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminShell } from "@/components/AdminShell";
import { sendConversationPush } from "@/lib/notifications.functions";
import { LoadingView, ErrorView, EmptyView } from "@/components/StateViews";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { formatWhen, logEvent } from "@/lib/aisha";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminInbox,
});

type Conversation = {
  id: string;
  user_id: string;
  listener_id: string | null;
  status: string;
  topic: string | null;
  requested_at: string;
};

type FilterKey = "all" | "new" | "waiting" | "active" | "closed";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "waiting", label: "Waiting" },
  { key: "active", label: "Active" },
  { key: "closed", label: "Closed" },
];

function AdminInbox() {
  const me = useProfile().data;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sendPush = useServerFn(sendConversationPush);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [replyFor, setReplyFor] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (me && !me.isStaff) navigate({ to: "/home", replace: true });
  }, [me, navigate]);

  const conversations = useQuery({
    queryKey: ["admin-conversations"],
    enabled: !!me?.isStaff,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("requested_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
  });

  const usernames = useQuery({
    queryKey: ["admin-usernames"],
    enabled: !!me?.isStaff,
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, username");
      if (error) throw error;
      return Object.fromEntries((data ?? []).map((p) => [p.id, p.username ?? "Member"]));
    },
  });

  const previews = useQuery({
    queryKey: ["admin-previews"],
    enabled: !!me?.isStaff,
    refetchInterval: 10000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("conversation_id, content, created_at, is_read, sender_id")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      const map: Record<string, { content: string; created_at: string; unread: number }> = {};
      for (const m of data ?? []) {
        const entry = (map[m.conversation_id] ??= {
          content: m.content,
          created_at: m.created_at,
          unread: 0,
        });
        if (!m.is_read && m.sender_id !== me?.userId) entry.unread += 1;
      }
      return map;
    },
  });

  useEffect(() => {
    if (!me?.isStaff) return;
    const channel = supabase
      .channel("admin-inbox")
      .on("postgres_changes", { event: "*", schema: "public", table: "messages" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-previews"] });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "conversations" }, () => {
        queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [me?.isStaff, queryClient]);

  const availability = useQuery({
    queryKey: ["admin-availability", me?.userId],
    enabled: !!me?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("listener_availability")
        .select("*")
        .eq("listener_id", me!.userId)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const act = async (conversation: Conversation, action: "accept" | "decline" | "close") => {
    if (!me?.userId) return;
    const patch =
      action === "accept"
        ? { status: "active", listener_id: me.userId, accepted_at: new Date().toISOString() }
        : action === "decline"
          ? { status: "declined", closed_at: new Date().toISOString() }
          : { status: "closed", closed_at: new Date().toISOString() };
    const { error } = await supabase
      .from("conversations")
      .update(patch as never)
      .eq("id", conversation.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (action === "accept") {
      await logEvent("conversation_accepted");
      sendPush({ data: { conversationId: conversation.id, type: "accepted" } }).catch((err) =>
        console.error("Push send failed:", err),
      );
    }
    if (action === "close") await logEvent("conversation_closed");
    queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
  };

  const quickReply = async (conversation: Conversation) => {
    const content = draft.trim();
    if (!content || !me?.userId || sending) return;
    setSending(true);
    try {
      if (conversation.status !== "active") {
        const { error: statusError } = await supabase
          .from("conversations")
          .update({
            status: "active",
            listener_id: me.userId,
            accepted_at: new Date().toISOString(),
          } as never)
          .eq("id", conversation.id);
        if (statusError) throw new Error(statusError.message);
      }
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: conversation.id, sender_id: me.userId, content });
      if (error) throw new Error(error.message);
      setDraft("");
      setReplyFor(null);
      toast.success("Reply sent.");
      sendPush({ data: { conversationId: conversation.id, type: "reply", content } }).catch((err) =>
        console.error("Push send failed:", err),
      );
      queryClient.invalidateQueries({ queryKey: ["admin-previews"] });
      queryClient.invalidateQueries({ queryKey: ["admin-conversations"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send.");
    } finally {
      setSending(false);
    }
  };

  const list = conversations.data ?? [];
  const counts = {
    all: list.length,
    new: list.filter((c) => c.status === "requested").length,
    waiting: list.filter((c) => c.status === "waiting").length,
    active: list.filter((c) => c.status === "active").length,
    closed: list.filter((c) => c.status === "closed" || c.status === "declined").length,
  };
  const visible = list.filter((c) =>
    filter === "all"
      ? true
      : filter === "new"
        ? c.status === "requested"
        : filter === "closed"
          ? c.status === "closed" || c.status === "declined"
          : c.status === filter,
  );
  const totalUnread = Object.values(previews.data ?? {}).reduce((sum, p) => sum + p.unread, 0);

  if (!me) return <LoadingView />;
  if (!me.isStaff) return null;

  const statusLabel =
    availability.data?.status === "available"
      ? "Available"
      : availability.data?.status === "away"
        ? "Away"
        : availability.data?.status
          ? "Not accepting"
          : "Not set up";

  return (
    <AdminShell
      active="inbox"
      title="Hello Aisha Admin"
      subtitle={`${counts.active} active · ${totalUnread} unread`}
      badge={
        <span className="rounded-full bg-primary/12 px-3 py-1 text-[11px] font-bold text-primary">
          {statusLabel}
        </span>
      }
    >
      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={cn(
              "min-h-10 shrink-0 rounded-full px-4 text-sm font-semibold transition-colors",
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-card text-muted-foreground shadow-soft",
            )}
          >
            {f.label} · {counts[f.key]}
          </button>
        ))}
      </div>

      <section className="mt-4 space-y-3">
        {conversations.isLoading ? (
          <LoadingView />
        ) : conversations.isError ? (
          <ErrorView onRetry={() => conversations.refetch()} />
        ) : visible.length === 0 ? (
          <EmptyView title="Nothing here" description="This list is empty right now." />
        ) : (
          visible.map((c) => {
            const name = usernames.data?.[c.user_id] ?? "Member";
            const preview = previews.data?.[c.id];
            const open = replyFor === c.id;
            return (
              <article key={c.id} className="card-soft overflow-hidden">
                <button
                  type="button"
                  onClick={() => navigate({ to: "/admin/chat/$id", params: { id: c.id } })}
                  className="flex w-full items-start gap-3 p-4 text-left"
                >
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary/12 text-base font-extrabold text-primary">
                    {name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center justify-between gap-2">
                      <span className="truncate text-sm font-bold">{name}</span>
                      <span className="shrink-0 text-[11px] text-muted-foreground">
                        {formatWhen(preview?.created_at ?? c.requested_at)}
                      </span>
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      {c.topic ?? "No topic"} · {c.status}
                    </span>
                    <span className="mt-1 flex items-start justify-between gap-2">
                      <span className="line-clamp-2 text-sm text-foreground/80">
                        {preview?.content ?? "No messages yet."}
                      </span>
                      {preview && preview.unread > 0 ? (
                        <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-bold text-primary-foreground">
                          {preview.unread}
                        </span>
                      ) : null}
                    </span>
                  </span>
                </button>

                <div className="flex flex-wrap items-center gap-2 border-t border-border/60 px-4 py-3">
                  {c.status === "requested" ? (
                    <>
                      <Button
                        size="sm"
                        className="min-h-10 rounded-full"
                        onClick={() => void act(c, "accept")}
                      >
                        <Check className="size-4" /> Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="min-h-10 rounded-full"
                        onClick={() => void act(c, "decline")}
                      >
                        <X className="size-4" /> Decline
                      </Button>
                    </>
                  ) : null}
                  {c.status !== "closed" && c.status !== "declined" ? (
                    <Button
                      size="sm"
                      variant={open ? "secondary" : "default"}
                      className="min-h-10 rounded-full"
                      onClick={() => {
                        setReplyFor(open ? null : c.id);
                        setDraft("");
                      }}
                    >
                      <Send className="size-4" /> {open ? "Cancel" : "Quick reply"}
                    </Button>
                  ) : null}
                  {c.status === "active" ? (
                    <Button
                      size="sm"
                      variant="outline"
                      className="min-h-10 rounded-full"
                      onClick={() => void act(c, "close")}
                    >
                      Close
                    </Button>
                  ) : null}
                </div>

                {open ? (
                  <div className="flex items-end gap-2 border-t border-border/60 bg-muted/40 p-3">
                    <Textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          void quickReply(c);
                        }
                      }}
                      rows={1}
                      placeholder={`Reply to ${name}…`}
                      aria-label={`Reply to ${name}`}
                      className="max-h-28 min-h-12 flex-1 resize-none rounded-2xl bg-card"
                    />
                    <Button
                      size="icon"
                      aria-label="Send reply"
                      disabled={!draft.trim() || sending}
                      className="size-12 shrink-0 rounded-full"
                      onClick={() => void quickReply(c)}
                    >
                      <Send className="size-5" />
                    </Button>
                  </div>
                ) : null}
              </article>
            );
          })
        )}
      </section>
    </AdminShell>
  );
}
