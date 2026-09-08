import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { BottomNav } from "@/components/BottomNav";
import { AishaAvatar, BrandMark } from "@/components/AisArt";
import { LoadingView, ErrorView } from "@/components/StateViews";
import { useProfile, useAvailability, useMyConversations } from "@/hooks/useAppData";
import { ShieldCheck, LifeBuoy, HeartPulse, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/home")({
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const profileQuery = useProfile();
  const availability = useAvailability();
  const conversations = useMyConversations();

  const me = profileQuery.data;

  useEffect(() => {
    if (!me) return;
    if (me.isStaff) {
      navigate({ to: "/admin", replace: true });
      return;
    }
    if (!me.profile?.username) navigate({ to: "/setup", replace: true });
  }, [me, navigate]);

  const openConversation = (conversations.data ?? []).find((c) =>
    ["requested", "waiting", "active"].includes(c.status),
  );

  // No listener row configured yet: members can still leave a message that
  // Aisha will see in the inbox, rather than hitting a dead end.
  const status = availability.data?.status ?? "away";
  const hasListener = true;

  return (
    <main className="min-h-screen bg-soft-gradient pb-28">
      <div className="mx-auto w-full max-w-md px-5 pt-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BrandMark className="size-8" />
            <span className="text-sm font-semibold">Hello Aisha</span>
          </div>
          {me?.isStaff ? (
            <Link
              to="/admin"
              className="rounded-full bg-secondary px-3 py-2 text-xs font-semibold text-secondary-foreground"
            >
              Admin
            </Link>
          ) : null}
        </div>

        {profileQuery.isLoading ? (
          <LoadingView />
        ) : profileQuery.isError ? (
          <ErrorView onRetry={() => profileQuery.refetch()} />
        ) : (
          <>
            <h1 className="animate-rise mt-6 text-2xl font-extrabold">
              Hello, {me?.profile?.username ?? "friend"}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              You can talk when you need someone to listen.
            </p>

            <section className="card-soft animate-rise mt-6 p-5">
              <div className="flex items-center gap-4">
                <AishaAvatar className="size-16" />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-bold">Aisha</h2>
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-primary">
                      <ShieldCheck className="size-3" aria-hidden="true" /> Real person
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Friendly conversation and peer support.
                  </p>
                </div>
              </div>

              <div className="mt-5">
                {availability.isLoading ? (
                  <LoadingView label="Checking availability…" />
                ) : !hasListener || status === "not_accepting" ? (
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-sm font-semibold">
                      Aisha is not accepting new conversations right now.
                    </p>
                    {openConversation ? (
                      <Button
                        className="mt-4 min-h-12 w-full rounded-full"
                        onClick={() => navigate({ to: "/chat/$id", params: { id: openConversation.id } })}
                      >
                        Open my conversation
                      </Button>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-2xl bg-muted p-4">
                    <p className="text-sm font-semibold">
                      {status === "available" ? "Aisha is available" : "Aisha is away right now."}
                    </p>
                    {status === "away" ? (
                      <p className="mt-1 text-sm text-muted-foreground">
                        You can leave a message and Aisha will reply when available.
                      </p>
                    ) : null}
                    <Button
                      className="mt-4 min-h-13 w-full rounded-full text-base"
                      onClick={() =>
                        openConversation
                          ? navigate({ to: "/chat/$id", params: { id: openConversation.id } })
                          : navigate({ to: "/request" })
                      }
                    >
                      {openConversation
                        ? "Continue conversation"
                        : status === "available"
                          ? "Talk to Aisha"
                          : "Leave a message"}
                    </Button>
                  </div>
                )}
              </div>
            </section>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <QuickLink to="/checkin" icon={HeartPulse} label="Daily check-in" />
              <QuickLink to="/chats" icon={MessageCircle} label="My chats" />
              <QuickLink to="/safety" icon={LifeBuoy} label="Safety resources" />
              <QuickLink to="/guidelines" icon={ShieldCheck} label="Guidelines" />
            </div>

            <p className="mt-6 text-center text-xs leading-relaxed text-muted-foreground">
              Hello Aisha offers friendly conversation and peer support. It is not therapy, medical
              care, or an emergency service.
            </p>
          </>
        )}
      </div>
      <BottomNav />
    </main>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof HeartPulse;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="card-soft flex min-h-24 flex-col justify-between p-4 transition-transform active:scale-[0.98]"
    >
      <Icon className="size-5 text-primary" aria-hidden="true" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}
