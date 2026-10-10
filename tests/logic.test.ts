import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { findOverlaps, knownPlayers, matchOutcome, matchTitle, nextConfirmedMatch, overlaps, splitBookings } from "../src/lib/bookings.ts";
import { matchShareText } from "../src/lib/share.ts";
import {
  addMinutesLocal,
  calendarDaysUntil,
  dateToDhakaLocal,
  dhakaLocalToDate,
  formatDate,
  formatTime,
  formatTimeRange,
} from "../src/lib/time.ts";
import type { Booking, BookingFormInput } from "../src/lib/types.ts";
import { validateBooking } from "../src/lib/validation.ts";
import { BOOKERS } from "../src/config/bookers.ts";

const booking = (over: Partial<Booking> = {}): Booking => ({
  id: "11111111-1111-4111-8111-111111111111",
  venueName: "Kick-Off Arena, Banani",
  startAt: "2026-10-15T13:00:00.000Z", // 7:00 PM Dhaka
  endAt: "2026-10-15T14:30:00.000Z", // 8:30 PM Dhaka
  bookedBy: BOOKERS[0],
  status: "confirmed",
  teamName: null,
  opponentName: "Gulshan Strikers",
  totalCost: 3000,
  advancePaid: 1000,
  contactPhone: "01712-345678",
  mapUrl: "https://maps.app.goo.gl/abc",
  notes: "Bring bibs; white kit",
  squad: ["Mahadi", "Shorup", "Rafi"],
  ourScore: 5,
  opponentScore: 3,
  createdAt: "2026-10-01T00:00:00.000Z",
  updatedAt: "2026-10-01T00:00:00.123456+00:00",
  ...over,
});

const input = (over: Partial<BookingFormInput> = {}): BookingFormInput => ({
  venueName: "Arena",
  startLocal: "2026-10-15T19:00",
  endLocal: "2026-10-15T20:30",
  bookedBy: BOOKERS[0],
  status: "confirmed",
  teamName: "",
  opponentName: "",
  totalCost: "",
  advancePaid: "",
  contactPhone: "",
  mapUrl: "",
  notes: "",
  squad: [],
  ourScore: "",
  opponentScore: "",
  ...over,
});

describe("Asia/Dhaka time handling (machine TZ: " + (process.env.TZ ?? "system") + ")", () => {
  it("converts Dhaka wall clock to UTC explicitly", () => {
    assert.equal(dhakaLocalToDate("2026-10-15T19:00")?.toISOString(), "2026-10-15T13:00:00.000Z");
    assert.equal(dhakaLocalToDate("2026-01-01T00:30")?.toISOString(), "2025-12-31T18:30:00.000Z");
  });
  it("round-trips UTC to Dhaka wall clock", () => {
    assert.equal(dateToDhakaLocal("2026-10-15T13:00:00.000Z"), "2026-10-15T19:00");
    assert.equal(dateToDhakaLocal("2025-12-31T18:30:00Z"), "2026-01-01T00:30");
  });
  it("rejects malformed and impossible dates", () => {
    assert.equal(dhakaLocalToDate("2026-02-30T10:00"), null);
    assert.equal(dhakaLocalToDate("2026-13-01T10:00"), null);
    assert.equal(dhakaLocalToDate("15/10/2026 7pm"), null);
  });
  it("adds minutes across midnight", () => {
    assert.equal(addMinutesLocal("2026-10-15T23:30", 90), "2026-10-16T01:00");
  });
  it("formats in Dhaka regardless of device zone", () => {
    assert.equal(formatTime("2026-10-15T13:00:00.000Z"), "7:00 PM");
    assert.match(formatDate("2026-10-15T13:00:00.000Z"), /Thu,? 15 Oct 2026/);
    assert.equal(formatTimeRange("2026-10-15T13:00:00Z", "2026-10-15T14:30:00Z"), "7:00 PM – 8:30 PM");
  });
  it("counts days remaining using Dhaka calendar days", () => {
    // 11:30 PM Dhaka on the 14th -> match at 7 PM on the 15th is "1 day"
    assert.equal(calendarDaysUntil("2026-10-15T13:00:00Z", Date.parse("2026-10-14T17:30:00Z")), 1);
    // 00:30 Dhaka on the 15th (still the 14th in UTC) -> "today"
    assert.equal(calendarDaysUntil("2026-10-15T13:00:00Z", Date.parse("2026-10-14T18:30:00Z")), 0);
  });
});

