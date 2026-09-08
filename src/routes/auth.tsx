import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BrandMark } from "@/components/AisArt";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useSession } from "@/hooks/useSession";
import { logEvent } from "@/lib/aisha";
import { authReturnUrl } from "@/lib/site";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Hello Aisha" },
      {
        name: "description",
        content: "Create your Hello Aisha account or sign in to continue your conversation.",
      },
      { property: "og:title", content: "Sign in — Hello Aisha" },
      { property: "og:description", content: "Create your account or sign in to Hello Aisha." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setSent(true);
          return;
        }
        await logEvent("signup_completed");
        navigate({ to: "/setup" });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/home" });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setBusy(false);
      toast.error("Google sign-in didn't work. Please try again.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/home" });
  };

  if (sent) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-soft-gradient px-5">
        <div className="card-soft w-full max-w-md p-8 text-center">
          <h1 className="text-xl font-bold">Check your email</h1>
          <p className="mt-3 text-sm text-muted-foreground">
            We sent a confirmation link to {email}. Open it to finish creating your account, then
            come back here to sign in.
          </p>
          <Button className="mt-6 min-h-12 w-full rounded-full" onClick={() => setSent(false)}>
            Back
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-soft-gradient px-5 py-10">
      <div className="mx-auto w-full max-w-md">
        <Link to="/" className="flex items-center gap-2">
          <BrandMark className="size-9" />
          <span className="text-sm font-semibold">Hello Aisha</span>
        </Link>

        <div className="card-soft animate-rise mt-8 p-6">
          <h1 className="text-2xl font-extrabold">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We only ask for an email. No phone number, no photo, no real name.
          </p>

          <Button
            type="button"
            variant="outline"
            className="mt-6 min-h-13 w-full rounded-full text-base"
            onClick={google}
            disabled={busy}
          >
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="min-h-12 rounded-xl"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="min-h-12 rounded-xl"
              />
            </div>
            <Button type="submit" className="min-h-13 w-full rounded-full text-base" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" /> : null}
              {mode === "signup" ? "Create account" : "Sign in"}
            </Button>
          </form>

          <button
            type="button"
            className="mt-5 w-full text-center text-sm text-muted-foreground"
            onClick={() => setMode(mode === "signup" ? "signin" : "signup")}
          >
            {mode === "signup" ? (
              <>
                Already have an account?{" "}
                <span className="font-semibold text-primary underline">Sign in</span>
              </>
            ) : (
              <>
                New here?{" "}
                <span className="font-semibold text-primary underline">Create an account</span>
              </>
            )}
          </button>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Hello Aisha offers friendly conversation and peer support for adults 18+. It is not
          therapy, medical care, or an emergency service.
        </p>
      </div>
    </main>
  );
}
