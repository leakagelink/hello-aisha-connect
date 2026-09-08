import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/AisArt";
import { supabase } from "@/integrations/supabase/client";
import { logEvent, readPendingOnboarding } from "@/lib/aisha";

export const Route = createFileRoute("/_authenticated/setup")({
  component: SetupPage,
});

function SetupPage() {
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const valid = /^[A-Za-z0-9_]{3,20}$/.test(username);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    setBusy(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      const user = auth.user;
      if (!user) throw new Error("You are signed out.");

      const { error } = await supabase
        .from("profiles")
        .upsert({ id: user.id, username, email: user.email ?? null }, { onConflict: "id" });
      if (error) {
        throw new Error(
          error.code === "23505" ? "That username is already taken." : error.message,
        );
      }

      const pending = readPendingOnboarding();
      await supabase.from("user_onboarding").upsert(
        {
          user_id: user.id,
          selected_reasons: pending?.selected_reasons ?? [],
          is_adult_confirmed: pending?.is_adult_confirmed ?? true,
          terms_accepted: pending?.terms_accepted ?? true,
          peer_support_acknowledged: pending?.peer_support_acknowledged ?? true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
      await logEvent("onboarding_completed");
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-soft-gradient px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <BrandMark className="size-10" />
        <h1 className="mt-6 text-2xl font-extrabold">Choose a display name</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This is the only name Aisha will see. Please don't use your real full name.
        </p>
        <form onSubmit={save} className="card-soft mt-6 space-y-4 p-5">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              value={username}
              placeholder="BlueSky21"
              autoComplete="off"
              onChange={(e) => setUsername(e.target.value)}
              className="min-h-12 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">
              3–20 characters. Letters, numbers and underscores.
            </p>
          </div>
          <Button
            type="submit"
            className="min-h-13 w-full rounded-full text-base"
            disabled={!valid || busy}
          >
            Continue
          </Button>
        </form>
      </div>
    </main>
  );
}
