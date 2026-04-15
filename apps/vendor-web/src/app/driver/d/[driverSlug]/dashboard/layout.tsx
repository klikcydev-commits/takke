import { DriverDashboardShell } from "@/components/driver/DriverDashboardShell";
import { requireDriverPage } from "@/lib/driver/validateDriverPage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function DriverTenantLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ driverSlug: string }>;
}) {
  const { driverSlug } = await params;
  const ctx = await requireDriverPage(driverSlug);

  return (
    <DriverDashboardShell
      driverSlug={ctx.driverSlug}
      operational={ctx.isApprovedDriver}
      title="Driver"
    >
      {children}
    </DriverDashboardShell>
  );
}
