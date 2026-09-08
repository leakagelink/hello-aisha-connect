import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ChevronRight } from "lucide-react";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ReportDialog } from "@/components/ReportDialog";
import { LoadingView, ErrorView } from "@/components/StateViews";
import { supabase } from "@/integrations/supabase/client";
import { useProfile } from "@/hooks/useAppData";
import { logEvent } from "@/lib/aisha";

export const Route = createFileRoute("/_authenticated/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const profileQuery = useProfile();
  const me = profileQuery.data;
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [reportOpen, setReportOpen] = useState(false);

  const toggleNotifications = async (value: boolean) => {
    if (!me?.userId) return;
    const { error } = await supabase
      .from("profiles")
      .update({ notifications_enabled: value })
      .eq("id", me.userId);
    if (error) {
      toast.error("We couldn't save that setting.");
      return;
    }
    queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const deleteHistory = async () => {
    if (!me?.userId) return;
    const { error } = await supabase.from("conversations").delete().eq("user_id", me.userId);
    if (error) {
      toast.error("We couldn't delete your history.");
      return;
    }
    toast.success("Your conversation history has been deleted.");
    queryClient.invalidateQueries();
  };

  const requestDeletion = async () => {
    if (!me?.userId) return;
    const { error } = await supabase
      .from("account_deletion_requests")
      .insert({ user_id: me.userId, email: me.email });
    if (error) {
      toast.error("We couldn't submit your request.");
      return;
    }
    await supabase
      .from("profiles")
      .update({ account_status: "deletion_requested" })
      .eq("id", me.userId);
    await logEvent("account_deletion_requested");
    toast.success("Your account deletion request has been received.");
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  };

  if (profileQuery.isLoading) {
    return (
      <main className="min-h-screen bg-soft-gradient pt-16">
        <LoadingView />
      </main>
    );
  }
  if (profileQuery.isError) {
    return (
      <main className="min-h-screen bg-soft-gradient pt-16">
        <ErrorView onRetry={() => profileQuery.refetch()} />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-soft-gradient pb-28">
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <h1 className="text-2xl font-extrabold">Profile</h1>

        <Group title="Account">
          <Row label="Username" value={me?.profile?.username ?? "Not set"} />
          <Row label="Email" value={me?.email ?? "—"} hint="Never shown to anyone else" />
        </Group>

        <Group title="Privacy and safety">
          <NavRow to="/privacy" label="Privacy Policy" />
          <NavRow to="/terms" label="Terms of Service" />
          <NavRow to="/guidelines" label="Community Guidelines" />
          <NavRow to="/safety" label="Safety Resources" />
          <button
            type="button"
            onClick={() => setReportOpen(true)}
            className="flex min-h-13 w-full items-center justify-between px-1 text-left text-sm font-medium"
          >
            Report a Problem
            <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
          </button>
        </Group>

        <Group title="Notifications">
          <div className="flex min-h-13 items-center justify-between gap-4 px-1">
            <Label htmlFor="notif" className="text-sm font-medium">
              Message notifications
            </Label>
            <Switch
              id="notif"
              checked={me?.profile?.notifications_enabled ?? true}
              onCheckedChange={toggleNotifications}
            />
          </div>
          <p className="px-1 text-xs text-muted-foreground">
            We only notify you when Aisha replies or accepts your conversation request.
          </p>
        </Group>

        <Group title="Account management">
          <ConfirmRow
            label="Delete conversation history"
            title="Delete all conversations?"
            description="Your conversations with Aisha and all their messages will be permanently removed. This cannot be undone."
            confirmLabel="Delete history"
            onConfirm={deleteHistory}
          />
          <ConfirmRow
            label="Request account deletion"
            title="Delete my account"
            description="This starts permanent deletion of your account, profile, conversations and check-ins. A limited record of safety or abuse-prevention events may be kept for up to 12 months where required for security, fraud prevention, or legal reasons."
            confirmLabel="Request deletion"
            onConfirm={requestDeletion}
          />
          <NavRow to="/delete-account" label="Account deletion page (web)" />
        </Group>

        <Button variant="outline" className="mt-6 min-h-13 w-full rounded-full" onClick={signOut}>
          Sign out
        </Button>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Hello Aisha provides friendly conversation and peer support. It is not therapy, medical
          care, or an emergency service.
        </p>
      </div>

      <ReportDialog open={reportOpen} onOpenChange={setReportOpen} />
      <BottomNav />
    </main>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="px-1 text-xs font-bold uppercase tracking-wide text-muted-foreground">
        {title}
      </h2>
      <div className="card-soft mt-2 divide-y divide-border px-4">{children}</div>
    </section>
  );
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="min-h-13 py-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 break-all text-sm font-medium">{value}</p>
      {hint ? <p className="mt-0.5 text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function NavRow({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="flex min-h-13 items-center justify-between px-1 text-sm font-medium">
      {label}
      <ChevronRight className="size-4 text-muted-foreground" aria-hidden="true" />
    </Link>
  );
}

function ConfirmRow({
  label,
  title,
  description,
  confirmLabel,
  onConfirm,
}: {
  label: string;
  title: string;
  description: string;
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="flex min-h-13 w-full items-center justify-between px-1 text-left text-sm font-medium text-destructive"
        >
          {label}
          <ChevronRight className="size-4" aria-hidden="true" />
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent className="max-w-sm rounded-3xl">
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel className="min-h-12 rounded-full">Cancel</AlertDialogCancel>
          <AlertDialogAction className="min-h-12 rounded-full" onClick={() => void onConfirm()}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
