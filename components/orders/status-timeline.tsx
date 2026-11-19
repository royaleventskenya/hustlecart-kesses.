"use client";

// Status timeline — vertical stepper for order status events.
import { Check, Clock, Package, ShoppingBag, Truck, XCircle, Loader2 } from "lucide-react";
import { formatDateShort, humanizeStatus } from "@/lib/format";

type Event = { id: string; status: string; note: string | null; createdAt: string };

const STATUS_FLOW = ["PLACED", "ACCEPTED", "SHOPPING", "OUT_FOR_DELIVERY", "DELIVERED"];

function iconFor(status: string, reached: boolean) {
  const cls = reached ? "text-white" : "text-muted-foreground";
  switch (status) {
    case "PLACED":
      return <ShoppingBag className={`w-3.5 h-3.5 ${cls}`} />;
    case "ACCEPTED":
      return <Check className={`w-3.5 h-3.5 ${cls}`} />;
    case "SHOPPING":
      return <Package className={`w-3.5 h-3.5 ${cls}`} />;
    case "OUT_FOR_DELIVERY":
      return <Truck className={`w-3.5 h-3.5 ${cls}`} />;
    case "DELIVERED":
      return <Check className={`w-3.5 h-3.5 ${cls}`} />;
    case "CANCELLED":
      return <XCircle className={`w-3.5 h-3.5 text-white`} />;
    default:
      return <Clock className={`w-3.5 h-3.5 ${cls}`} />;
  }
}

export function StatusTimeline({
  events,
  current,
  compact = false,
}: {
  events: Event[];
  current: string;
  compact?: boolean;
}) {
  const isCancelled = current === "CANCELLED";

  // Build a merged view: walk through STATUS_FLOW, mark each as reached if it's
  // <= current, and find the actual event timestamp if present.
  const currentIdx = STATUS_FLOW.indexOf(current);

  // If cancelled, show only the events that actually happened + the cancelled one.
  if (isCancelled) {
    return (
      <div className="space-y-3">
        {events.map((e, i) => (
          <TimelineRow
            key={e.id}
            icon={<XCircle className="w-3.5 h-3.5 text-white" />}
            color={e.status === "CANCELLED" ? "bg-destructive" : "bg-muted"}
            label={humanizeStatus(e.status)}
            timestamp={formatDateShort(e.createdAt)}
            note={e.note}
            last={i === events.length - 1}
            compact={compact}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {STATUS_FLOW.map((status) => {
        const reached = currentIdx >= STATUS_FLOW.indexOf(status);
        const ev = events.find((e) => e.status === status);
        const isCurrent = status === current;
        const color = reached
          ? isCurrent
            ? "bg-orange-brand"
            : "bg-success"
          : "bg-muted";
        return (
          <TimelineRow
            key={status}
            icon={
              isCurrent && reached ? (
                <Loader2 className="w-3.5 h-3.5 text-white animate-spin" />
              ) : (
                iconFor(status, reached)
              )
            }
            color={color}
            label={humanizeStatus(status)}
            timestamp={ev ? formatDateShort(ev.createdAt) : reached ? "In progress" : "Pending"}
            note={ev?.note}
            last={status === "DELIVERED"}
            compact={compact}
          />
        );
      })}
    </div>
  );
}

function TimelineRow({
  icon,
  color,
  label,
  timestamp,
  note,
  last,
  compact,
}: {
  icon: React.ReactNode;
  color: string;
  label: string;
  timestamp: string;
  note: string | null;
  last: boolean;
  compact: boolean;
}) {
  return (
    <div className="flex items-start gap-3 relative">
      <div className="flex flex-col items-center">
        <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center shrink-0 z-10`}>
          {icon}
        </div>
        {!last && <div className={`w-0.5 flex-1 ${compact ? "h-4" : "h-6"} bg-border`} />}
      </div>
      <div className={`pt-0.5 ${compact ? "" : "min-h-[1.75rem]"}`}>
        <div className="flex items-baseline gap-2 flex-wrap">
          <span className={`font-semibold text-sm ${compact ? "" : "text-navy"}`}>{label}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        {note && <div className="text-xs text-muted-foreground mt-0.5">{note}</div>}
      </div>
    </div>
  );
}
