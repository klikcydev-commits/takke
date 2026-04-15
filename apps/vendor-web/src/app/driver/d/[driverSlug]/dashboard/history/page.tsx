import { redirect } from "next/navigation";
import { DriverHistoryClient } from "./DriverHistoryClient";
import { requireDriverPage } from "@/lib/driver/validateDriverPage";

export const dynamic = "force-dynamic";

export default async function DriverHistoryPage({
  params,
}: {
  params: Promise<{ driverSlug: string }>;
}) {
  const { driverSlug } = await params;
  const ctx = await requireDriverPage(driverSlug);
  if (!ctx.isApprovedDriver) {
    redirect(`/driver/d/${ctx.driverSlug}/dashboard`);
  }
  return <DriverHistoryClient driverSlug={ctx.driverSlug} />;
}
