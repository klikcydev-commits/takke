import { redirect } from "next/navigation";
import { DriverAssignmentsClient } from "./DriverAssignmentsClient";
import { requireDriverPage } from "@/lib/driver/validateDriverPage";

export const dynamic = "force-dynamic";

export default async function DriverAssignmentsPage({
  params,
  searchParams,
}: {
  params: Promise<{ driverSlug: string }>;
  searchParams: Promise<{ mode?: string }>;
}) {
  const { driverSlug } = await params;
  const ctx = await requireDriverPage(driverSlug);
  if (!ctx.isApprovedDriver) {
    redirect(`/driver/d/${ctx.driverSlug}/dashboard`);
  }
  const sp = await searchParams;
  const mode = sp.mode === "available" ? "available" : sp.mode === "active" ? "active" : "all";

  return <DriverAssignmentsClient driverSlug={ctx.driverSlug} mode={mode} />;
}
