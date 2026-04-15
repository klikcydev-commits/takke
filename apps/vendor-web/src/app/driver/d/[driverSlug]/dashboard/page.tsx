import { DriverOverviewClient } from "./DriverOverviewClient";

export const dynamic = "force-dynamic";

export default async function DriverOverviewPage({
  params,
}: {
  params: Promise<{ driverSlug: string }>;
}) {
  const { driverSlug } = await params;
  return <DriverOverviewClient driverSlug={driverSlug} />;
}
