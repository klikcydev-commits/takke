import { VendorStoreProvider } from "@/components/vendor/VendorStoreContext";
import { createClient } from "@/utils/supabase/server";
import { resolveMarketplaceAccess } from "@/lib/access/resolveMarketplaceAccess";
import { redirect } from "next/navigation";
import Link from "next/link";

export default async function VendorDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/register/store");
  }

  const access = await resolveMarketplaceAccess(user.id);
  if (!access) {
    redirect("/register/store");
  }

  const isOwner = access.roles.includes("STORE_OWNER");
  if (isOwner) {
    return <VendorStoreProvider>{children}</VendorStoreProvider>;
  }

  const status = access.storeApplicationStatus;
  if (status === "PENDING" || access.requestedRole === "STORE_OWNER") {
    return (
      <div className="min-h-screen bg-[#fdfcfb]">
        <header className="h-16 border-b bg-white px-6 flex items-center justify-between">
          <h1 className="font-semibold">Store Owner Dashboard</h1>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/vendor/dashboard">Overview</Link>
            <Link href="/vendor/dashboard/settings">Settings</Link>
          </nav>
        </header>
        <main className="max-w-5xl mx-auto p-6">
          <div className="rounded-xl border bg-amber-50 border-amber-200 p-6">
            <h2 className="text-xl font-semibold text-amber-900">Application pending review</h2>
            <p className="text-sm text-amber-800 mt-2">
              Your Store Owner application is submitted and under admin review. Dashboard access is
              restricted until approval.
            </p>
          </div>
        </main>
      </div>
    );
  }

  if (status === "REJECTED") {
    redirect("/register/store");
  }

  redirect("/register/choice");
  return null;
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
