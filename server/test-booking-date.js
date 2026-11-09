const assert = require("node:assert/strict");
const { normalizeBookingDate, manilaToday } = require("./booking-date");

assert.equal(normalizeBookingDate("2026-11-10"), "2026-11-10");
assert.equal(normalizeBookingDate("2026-11-10T10:21"), "2026-11-10");
assert.equal(normalizeBookingDate("2026-11-10T10:21:35"), "2026-11-10");
assert.equal(normalizeBookingDate("2026-11-10T10:21:35.123"), "2026-11-10");
assert.equal(normalizeBookingDate("2026-02-30"), null);
assert.equal(normalizeBookingDate("not-a-date"), null);
assert.equal(normalizeBookingDate(""), null);
assert.equal(manilaToday(new Date("2026-11-09T02:45:26.000Z")), "2026-11-09");

console.log("DrivEase booking-date tests passed (8 assertions).");
