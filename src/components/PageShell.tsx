import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";

export function PageShell({
  title,
  intro,
  children,
}: {
  title: string;
  intro?: string;
  children: ReactNode;
}) {
  return (
    <main className="min-h-screen bg-soft-gradient px-5 pb-16 pt-6">
      <div className="mx-auto w-full max-w-md">
        <Link
          to="/"
          className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" /> Back
        </Link>
        <h1 className="mt-4 text-2xl font-extrabold leading-tight">{title}</h1>
        {intro ? <p className="mt-3 text-sm text-muted-foreground">{intro}</p> : null}
        <div className="mt-6 space-y-4">{children}</div>
      </div>
    </main>
  );
}

export function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="card-soft p-5">
      <h2 className="text-base font-bold">{heading}</h2>
      <div className="mt-2 space-y-2 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}
