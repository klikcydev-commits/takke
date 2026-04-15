"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ListTodo, History, Settings, LogOut, Truck } from "lucide-react";
import { signOutVendor } from "@/lib/api";

type Props = {
  driverSlug: string;
  /** When false, hide operational nav (assignments, history) — pending approval. */
  operational: boolean;
  title?: string;
  children: React.ReactNode;
};

export function DriverDashboardShell({ driverSlug, operational, title, children }: Props) {
  const pathname = usePathname();
  const base = `/driver/d/${driverSlug}/dashboard`;

  const nav = [
    { href: base, label: "Overview", icon: LayoutDashboard, show: true },
    { href: `${base}/assignments`, label: "Assignments", icon: ListTodo, show: operational },
    { href: `${base}/history`, label: "History", icon: History, show: operational },
    { href: `${base}/settings`, label: "Settings", icon: Settings, show: true },
  ];

  return (
    <div className="min-h-screen bg-[#fdfcfb] flex flex-col lg:flex-row">
      <aside className="lg:w-64 border-b lg:border-b-0 lg:border-r border-[var(--color-border)] bg-white shrink-0">
        <div className="p-4 flex items-center gap-2 border-b border-[var(--color-border)]">
          <div className="w-9 h-9 rounded-xl bg-[var(--color-secondary)] flex items-center justify-center">
            <Truck className="w-5 h-5 text-[var(--color-foreground)]" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Driver</p>
            <p className="font-semibold text-sm leading-tight">Operations</p>
          </div>
        </div>
        <nav className="p-2 flex lg:flex-col gap-1 overflow-x-auto">
          {nav
            .filter((n) => n.show)
            .map(({ href, label, icon: Icon }) => {
              const active = pathname === href || (href !== base && pathname.startsWith(href));
              return (
                <Link
                  key={href}
                  href={href}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm whitespace-nowrap transition-colors ${
                    active
                      ? "bg-[var(--color-secondary)] text-[var(--color-foreground)] font-medium"
                      : "text-muted-foreground hover:bg-[var(--color-secondary)]/60"
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {label}
                </Link>
              );
            })}
        </nav>
        <div className="p-2 mt-auto hidden lg:block">
          <button
            type="button"
            onClick={() => void signOutVendor()}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:bg-red-50 hover:text-red-800"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-[var(--color-border)] bg-white/80 backdrop-blur px-4 sm:px-8 flex items-center justify-between">
          <h1 className="text-lg font-serif font-semibold text-[var(--color-foreground)] truncate">
            {title ?? "Dashboard"}
          </h1>
          <p className="text-xs font-mono text-muted-foreground hidden sm:block truncate max-w-[12rem]">
            {driverSlug.slice(0, 8)}…
          </p>
        </header>
        <main className="flex-1 p-4 sm:p-8 max-w-6xl w-full mx-auto">{children}</main>
      </div>
    </div>
  );
}
