import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { BottomNav } from "@/components/BottomNav";
import { AishaAvatar } from "@/components/AisArt";
import { LoadingView, ErrorView, EmptyView } from "@/components/StateViews";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useMyConversations, useProfile } from "@/hooks/useAppData";
import { formatWhen } from "@/lib/aisha";

export const Route = createFileRoute("/_authenticated/chats")({
  component: ChatsPage,
});

function ChatsPage() {
  const conversations = useMyConversations();
  const me = useProfile().data;
  const ids = (conversations.data ?? []).map((c) => c.id);

  const previews = useQuery({
    queryKey: ["chat-previews", ids],
    enabled: ids.length > 0 && !!me?.userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("id, conversation_id, content, created_at, is_read, sender_id, is_system")
        .in("conversation_id", ids)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const map: Record<
        string,
        { content: string; created_at: string; unread: number }
      > = {};
      for (const m of data ?? []) {
        const existing = map[m.conversation_id];
        if (!existing) {
          map[m.conversation_id] = { content: m.content, created_at: m.created_at, unread: 0 };
        }
        if (!m.is_read && !m.is_system && m.sender_id !== me?.userId) {
          map[m.conversation_id]!.unread += 1;
        }
      }
      return map;
    },
  });

  return (
    <main className="min-h-screen bg-soft-gradient pb-28">
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <h1 className="text-2xl font-extrabold">Chats</h1>
        <p className="mt-1 text-sm text-muted-foreground">Your conversations with Aisha.</p>

        <div className="mt-6">
          {conversations.isLoading ? (
            <LoadingView />
          ) : conversations.isError ? (
            <ErrorView onRetry={() => conversations.refetch()} />
          ) : (conversations.data ?? []).length === 0 ? (
            <EmptyView
              title="No conversations yet"
              description="When you're ready, you can reach out and Aisha will reply when she's available."
              action={
                <Button asChild className="min-h-12 rounded-full">
                  <Link to="/request">Message Aisha</Link>
                </Button>
              }
            />
          ) : (
            <ul className="space-y-3">
              {(conversations.data ?? []).map((c) => {
                const preview = previews.data?.[c.id];
                return (
                  <li key={c.id}>
                    <Link
                      to="/chat/$id"
                      params={{ id: c.id }}
                      className="card-soft flex min-h-20 items-center gap-3 p-4 transition-transform active:scale-[0.99]"
                    >
                      <AishaAvatar className="size-12" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-bold">Aisha</span>
                          <span className="text-[11px] text-muted-foreground">
                            {formatWhen(preview?.created_at ?? c.created_at)}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-sm text-muted-foreground">
                          {preview?.content ?? "Conversation requested"}
                        </p>
                        <p className="mt-1 text-[10px] font-semibold uppercase tracking-wide text-primary">
                          {c.status}
                          {c.topic ? ` · ${c.topic}` : ""}
                        </p>
                      </div>
                      {preview && preview.unread > 0 ? (
                        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                          {preview.unread}
                        </span>
                      ) : null}
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
