import { AssignmentStatusBadge } from "./AssignmentStatusBadge";

type Row = {
  id: string;
  status: string;
  notes: string | null;
  createdAt: string;
};

export function DeliveryTimeline({ rows }: { rows: Row[] }) {
  if (!rows.length) {
    return <p className="text-sm text-muted-foreground">No tracking events yet.</p>;
  }
  return (
    <ol className="relative border-l border-[var(--color-border)] ml-2 space-y-4">
      {rows.map((r) => (
        <li key={r.id} className="ml-4 relative">
          <div className="absolute w-2 h-2 bg-[var(--color-accent)] rounded-full -translate-x-[calc(0.5rem+2px)] mt-1.5" />
          <time className="text-xs text-muted-foreground">
            {new Date(r.createdAt).toLocaleString()}
          </time>
          <div className="flex flex-wrap items-center gap-2 mt-1">
            <AssignmentStatusBadge status={r.status} />
            {r.notes ? <span className="text-sm text-muted-foreground">{r.notes}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
