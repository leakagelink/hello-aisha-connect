import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AdminShell } from "@/components/AdminShell";
import { LoadingView } from "@/components/StateViews";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { sendAvailabilityPush, sendTestPushToAll } from "@/lib/notifications.functions";

export const Route = createFileRoute("/_authenticated/admin/settings")({
  component: AdminSettings,
});

function AdminSettings() {
  const me = useProfile().data;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const notifyAvailable = useServerFn(sendAvailabilityPush);
  const sendTest = useServerFn(sendTestPushToAll);
  const [sendingTest, setSendingTest] = useState(false);

  const runTestPush = async () => {
    setSendingTest(true);
    try {
      const result = await sendTest({ data: undefined });
      if (!result.devices) {
        toast.error("No device is registered yet. Open the app on a phone and allow notifications.");
      } else {
        toast.success(`Test sent to ${result.sent} of ${result.devices} device(s).`);
      }
    } catch {
      toast.error("Couldn't send the test notification.");
    } finally {
      setSendingTest(false);
    }
  };

  useEffect(() => {
    if (me && !me.isStaff) navigate({ to: "/home", replace: true });
  }, [me, navigate]);

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
    toast.success("Availability updated.");
    if (status === "available") {
      // Real push to members who opted in, only when Aisha is genuinely available.
      notifyAvailable({ data: undefined }).catch((err) => console.error("Push send failed:", err));
    }
    queryClient.invalidateQueries({ queryKey: ["admin-availability", me.userId] });
    queryClient.invalidateQueries({ queryKey: ["availability"] });
  };

  const becomeListener = async () => {
    if (!me?.userId) return;
    const { error } = await supabase.from("listener_availability").insert({
      listener_id: me.userId,
      display_name: "Aisha",
      status: "available",
      is_primary: true,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    queryClient.invalidateQueries();
  };

  if (!me) return <LoadingView />;
  if (!me.isStaff) return null;

  return (
    <AdminShell active="settings" title="Panel settings" subtitle={me.profile?.username ?? "Listener"}>
      <section className="card-soft p-4">
        <h2 className="text-sm font-bold">My availability</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          This is what members see on their home screen.
        </p>
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

      <section className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Test notifications</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Sends a test alert to every phone that has notifications turned on.
        </p>
        <Button
          variant="outline"
          className="mt-3 min-h-12 w-full rounded-full"
          onClick={runTestPush}
          disabled={sendingTest}
        >
          {sendingTest ? "Sending…" : "Send test notification to all"}
        </Button>
      </section>

      <section className="card-soft mt-4 p-4">
        <h2 className="text-sm font-bold">Account</h2>
        <p className="mt-2 text-sm text-muted-foreground">Signed in as {me.profile?.username ?? "Aisha"}</p>
        <Button
          variant="outline"
          className="mt-3 min-h-12 w-full rounded-full"
          onClick={() => navigate({ to: "/home" })}
        >
          Go to member view
        </Button>
      </section>
    </AdminShell>
  );
}
