"use client";

"use client";

import { Sidebar } from "./Sidebar";
import { DashboardHeader } from "./DashboardHeader";
import { useVendorStore } from "./VendorStoreContext";

interface DashboardShellProps {
  children: React.ReactNode;
  /** Page title (e.g. "Overview", "Products"). Store name is prepended when loaded from API. */
  title: string;
}

export function DashboardShell({ children, title }: DashboardShellProps) {
  const { store, loading } = useVendorStore();
  const heading =
    store?.name && !loading ? `${store.name} · ${title}` : title;

  return (
    <div className="min-h-full">
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <Sidebar />
      </div>

      <div className="lg:pl-72">
        <DashboardHeader title={heading} />

        <main className="py-10">
          <div className="px-4 sm:px-6 lg:px-8">
            <h1 className="text-2xl font-serif font-semibold text-foreground mb-2">{heading}</h1>
            {store?.slug && (
              <p className="text-sm text-muted-foreground mb-8">
                Store URL slug: <span className="font-mono">{store.slug}</span>
                {store.status === "PENDING" && (
                  <span className="ml-2 rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                    Pending approval
                  </span>
                )}
              </p>
            )}
            {!store && !loading && (
              <p className="text-sm text-muted-foreground mb-8">
                Log in with your marketplace account (same email as store registration) or complete{" "}
                <a href="/register/store" className="underline">
                  store application
                </a>{" "}
                — then open the dashboard with your session so we can load your store from the database.
              </p>
            )}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
