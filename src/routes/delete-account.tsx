import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { PageShell, Section } from "@/components/PageShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import { logEvent } from "@/lib/aisha";

export const Route = createFileRoute("/delete-account")({
  head: () => ({
    meta: [
      { title: "Delete your account — Hello Aisha" },
      {
        name: "description",
        content:
          "Request permanent deletion of your Hello Aisha account and data, even without the app installed.",
      },
      { property: "og:title", content: "Delete your account — Hello Aisha" },
      { property: "og:description", content: "Request permanent deletion of your account." },
    ],
  }),
  component: DeleteAccountPage,
});

function DeleteAccountPage() {
  const { session } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      let userId = session?.user.id;
      let userEmail = session?.user.email ?? email;
      if (!userId) {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        userId = data.user.id;
        userEmail = data.user.email ?? email;
      }
      const { error } = await supabase
        .from("account_deletion_requests")
        .insert({ user_id: userId, email: userEmail, reason: reason || null });
      if (error) throw error;
      await supabase
        .from("profiles")
        .update({ account_status: "deletion_requested" })
        .eq("id", userId);
      await logEvent("account_deletion_requested");
      setDone(true);
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "We couldn't submit that. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <PageShell
      title="Delete my account"
      intro="This starts permanent deletion of your Hello Aisha account. It is not a pause or a freeze."
    >
      <Section heading="What will be deleted">
        <ul className="list-disc space-y-1 pl-5">
          <li>Your profile and username</li>
          <li>Your conversations and messages with Aisha</li>
          <li>Your personal check-ins</li>
          <li>Your onboarding answers</li>
          <li>Your sign-in credentials</li>
        </ul>
      </Section>

      <Section heading="What may be retained">
        <p>
          Where a report or safety action involved your account, a limited record may be kept for
          security, fraud prevention, and legal reasons. That record is normally kept for up to 12
          months and is not used for any other purpose.
        </p>
      </Section>

      {done ? (
        <Section heading="Request received">
          <p>
            Your deletion request has been recorded. Your account is now marked for deletion and
            the Hello Aisha team will complete it. You will not be contacted for marketing.
          </p>
        </Section>
      ) : (
        <form onSubmit={submit} className="card-soft space-y-4 p-5">
          <h2 className="text-base font-bold">Confirm your identity</h2>
          {session ? (
            <p className="text-sm text-muted-foreground">
              Signed in as {session.user.email}. Confirm below to submit your request.
            </p>
          ) : (
            <>
              <div className="space-y-2">
                <Label htmlFor="de-email">Email</Label>
                <Input
                  id="de-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="min-h-12 rounded-xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="de-password">Password</Label>
                <Input
                  id="de-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="min-h-12 rounded-xl"
                />
              </div>
            </>
          )}
          <div className="space-y-2">
            <Label htmlFor="de-reason">Reason (optional)</Label>
            <Textarea
              id="de-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="min-h-24 rounded-xl"
            />
          </div>
          <Button
            type="submit"
            variant="destructive"
            className="min-h-13 w-full rounded-full text-base"
            disabled={busy}
          >
            Request account deletion
          </Button>
        </form>
      )}
    </PageShell>
  );
}
