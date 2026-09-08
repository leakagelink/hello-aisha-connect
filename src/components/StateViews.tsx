import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export function LoadingView({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex min-h-40 flex-col items-center justify-center gap-3 text-muted-foreground">
      <Loader2 className="size-6 animate-spin" aria-hidden="true" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

export function ErrorView({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="card-soft mx-auto max-w-sm p-6 text-center">
      <h2 className="text-base font-semibold">Something didn't load</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {message ?? "Please check your connection and try again."}
      </p>
      {onRetry ? (
        <Button className="mt-4 min-h-11" onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

export function EmptyView({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="card-soft mx-auto max-w-sm p-8 text-center">
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
