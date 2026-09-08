import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { LoadingView, ErrorView, EmptyView } from "@/components/StateViews";
import { supabase } from "@/integrations/supabase/client";
import { MOODS, logEvent, formatWhen } from "@/lib/aisha";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/checkin")({
  component: CheckinPage,
});

function CheckinPage() {
  const [mood, setMood] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const queryClient = useQueryClient();

  const history = useQuery({
    queryKey: ["checkins"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("daily_checkins")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(30);
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = async () => {
    if (!mood) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You are signed out.");
      const { error } = await supabase
        .from("daily_checkins")
        .insert({ user_id: auth.user.id, mood, note: note || null });
      if (error) throw error;
      await logEvent("checkin_completed");
      setMood(null);
      setNote("");
      toast.success("Saved to your personal history.");
      queryClient.invalidateQueries({ queryKey: ["checkins"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't save that.");
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("daily_checkins").delete().eq("id", id);
    if (error) {
      toast.error("We couldn't delete that check-in.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["checkins"] });
  };

  return (
    <main className="min-h-screen bg-soft-gradient pb-28">
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <h1 className="text-2xl font-extrabold">How are you feeling today?</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A private note to yourself. This is personal reflection, not a health assessment.
        </p>

        <div className="card-soft mt-6 space-y-3 p-5">
          {MOODS.map((m) => (
            <button
              key={m.value}
              type="button"
              aria-pressed={mood === m.value}
              onClick={() => setMood(m.value)}
              className={cn(
                "min-h-13 w-full rounded-2xl border px-5 text-left text-[15px] font-medium transition-all",
                mood === m.value
                  ? "border-primary bg-primary/10 shadow-soft"
                  : "border-border bg-background hover:border-primary/40",
              )}
            >
              {m.label}
            </button>
          ))}

          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's on your mind? (optional)"
            className="min-h-24 rounded-2xl"
          />

          <Button
            className="min-h-13 w-full rounded-full text-base"
            disabled={!mood || busy}
            onClick={save}
          >
            Save check-in
          </Button>
        </div>

        <h2 className="mt-8 text-base font-bold">Your history</h2>
        <div className="mt-3">
          {history.isLoading ? (
            <LoadingView />
          ) : history.isError ? (
            <ErrorView onRetry={() => history.refetch()} />
          ) : (history.data ?? []).length === 0 ? (
            <EmptyView title="Nothing here yet" description="Your saved check-ins will appear here." />
          ) : (
            <ul className="space-y-2">
              {(history.data ?? []).map((c) => (
                <li key={c.id} className="card-soft flex items-start gap-3 p-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold capitalize">
                      {MOODS.find((m) => m.value === c.mood)?.label ?? c.mood}
                    </p>
                    {c.note ? (
                      <p className="mt-1 whitespace-pre-wrap text-sm text-muted-foreground">
                        {c.note}
                      </p>
                    ) : null}
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatWhen(c.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label="Delete check-in"
                    className="size-11 shrink-0 text-muted-foreground"
                    onClick={() => void remove(c.id)}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <BottomNav />
    </main>
  );
}
