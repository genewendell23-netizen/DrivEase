// Date helpers for DrivEase booking validation.
// Accept HTML date (YYYY-MM-DD) and datetime-local (YYYY-MM-DDTHH:mm).
// Return a DATE-only string suitable for MySQL DATE columns.
function normalizeBookingDate(value) {
  const text = String(value || "").trim();
  const match = text.match(/^(\d{4}-\d{2}-\d{2})(?:T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?$/);
  if (!match) return null;

  const datePart = match[1];
  const [year, month, day] = datePart.split("-").map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));

  if (
    check.getUTCFullYear() !== year ||
    check.getUTCMonth() !== month - 1 ||
    check.getUTCDate() !== day
  ) {
    return null;
  }
  return datePart;
}

function manilaToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Manila",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

module.exports = { normalizeBookingDate, manilaToday };
