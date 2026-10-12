import { formatDate } from "@/lib/format";

// Server-safe order timeline (no fetches — pure render from the order
// object). Steps: Placed → Delivered, or the Placed → Cancelled branch.
function Dot({ tone }) {
  const cls =
    tone === "done"
      ? "bg-primary"
      : tone === "cancelled"
        ? "bg-danger"
        : "border-2 border-border-strong bg-surface";
  return <span aria-hidden="true" className={`mt-1 h-3 w-3 shrink-0 rounded-pill ${cls}`} />;
}

export default function OrderTimeline({ order }) {
  const cancelled = order?.orderStatus === "cancelled";
  const delivered = order?.orderStatus === "delivered";
  const steps = cancelled
    ? [
        { label: "Placed", at: order?.createdAt, tone: "done" },
        { label: "Cancelled", at: order?.cancelledAt, tone: "cancelled" },
      ]
    : [
        { label: "Placed", at: order?.createdAt, tone: "done" },
        { label: "Delivered", at: order?.deliveredAt, tone: delivered ? "done" : "pending" },
      ];
  return (
    <ol aria-label="Order timeline" className="space-y-3">
      {steps.map((s) => (
        <li key={s.label} className="flex items-start gap-3">
          <Dot tone={s.tone} />
          <div>
            <p
              className={
                s.tone === "pending"
                  ? "text-sm text-text-subdued"
                  : s.tone === "cancelled"
                    ? "text-sm font-semibold text-danger"
                    : "text-sm font-semibold text-text"
              }
            >
              {s.label}
            </p>
            {s.at && (
              <p className="text-xs text-text-subdued">{formatDate(s.at)}</p>
            )}
          </div>
        </li>
      ))}
    </ol>
  );
}