describe("validation", () => {
  it("accepts a minimal valid booking and converts to UTC", () => {
    const r = validateBooking(input());
    assert.ok(r.ok);
    assert.equal(r.value.startAt, "2026-10-15T13:00:00.000Z");
    assert.equal(r.value.opponentName, null);
  });
  it("requires venue, times and booker", () => {
    const r = validateBooking(input({ venueName: " ", startLocal: "", endLocal: "", bookedBy: "" }));
    assert.ok(!r.ok);
    assert.deepEqual(Object.keys(r.fieldErrors).sort(), ["bookedBy", "endLocal", "startLocal", "venueName"]);
  });
  it("requires end after start", () => {
    const r = validateBooking(input({ endLocal: "2026-10-15T19:00" }));
    assert.ok(!r.ok && r.fieldErrors.endLocal);
  });
  it("accepts any booked-by name but not an empty or overlong one", () => {
    const r = validateBooking(input({ bookedBy: "  Rafi   Ahmed " }));
    assert.ok(r.ok && r.value.bookedBy === "Rafi Ahmed");
    assert.ok(!validateBooking(input({ bookedBy: "   " })).ok);
    assert.ok(!validateBooking(input({ bookedBy: "x".repeat(61) })).ok);
  });
  it("matches booker names case-insensitively and stores the configured spelling", () => {
    const r = validateBooking(input({ bookedBy: "  sHoRuP " }));
    assert.ok(r.ok && r.value.bookedBy === "Shorup");
    assert.ok(validateBooking(input({ bookedBy: "MAHADI" })).ok);
  });
  it("validates amounts", () => {
    assert.ok(!validateBooking(input({ totalCost: "-5" })).ok);
    assert.ok(!validateBooking(input({ totalCost: "abc" })).ok);
    const tooMuch = validateBooking(input({ totalCost: "1000", advancePaid: "1500" }));
    assert.ok(!tooMuch.ok && tooMuch.fieldErrors.advancePaid);
    const ok = validateBooking(input({ totalCost: "3,000", advancePaid: "3000" }));
    assert.ok(ok.ok && ok.value.totalCost === 3000 && ok.value.advancePaid === 3000);
    assert.ok(validateBooking(input({ advancePaid: "500" })).ok, "advance alone is fine");
  });
  it("only allows http(s) map URLs", () => {
    assert.ok(!validateBooking(input({ mapUrl: "javascript:alert(1)" })).ok);
    assert.ok(!validateBooking(input({ mapUrl: "maps.google.com" })).ok);
    assert.ok(validateBooking(input({ mapUrl: "https://maps.app.goo.gl/xyz" })).ok);
  });
});

describe("squad and result", () => {
  it("cleans the squad: trims, collapses spaces, drops case-insensitive duplicates", () => {
    const r = validateBooking(input({ squad: [" Mahadi ", "rafi  ahmed", "MAHADI", "", "Rafi Ahmed"] }));
    assert.ok(r.ok);
    assert.deepEqual(r.value.squad, ["Mahadi", "rafi ahmed"]);
  });
  it("limits squad size", () => {
    const big = Array.from({ length: 31 }, (_, i) => `Player ${i}`);
    const r = validateBooking(input({ squad: big }));
    assert.ok(!r.ok && r.fieldErrors.squad);
  });
  it("requires both scores or neither, 0-99 whole numbers", () => {
    assert.ok(validateBooking(input({ ourScore: "", opponentScore: "" })).ok);
    const both = validateBooking(input({ ourScore: "5", opponentScore: "0" }));
    assert.ok(both.ok && both.value.ourScore === 5 && both.value.opponentScore === 0);
    assert.ok(!validateBooking(input({ ourScore: "5" })).ok);
    assert.ok(!validateBooking(input({ ourScore: "-1", opponentScore: "2" })).ok);
    assert.ok(!validateBooking(input({ ourScore: "1.5", opponentScore: "2" })).ok);
    assert.ok(!validateBooking(input({ ourScore: "100", opponentScore: "2" })).ok);
  });
  it("derives win/draw/loss", () => {
    assert.equal(matchOutcome({ ourScore: 5, opponentScore: 3 }), "win");
    assert.equal(matchOutcome({ ourScore: 2, opponentScore: 2 }), "draw");
    assert.equal(matchOutcome({ ourScore: 0, opponentScore: 1 }), "loss");
    assert.equal(matchOutcome({ ourScore: null, opponentScore: null }), null);
  });
  it("suggests past players, most frequent first", () => {
    const list = knownPlayers([booking({ squad: ["Rafi", "Mahadi"] }), booking({ squad: ["mahadi", "Tanvir"] })]);
    assert.equal(list[0], "Mahadi");
    assert.deepEqual(list.slice(1).sort(), ["Rafi", "Tanvir"]);
  });
});

