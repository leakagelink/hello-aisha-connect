import { Link, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Inbox, Flag, Settings, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";
import aishaAvatar from "@/assets/aisha-avatar.jpg";

type NavKey = "inbox" | "reports" | "settings";

const NAV: { key: NavKey; to: "/admin" | "/admin/reports" | "/admin/settings"; label: string; icon: typeof Inbox }[] = [
  { key: "inbox", to: "/admin", label: "Inbox", icon: Inbox },
  { key: "reports", to: "/admin/reports", label: "Reports", icon: Flag },
  { key: "settings", to: "/admin/settings", label: "Settings", icon: Settings },
];

export function AdminShell({
  active,
  title,
  subtitle,
  badge,
  children,
}: {
  active: NavKey;
  title: string;
  subtitle?: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-soft-gradient pb-24">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-card/90 backdrop-blur">
        <div className="mx-auto flex w-full max-w-md items-center gap-3 px-5 py-3">
          <img
            src={aishaAvatar}
            alt=""
            className="size-11 rounded-full object-cover ring-2 ring-primary/25"
          />
          <div className="min-w-0 flex-1">
            <p className="truncate text-base font-extrabold leading-tight">{title}</p>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>
          {badge}
          <button
            type="button"
            aria-label="Exit admin panel"
            onClick={() => navigate({ to: "/home" })}
            className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          >
            <LogOut className="size-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md px-5 pt-5">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-border/60 bg-card/95 backdrop-blur">
        <ul className="mx-auto flex w-full max-w-md items-stretch">
          {NAV.map((item) => {
            const Icon = item.icon;
            const isActive = item.key === active;
            return (
              <li key={item.key} className="flex-1">
                <Link
                  to={item.to}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-semibold transition-colors",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 items-center justify-center rounded-full transition-colors",
                      isActive ? "bg-primary/12" : "bg-transparent",
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  {item.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
