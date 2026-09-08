import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { AdminShell } from "@/components/AdminShell";
import { LoadingView, ErrorView, EmptyView } from "@/components/StateViews";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { formatWhen } from "@/lib/aisha";

export const Route = createFileRoute("/_authenticated/admin/reports")({
  component: AdminReports,
});

function AdminReports() {
  const me = useProfile().data;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [notes, setNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    if (me && !me.isStaff) navigate({ to: "/home", replace: true });
  }, [me, navigate]);

  const reports = useQuery({
    queryKey: ["admin-reports"],
    enabled: !!me?.isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const flagged = useQuery({
    queryKey: ["admin-flagged"],
    enabled: !!me?.isStaff,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .eq("moderation_status", "flagged");
      if (error) throw error;
      return count ?? 0;
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
  };

  if (!me) return <LoadingView />;
  if (!me.isStaff) return null;

  const open = (reports.data ?? []).filter((r) => r.status !== "resolved").length;

  return (
    <AdminShell
      active="reports"
      title="Reports & flags"
      subtitle={`${open} open · ${flagged.data ?? 0} flagged messages`}
    >
      {!me.isAdmin ? (
        <EmptyView title="Admins only" description="Reports are visible to admins." />
      ) : reports.isLoading ? (
        <LoadingView />
      ) : reports.isError ? (
        <ErrorView onRetry={() => reports.refetch()} />
      ) : (reports.data ?? []).length === 0 ? (
        <EmptyView title="No reports" description="Nothing has been reported." />
      ) : (
        <ul className="space-y-3">
          {(reports.data ?? []).map((r) => (
            <li key={r.id} className="card-soft p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{r.reason}</span>
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-semibold uppercase text-muted-foreground">
                  {r.status}
                </span>
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
      )}
    </AdminShell>
  );
}
