import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { BrandMark, AishaAvatar } from "@/components/AisArt";
import { ONBOARDING_REASONS, writePendingOnboarding } from "@/lib/aisha";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { ArrowRight, Check } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Hello Aisha — Someone is here to listen" },
      {
        name: "description",
        content:
          "A calm, private space for friendly conversation and peer support with Aisha, a real person. Adults 18+.",
      },
      { property: "og:title", content: "Hello Aisha — Someone is here to listen" },
      {
        property: "og:description",
        content: "Friendly conversation and peer support with a real person. Adults 18+.",
      },
    ],
  }),
  component: Welcome,
});

function Welcome() {
  const [step, setStep] = useState(0);
  const [reasons, setReasons] = useState<string[]>([]);
  const [adult, setAdult] = useState(false);
  const [terms, setTerms] = useState(false);
  const [peer, setPeer] = useState(false);
  const navigate = useNavigate();
  const { session, loading } = useSession();

  useEffect(() => {
    if (!loading && session) navigate({ to: "/home", replace: true });
  }, [loading, session, navigate]);

  const toggleReason = (reason: string) =>
    setReasons((prev) =>
      prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason],
    );

  const finish = () => {
    writePendingOnboarding({
      selected_reasons: reasons,
      is_adult_confirmed: adult,
      terms_accepted: terms,
      peer_support_acknowledged: peer,
    });
    navigate({ to: "/auth" });
  };

  return (
    <main className="min-h-screen bg-soft-gradient px-5 pb-10 pt-10">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-md flex-col">
        <div className="flex items-center gap-2">
          <BrandMark className="size-9" />
          <span className="text-sm font-semibold tracking-tight">Hello Aisha</span>
        </div>

        {step === 0 && (
          <section className="animate-rise mt-10 flex flex-1 flex-col">
            <AishaAvatar className="size-32" />
            <h1 className="mt-8 text-3xl font-extrabold leading-tight">Hi, I'm Aisha</h1>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              Sometimes you don't need advice.
              <br />
              You just need someone who listens.
            </p>
            <p className="mt-6 rounded-2xl bg-secondary p-4 text-sm text-secondary-foreground">
              Aisha is a real person, not a bot. Every reply you receive here is written by her.
            </p>
            <div className="mt-auto pt-10">
              <Button className="min-h-13 w-full rounded-full text-base" onClick={() => setStep(1)}>
                Continue <ArrowRight className="ml-1 size-4" />
              </Button>
            </div>
          </section>
        )}

        {step === 1 && (
          <section className="animate-rise mt-10 flex flex-1 flex-col">
            <h1 className="text-2xl font-extrabold leading-tight">What brings you here today?</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Optional. This only helps make the conversation feel more personal.
            </p>
            <ul className="mt-6 space-y-3">
              {ONBOARDING_REASONS.map((reason) => {
                const selected = reasons.includes(reason);
                return (
                  <li key={reason}>
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => toggleReason(reason)}
                      className={cn(
                        "flex min-h-14 w-full items-center justify-between rounded-2xl border px-5 text-left text-[15px] font-medium transition-all",
                        selected
                          ? "border-primary bg-primary/10 text-foreground shadow-soft"
                          : "border-border bg-card text-foreground hover:border-primary/40",
                      )}
                    >
                      {reason}
                      {selected ? <Check className="size-4 text-primary" /> : null}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-auto flex gap-3 pt-10">
              <Button
                variant="ghost"
                className="min-h-13 flex-1 rounded-full"
                onClick={() => setStep(2)}
              >
                Skip
              </Button>
              <Button className="min-h-13 flex-[2] rounded-full text-base" onClick={() => setStep(2)}>
                Continue
              </Button>
            </div>
          </section>
        )}

        {step === 2 && (
          <section className="animate-rise mt-10 flex flex-1 flex-col">
            <h1 className="text-2xl font-extrabold leading-tight">Before we begin</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Please read and confirm the following.
            </p>
            <div className="mt-6 space-y-3">
              <Ack checked={adult} onChange={setAdult} id="ack-adult">
                I confirm that I am 18 years of age or older.
              </Ack>
              <Ack checked={terms} onChange={setTerms} id="ack-terms">
                I agree to the{" "}
                <Link to="/guidelines" className="font-semibold text-primary underline">
                  Community Guidelines
                </Link>{" "}
                and{" "}
                <Link to="/terms" className="font-semibold text-primary underline">
                  Terms of Service
                </Link>
                .
              </Ack>
              <Ack checked={peer} onChange={setPeer} id="ack-peer">
                I understand that Hello Aisha provides friendly conversation and peer support. It is
                not professional therapy, medical care, or emergency support.
              </Ack>
            </div>
            <p className="mt-5 text-xs text-muted-foreground">
              If you may be in immediate danger, please contact local emergency services. See{" "}
              <Link to="/safety" className="font-semibold text-primary underline">
                Safety Resources
              </Link>
              .
            </p>
            <div className="mt-auto pt-10">
              <Button
                className="min-h-13 w-full rounded-full text-base"
                disabled={!adult || !terms || !peer}
                onClick={finish}
              >
                Create my account
              </Button>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Already have an account?{" "}
                <Link to="/auth" className="font-semibold text-primary underline">
                  Sign in
                </Link>
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}

function Ack({
  id,
  checked,
  onChange,
  children,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-start gap-3 rounded-2xl border border-border bg-card p-4 text-sm leading-relaxed"
    >
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={(v) => onChange(v === true)}
        className="mt-0.5 size-5"
      />
      <span>{children}</span>
    </label>
  );
}
