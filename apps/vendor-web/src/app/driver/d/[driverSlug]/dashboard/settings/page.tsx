import { DriverSettingsClient } from "./DriverSettingsClient";
import { requireDriverPage } from "@/lib/driver/validateDriverPage";

export const dynamic = "force-dynamic";

export default async function DriverSettingsPage({
  params,
}: {
  params: Promise<{ driverSlug: string }>;
}) {
  const { driverSlug } = await params;
  const ctx = await requireDriverPage(driverSlug);
  return <DriverSettingsClient driverSlug={ctx.driverSlug} isApproved={ctx.isApprovedDriver} />;
}
