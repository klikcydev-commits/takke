const styles: Record<string, string> = {
  ASSIGNED: "bg-slate-100 text-slate-800",
  ACCEPTED: "bg-blue-100 text-blue-900",
  REJECTED: "bg-red-100 text-red-900",
  PICKUP_ARRIVED: "bg-amber-100 text-amber-900",
  PICKED_UP: "bg-indigo-100 text-indigo-900",
  ON_THE_WAY: "bg-cyan-100 text-cyan-900",
  NEAR_CUSTOMER: "bg-violet-100 text-violet-900",
  DELIVERED: "bg-emerald-100 text-emerald-900",
  FAILED: "bg-red-100 text-red-900",
};

export function AssignmentStatusBadge({ status }: { status: string }) {
  const cls = styles[status] ?? "bg-gray-100 text-gray-800";
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${cls}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
