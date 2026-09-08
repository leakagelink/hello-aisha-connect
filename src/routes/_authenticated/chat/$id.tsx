import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, MoreVertical, Send, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AishaAvatar } from "@/components/AisArt";
import { LoadingView, ErrorView } from "@/components/StateViews";
import { ReportDialog } from "@/components/ReportDialog";
import { supabase } from "@/integrations/supabase/client";
import { formatTime, logEvent } from "@/lib/aisha";
import { useProfile } from "@/hooks/useAppData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$id")({
  component: ChatPage,
});

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_id: string | null;
  is_system: boolean;
  content: string;
  is_read: boolean;
  created_at: string;
};

function ChatPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const me = useProfile().data;
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [otherTyping, setOtherTyping] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const typingChannel = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const conversation = useQuery({
    queryKey: ["conversation", id],
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

  const messages = useQuery({
    queryKey: ["messages", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as MessageRow[];
    },
  });

  // Realtime messages + conversation status
  useEffect(() => {
    const channel = supabase
      .channel(`conversation-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["messages", id] });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "conversations", filter: `id=eq.${id}` },
        () => {
          queryClient.invalidateQueries({ queryKey: ["conversation", id] });
          queryClient.invalidateQueries({ queryKey: ["my-conversations"] });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, queryClient]);

  // Genuine typing indicator: broadcast only while someone actually types.
  useEffect(() => {
    if (!me?.userId) return;
    const channel = supabase.channel(`typing-${id}`, { config: { broadcast: { self: false } } });
    channel
      .on("broadcast", { event: "typing" }, (message) => {
        const body = message["payload"] as { userId?: string } | undefined;
        if (body?.userId === me.userId) return;
        setOtherTyping(true);
        if (typingTimeout.current) clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setOtherTyping(false), 3000);
      })
      .subscribe();
    typingChannel.current = channel;
    return () => {
      supabase.removeChannel(channel);
      typingChannel.current = null;
    };
  }, [id, me?.userId]);

  // Mark incoming messages as read
  useEffect(() => {
    const rows = messages.data;
    if (!rows || !me?.userId) return;
    const unread = rows.filter((m) => m.sender_id !== me.userId && !m.is_read && !m.is_system);
    if (unread.length === 0) return;
    void supabase
      .from("messages")
      .update({ is_read: true })
      .in(
        "id",
        unread.map((m) => m.id),
      );
  }, [messages.data, me?.userId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.data, otherTyping]);

  const conv = conversation.data;
  const closed = conv?.status === "closed" || conv?.status === "declined" || conv?.blocked_by_user;

  const send = async () => {
    const content = draft.trim();
    if (!content || !me?.userId) return;
    setSending(true);
    try {
      const isFirst = (messages.data ?? []).every((m) => m.is_system || m.sender_id !== me.userId);
      const { error } = await supabase
        .from("messages")
        .insert({ conversation_id: id, sender_id: me.userId, content });
      if (error) {
        if (error.message.includes("RATE_LIMIT")) {
          toast("Your messages have been received. Please wait for Aisha to respond.");
          return;
        }
        throw error;
      }
      setDraft("");
      if (isFirst) await logEvent("first_message_sent");
      await queryClient.invalidateQueries({ queryKey: ["messages", id] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That message didn't send.");
    } finally {
      setSending(false);
    }
  };

  const blockConversation = async () => {
    const { error } = await supabase
      .from("conversations")
      .update({ blocked_by_user: true, status: "closed", closed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      toast.error("We couldn't close this conversation.");
      return;
    }
    await logEvent("conversation_closed");
    toast.success("This conversation is now closed.");
    queryClient.invalidateQueries({ queryKey: ["conversation", id] });
  };

  const onDraftChange = (value: string) => {
    setDraft(value);
    if (value.trim() && typingChannel.current && me?.userId) {
      void typingChannel.current.send({
        type: "broadcast",
        event: "typing",
        payload: { userId: me.userId },
      });
    }
  };

  return (
    <main className="flex min-h-screen flex-col bg-soft-gradient">
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-3 py-3">
          <Link
            to="/chats"
            aria-label="Back to chats"
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <AishaAvatar className="size-10" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span className="truncate text-sm font-bold">Aisha</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-1.5 py-0.5 text-[9px] font-bold uppercase text-primary">
                <ShieldCheck className="size-2.5" aria-hidden="true" /> Real person
              </span>
            </div>
            <p className="truncate text-xs text-muted-foreground">Friendly conversation</p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-11" aria-label="Conversation options">
                <MoreVertical className="size-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="rounded-2xl">
              <DropdownMenuItem onSelect={() => setReportOpen(true)}>
                Report a problem
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => void blockConversation()} disabled={!!closed}>
                Block conversation
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => navigate({ to: "/safety" })}>
                Safety resources
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="mx-auto w-full max-w-md flex-1 px-4 py-5">
        {conversation.isLoading || messages.isLoading ? (
          <LoadingView />
        ) : conversation.isError || messages.isError ? (
          <ErrorView
            onRetry={() => {
              conversation.refetch();
              messages.refetch();
            }}
          />
        ) : !conv ? (
          <ErrorView message="This conversation isn't available." />
        ) : (
          <>
            <div className="mb-4 rounded-2xl bg-secondary p-3 text-center text-xs text-secondary-foreground">
              {conv.status === "requested" || conv.status === "waiting"
                ? "Your conversation request has been received. Wait times may vary depending on availability."
                : conv.status === "active"
                  ? "Aisha has joined this conversation."
                  : conv.status === "declined"
                    ? "Aisha isn't able to take this conversation."
                    : "This conversation is closed."}
            </div>

            <ul className="space-y-3">
              {(messages.data ?? []).map((m) => {
                if (m.is_system) {
                  return (
                    <li key={m.id} className="mx-auto max-w-[90%]">
                      <div className="rounded-2xl border border-border bg-card p-4">
                        <p className="text-[10px] font-bold uppercase tracking-wide text-primary">
                          Hello Aisha · Welcome message
                        </p>
                        <p className="mt-1.5 text-sm leading-relaxed">{m.content}</p>
                      </div>
                    </li>
                  );
                }
                const mine = m.sender_id === me?.userId;
                return (
                  <li key={m.id} className={cn("flex", mine ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-[82%] rounded-3xl px-4 py-3 text-[15px] leading-relaxed shadow-soft",
                        mine
                          ? "rounded-br-lg bg-primary text-primary-foreground"
                          : "rounded-bl-lg bg-card text-card-foreground",
                      )}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                      <p
                        className={cn(
                          "mt-1 text-[10px]",
                          mine ? "text-primary-foreground/70" : "text-muted-foreground",
                        )}
                      >
                        {formatTime(m.created_at)}
                        {mine ? (m.is_read ? " · Read" : " · Sent") : ""}
                      </p>
                    </div>
                  </li>
                );
              })}
              {otherTyping ? (
                <li className="text-xs text-muted-foreground">Aisha is typing…</li>
              ) : null}
            </ul>
            <div ref={endRef} />
          </>
        )}
      </div>

      <div className="sticky bottom-0 border-t border-border bg-card/95 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-end gap-2">
          <Textarea
            value={draft}
            onChange={(e) => onDraftChange(e.target.value)}
            placeholder={closed ? "This conversation is closed" : "Write a message…"}
            aria-label="Message"
            disabled={!!closed}
            rows={1}
            className="max-h-32 min-h-12 flex-1 resize-none rounded-2xl"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          <Button
            size="icon"
            aria-label="Send message"
            className="size-12 shrink-0 rounded-full"
            disabled={!draft.trim() || sending || !!closed}
            onClick={() => void send()}
          >
            <Send className="size-5" />
          </Button>
        </div>
        <p className="mx-auto mt-2 max-w-md text-center text-[10px] text-muted-foreground">
          Text only. Peer support, not therapy or emergency help.
        </p>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} conversationId={id} />
    </main>
  );
}
