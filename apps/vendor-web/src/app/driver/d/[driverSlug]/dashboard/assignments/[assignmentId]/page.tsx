import { redirect } from "next/navigation";
import { DriverAssignmentDetailClient } from "./DriverAssignmentDetailClient";
import { requireDriverPage } from "@/lib/driver/validateDriverPage";

export const dynamic = "force-dynamic";

export default async function DriverAssignmentDetailPage({
  params,
}: {
  params: Promise<{ driverSlug: string; assignmentId: string }>;
}) {
  const { driverSlug, assignmentId } = await params;
  const ctx = await requireDriverPage(driverSlug);
  if (!ctx.isApprovedDriver) {
    redirect(`/driver/d/${ctx.driverSlug}/dashboard`);
  }
  return <DriverAssignmentDetailClient driverSlug={ctx.driverSlug} assignmentId={assignmentId} />;
}