describe("team name", () => {
  it("is optional, trimmed, and length-limited", () => {
    const empty = validateBooking(input({ teamName: "   " }));
    assert.ok(empty.ok && empty.value.teamName === null);
    const named = validateBooking(input({ teamName: "  Khelar   FC " }));
    assert.ok(named.ok && named.value.teamName === "Khelar FC");
    assert.ok(!validateBooking(input({ teamName: "x".repeat(121) })).ok);
  });
  it("builds the match title", () => {
    assert.equal(matchTitle({ teamName: "Khelar FC", opponentName: "Gulshan Strikers" }), "Khelar FC vs Gulshan Strikers");
    assert.equal(matchTitle({ teamName: null, opponentName: "Gulshan Strikers" }), "vs Gulshan Strikers");
    assert.equal(matchTitle({ teamName: "Khelar FC", opponentName: null }), "Khelar FC vs TBC");
    assert.equal(matchTitle({ teamName: null, opponentName: null }), "Opponent TBC");
  });
  it("puts the team in the share text", () => {
    assert.match(matchShareText(booking({ teamName: "Khelar FC" })), /^\*⚽ Khelar FC vs Gulshan Strikers\*/);
    assert.match(matchShareText(booking()), /^\*⚽ Match vs Gulshan Strikers\*/);
  });
});

describe("overlaps", () => {
  const a = booking();
  it("detects overlapping non-cancelled slots", () => {
    const b = booking({ id: "b", startAt: "2026-10-15T14:00:00Z", endAt: "2026-10-15T15:00:00Z" });
    assert.ok(overlaps(a, b));
  });
  it("treats back-to-back slots as not overlapping", () => {
    const b = booking({ id: "b", startAt: a.endAt, endAt: "2026-10-15T16:00:00Z" });
    assert.ok(!overlaps(a, b));
  });
  it("ignores cancelled bookings and the booking being edited", () => {
    const cancelled = booking({ id: "c", status: "cancelled" });
    assert.deepEqual(findOverlaps(a, [a, cancelled]), []);
  });
});

describe("grouping", () => {
  const now = Date.parse("2026-10-15T14:00:00Z"); // during the match
  it("keeps an in-progress match upcoming; past only after end time", () => {
    const g = splitBookings([booking()], now);
    assert.equal(g.upcoming.length, 1);
    const later = splitBookings([booking()], Date.parse("2026-10-15T14:30:00Z"));
    assert.equal(later.past.length, 1);
  });
  it("picks the earliest upcoming confirmed match as next", () => {
    const pending = booking({ id: "p", status: "pending", startAt: "2026-10-15T15:00:00Z", endAt: "2026-10-15T16:00:00Z" });
    const later = booking({ id: "l", startAt: "2026-10-20T13:00:00Z", endAt: "2026-10-20T14:00:00Z" });
    const early = booking({ id: "e", startAt: "2026-10-16T13:00:00Z", endAt: "2026-10-16T14:00:00Z" });
    assert.equal(nextConfirmedMatch([later, pending, early], Date.parse("2026-10-15T15:00:00Z"))?.id, "e");
  });
});

describe("sharing", () => {
  it("builds readable share text", () => {
    const text = matchShareText(booking());
    assert.match(text, /vs Gulshan Strikers/);
    assert.match(text, /7:00 PM – 8:30 PM/);
    assert.match(text, /Due ৳2,000/);
    assert.match(text, /Result: 5 – 3 \(Win\)/);
    assert.match(text, /Squad \(3\):\n1\. Mahadi\n2\. Shorup\n3\. Rafi/);
  });
});
