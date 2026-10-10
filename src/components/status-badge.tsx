import { STATUS_LABEL } from "@/lib/bookings";
import type { BookingStatus } from "@/lib/types";
import { BanIcon, CheckIcon, ClockIcon } from "./icons";

const STYLES: Record<BookingStatus, string> = {
  confirmed: "bg-pitch-500/15 text-pitch-200 ring-pitch-400/40",
  pending: "bg-amber-400/15 text-amber-100 ring-amber-300/40",
  cancelled: "bg-rose-500/15 text-rose-100 ring-rose-400/40",
};

const ICONS = { confirmed: CheckIcon, pending: ClockIcon, cancelled: BanIcon };

export function StatusBadge({ status }: { status: BookingStatus }) {
  const Icon = ICONS[status];
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${STYLES[status]}`}
    >
      <Icon width={13} height={13} strokeWidth={2.6} />
      {STATUS_LABEL[status]}
    </span>
  );
}
