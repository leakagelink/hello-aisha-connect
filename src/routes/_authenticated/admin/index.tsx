import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { sendConversationPush } from "@/lib/notifications.functions";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { LoadingView, ErrorView, EmptyView } from "@/components/StateViews";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { formatWhen, logEvent } from "@/lib/aisha";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminHome,
});

type Conversation = {
  id: string;
  user_id: string;
  listener_id: string | null;
  status: string;
  topic: string | null;
  requested_at: string;
  last_message_at: string | null;
};

function AdminHome() {
  const me = useProfile().data;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const sendPush = useServerFn(sendConversationPush);

  useEffect(() => {
    if (me && !me.isStaff) navigate({ to: "/home", replace: true });
  }, [me, navigate]);

  const conversations = useQuery({
    queryKey: ["admin-conversations"],
    enabled: !!me?.isStaff,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("conversations")
        .select("*")
        .order("requested_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
    refetchInterval: 20000,
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
    refetchInterval: 15000,
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

  const counts = useQuery({
    queryKey: ["admin-counts"],
    enabled: !!me?.isStaff,
    queryFn: async () => {
      const [unread, flagged, reports] = await Promise.all([
        supabase.from("messages").select("id", { count: "exact", head: true }).eq("is_read", false),
        supabase
          .from("messages")
          .select("id", { count: "exact", head: true })
          .eq("moderation_status", "flagged"),
        supabase.from("reports").select("id", { count: "exact", head: true }).eq("status", "open"),
      ]);
      return {
        unread: unread.count ?? 0,
        flagged: flagged.count ?? 0,
        reports: reports.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });

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

  const setStatus = async (status: string) => {
    if (!me?.userId) return;
    const { error } = await supabase
      .from("listener_availability")
      .update({ status: status as never, updated_at: new Date().toISOString() })
      .eq("listener_id", me.userId);
    if (error) {
      toast.error("Couldn't update availability.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-availability", me.userId] });
    queryClient.invalidateQueries({ queryKey: ["availability"] });
  };

  const becomeListener = async () => {
    if (!me?.userId) return;
    const { error } = await supabase
      .from("listener_availability")
      .insert({ listener_id: me.userId, display_name: "Aisha", status: "available", is_primary: true });
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries();
  };

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

  const list = conversations.data ?? [];
  const groups = {
    new: list.filter((c) => c.status === "requested"),
    waiting: list.filter((c) => c.status === "waiting"),
    active: list.filter((c) => c.status === "active"),
    closed: list.filter((c) => c.status === "closed" || c.status === "declined"),
  };

  if (!me) return <LoadingView />;
  if (!me.isStaff) return null;

  return (
    <main className="min-h-screen bg-soft-gradient px-5 pb-16 pt-8">
      <div className="mx-auto w-full max-w-md">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-extrabold">Hello Aisha Admin</h1>
          <Link to="/home" className="text-sm font-medium text-primary underline">
            Exit
          </Link>
        </div>

        <section className="card-soft mt-5 p-4">
          <h2 className="text-sm font-bold">My availability</h2>
          {availability.isLoading ? (
            <LoadingView />
          ) : availability.data ? (
            <Select value={availability.data.status} onValueChange={setStatus}>
              <SelectTrigger className="mt-3 min-h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="away">Away</SelectItem>
                <SelectItem value="not_accepting">Not accepting new conversations</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                You are not set up as a listener yet.
              </p>
              <Button className="mt-3 min-h-12 w-full rounded-full" onClick={becomeListener}>
                Set me up as Aisha
              </Button>
            </>
          )}
        </section>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <Stat label="New" value={groups.new.length} />
          <Stat label="Waiting" value={groups.waiting.length} />
          <Stat label="Active" value={groups.active.length} />
          <Stat label="Unread" value={counts.data?.unread ?? 0} />
          <Stat label="Flagged" value={counts.data?.flagged ?? 0} />
          <Stat label="Reports" value={counts.data?.reports ?? 0} />
        </div>

        <Tabs defaultValue="new" className="mt-6">
          <TabsList className="grid w-full grid-cols-5 rounded-2xl">
            <TabsTrigger value="new">New</TabsTrigger>
            <TabsTrigger value="waiting">Wait</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="closed">Closed</TabsTrigger>
            <TabsTrigger value="reports">Flags</TabsTrigger>
          </TabsList>

          {(["new", "waiting", "active", "closed"] as const).map((key) => (
            <TabsContent key={key} value={key} className="mt-4 space-y-3">
              {conversations.isLoading ? (
                <LoadingView />
              ) : conversations.isError ? (
                <ErrorView onRetry={() => conversations.refetch()} />
              ) : groups[key].length === 0 ? (
                <EmptyView title="Nothing here" description="This queue is empty right now." />
              ) : (
                groups[key].map((c) => (
                  <article key={c.id} className="card-soft p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold">
                        {usernames.data?.[c.user_id] ?? "Member"}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatWhen(c.requested_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Topic: {c.topic ?? "Not specified"} · Status: {c.status}
                    </p>
                    {previews.data?.[c.id] ? (
                      <div className="mt-2 flex items-start justify-between gap-2">
                        <p className="line-clamp-2 text-sm">{previews.data[c.id]!.content}</p>
                        {previews.data[c.id]!.unread > 0 ? (
                          <span className="shrink-0 rounded-full bg-primary px-2 py-0.5 text-[11px] font-semibold text-primary-foreground">
                            {previews.data[c.id]!.unread} new
                          </span>
                        ) : null}
                      </div>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">No messages yet.</p>
                    )}
                    <div className="mt-3 flex flex-wrap gap-2">
                      {c.status === "requested" ? (
                        <>
                          <Button
                            className="min-h-11 rounded-full"
                            onClick={() => void act(c, "accept")}
                          >
                            Accept
                          </Button>
                          <Button
                            variant="outline"
                            className="min-h-11 rounded-full"
                            onClick={() => void act(c, "decline")}
                          >
                            Decline
                          </Button>
                        </>
                      ) : null}
                      {c.status === "active" ? (
                        <Button
                          variant="outline"
                          className="min-h-11 rounded-full"
                          onClick={() => void act(c, "close")}
                        >
                          Close
                        </Button>
                      ) : null}
                      <Button asChild variant="secondary" className="min-h-11 rounded-full">
                        <Link to="/admin/chat/$id" params={{ id: c.id }}>
                          Open
                        </Link>
                      </Button>
                    </div>
                  </article>
                ))
              )}
            </TabsContent>
          ))}

          <TabsContent value="reports" className="mt-4">
            <ReportsPanel isAdmin={me.isAdmin} />
          </TabsContent>
        </Tabs>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="card-soft p-3 text-center">
      <p className="text-xl font-extrabold text-primary">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}

function ReportsPanel({ isAdmin }: { isAdmin: boolean }) {
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  const reports = useQuery({
    queryKey: ["admin-reports"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const resolve = async (id: string) => {
    const { error } = await supabase
      .from("reports")
      .update({
        status: "resolved",
        resolved_at: new Date().toISOString(),
        admin_notes: notes[id] ?? null,
      })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["admin-reports"] });
    queryClient.invalidateQueries({ queryKey: ["admin-counts"] });
  };

  if (!isAdmin) {
    return <EmptyView title="Admins only" description="Reports are visible to admins." />;
  }
  if (reports.isLoading) return <LoadingView />;
  if (reports.isError) return <ErrorView onRetry={() => reports.refetch()} />;
  if ((reports.data ?? []).length === 0) {
    return <EmptyView title="No reports" description="Nothing has been reported." />;
  }

  return (
    <ul className="space-y-3">
      {(reports.data ?? []).map((r) => (
        <li key={r.id} className="card-soft p-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">{r.reason}</span>
            <span className="text-[11px] uppercase text-muted-foreground">{r.status}</span>
          </div>
          {r.description ? (
            <p className="mt-1 text-sm text-muted-foreground">{r.description}</p>
          ) : null}
          <p className="mt-1 text-[11px] text-muted-foreground">{formatWhen(r.created_at)}</p>
          {r.status !== "resolved" ? (
            <>
              <Textarea
                value={notes[r.id] ?? ""}
                onChange={(e) => setNotes({ ...notes, [r.id]: e.target.value })}
                placeholder="Internal note (never shown to the member)"
                className="mt-3 min-h-20 rounded-xl"
              />
              <Button className="mt-2 min-h-11 rounded-full" onClick={() => void resolve(r.id)}>
                Mark resolved
              </Button>
            </>
          ) : r.admin_notes ? (
            <p className="mt-2 rounded-xl bg-muted p-3 text-xs">{r.admin_notes}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
