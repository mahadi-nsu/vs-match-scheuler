import { amountDue, formatBdt, matchOutcome, OUTCOME_LABEL, STATUS_LABEL } from "./bookings.ts";
import { formatDate, formatTimeRange } from "./time.ts";
import type { Booking } from "./types.ts";

/** Plain text that reads well when pasted into WhatsApp or Messenger. */
export function matchShareText(b: Booking): string {
  const title = b.opponentName ? `⚽ Match vs ${b.opponentName}` : "⚽ Football match";
  const lines = [
    `*${title}*`,
    `📍 ${b.venueName}`,
    `📅 ${formatDate(b.startAt)}`,
    `⏰ ${formatTimeRange(b.startAt, b.endAt)}`,
  ];
  if (b.status !== "confirmed") lines.push(`ℹ️ Status: ${STATUS_LABEL[b.status]}`);
  const outcome = matchOutcome(b);
  if (outcome) lines.push(`🏆 Result: ${b.ourScore} – ${b.opponentScore} (${OUTCOME_LABEL[outcome]})`);

  const money: string[] = [];
  if (b.totalCost !== null) money.push(`Total ${formatBdt(b.totalCost)}`);
  if (b.advancePaid !== null) money.push(`Advance ${formatBdt(b.advancePaid)}`);
  const due = amountDue(b);
  if (due !== null && b.advancePaid !== null) money.push(`Due ${formatBdt(due)}`);
  if (money.length) lines.push(`💰 ${money.join(" · ")}`);

  if (b.contactPhone) lines.push(`📞 ${b.contactPhone}`);
  if (b.mapUrl) lines.push(`🗺️ ${b.mapUrl}`);
  if (b.notes) lines.push(`📝 ${b.notes}`);
  if (b.squad.length) lines.push("", `👥 Squad (${b.squad.length}):`, ...b.squad.map((p, i) => `${i + 1}. ${p}`), "");
  lines.push(`Booked by ${b.bookedBy}`);
  return lines.join("\n");
}
