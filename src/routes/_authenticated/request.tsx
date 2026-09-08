import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { TOPICS, logEvent } from "@/lib/aisha";
import { sendStaffPush } from "@/lib/notifications.functions";
import { useAvailability } from "@/hooks/useAppData";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/request")({
  component: RequestPage,
});

function RequestPage() {
  const [topic, setTopic] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const availability = useAvailability();

  const create = async () => {
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) throw new Error("You are signed out.");
      const listenerId = availability.data?.listener_id ?? null;

      const { data, error } = await supabase
        .from("conversations")
        .insert({
          user_id: auth.user.id,
          listener_id: listenerId,
          topic,
          status: "requested",
        })
        .select()
        .single();
      if (error) throw error;

      await supabase.from("messages").insert({
        conversation_id: data.id,
        sender_id: auth.user.id,
        is_system: true,
        content:
          "Thanks for reaching out. Aisha will reply when she is available. Wait times may vary depending on availability.",
      });

      await logEvent("conversation_requested");
      try {
        await sendStaffPush({ data: { conversationId: data.id, type: "request" } });
      } catch (pushErr) {
        console.error("Staff push failed:", pushErr);
      }
      navigate({ to: "/chat/$id", params: { id: data.id }, replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "We couldn't send that request.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-soft-gradient px-5 pb-12 pt-6">
      <div className="mx-auto flex min-h-[calc(100vh-3rem)] w-full max-w-md flex-col">
        <Link
          to="/home"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </Link>

        <h1 className="mt-4 text-2xl font-extrabold">What would you like to talk about?</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Optional. You can skip this and just start talking.
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          {TOPICS.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={topic === t}
              onClick={() => setTopic(topic === t ? null : t)}
              className={cn(
                "min-h-12 rounded-full border px-5 text-sm font-medium transition-all",
                topic === t
                  ? "border-primary bg-primary/10 text-foreground shadow-soft"
                  : "border-border bg-card hover:border-primary/40",
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="card-soft mt-8 p-5 text-sm text-muted-foreground">
          Aisha is one person, so replies arrive when she is available. We won't promise a response
          time.
        </div>

        <div className="mt-auto space-y-3 pt-10">
          <Button
            className="min-h-13 w-full rounded-full text-base"
            onClick={create}
            disabled={busy}
          >
            Send my request
          </Button>
          <Button
            variant="ghost"
            className="min-h-12 w-full rounded-full"
            onClick={create}
            disabled={busy}
          >
            Skip and send
          </Button>
        </div>
      </div>
    </main>
  );
}
