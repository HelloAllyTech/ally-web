/**
 * Storage and display helpers for DATE custom-field values.
 *
 * A DATE custom field holds a *calendar date* (the day a session happened),
 * not an instant. It is therefore stored as a bare `YYYY-MM-DD` string with no
 * time and no timezone, so every consumer — web, mobile, and the Postgres
 * `CAST(value AS DATE)` used by the session-log filters — reads back the same
 * day the user picked.
 *
 * Before this, web stored `new Date(...).toISOString()`. For a picker in IST
 * (UTC+5:30) that is 18:30 on the *previous* day, e.g. 22 Aug →
 * "2026-08-21T18:30:00.000Z". Web hid the shift by re-rendering in local time,
 * but mobile (which prints the stored string verbatim) and the SQL date filter
 * both saw the 21st.
 */
import { format } from "date-fns";

/**
 * Timezone used to interpret legacy values that still carry a time component.
 * Those rows were written as an instant at local midnight, so the day the user
 * actually picked is the calendar day *in the org's timezone* — reading them in
 * UTC yields the previous day.
 *
 * This is deliberately a single hardcoded org timezone: there is no per-tenant
 * timezone in the data model, every current tenant is in India, and this
 * constant only exists to read rows written before the backfill migration
 * (`NormalizeCustomFieldDateValues`). New writes never take this path.
 */
const LEGACY_DATE_TZ = "Asia/Kolkata";

/** A bare calendar date with no time part, e.g. "2026-08-22". */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `en-CA` formats as `YYYY-MM-DD`, which is exactly the storage shape, so this
 * yields the calendar date in the given zone without any manual offset math.
 */
const legacyDateFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: LEGACY_DATE_TZ,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/**
 * Encode a Date from a picker as the stored calendar date, using the date's
 * *local* fields. `toISOString()` must never be used here — it converts to UTC
 * and rolls the day back for any timezone ahead of it.
 */
export const toCustomFieldDate = (date: Date): string => format(date, "yyyy-MM-dd");

/**
 * Normalize any stored DATE value to `YYYY-MM-DD`. Accepts both the current
 * date-only shape (returned as-is) and legacy full-ISO instants (resolved in
 * the org timezone). Returns null when the value is absent or unparseable, so
 * callers can fall back to an em dash rather than rendering "Invalid Date".
 */
export const normalizeCustomFieldDate = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (DATE_ONLY.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return legacyDateFormatter.format(parsed);
};

/**
 * Parse a stored DATE value into a Date at *local* midnight, for feeding a
 * date picker. Building it from the numeric parts (rather than
 * `new Date("2026-08-22")`, which parses date-only strings as UTC midnight)
 * keeps the picker on the stored day in timezones behind UTC.
 */
export const parseCustomFieldDate = (value: string | null | undefined): Date | null => {
  const normalized = normalizeCustomFieldDate(value);
  if (!normalized) return null;
  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day);
};

/**
 * Encode a date the LLM spoke back ("22 August 2026", or already
 * "2026-08-22") as the stored calendar date.
 *
 * The date-only case must short-circuit: `new Date("2026-08-22")` parses as
 * UTC midnight, so reading its local fields would give the previous day
 * anywhere behind UTC. A prose date has no timezone marker and parses as local
 * midnight, where the local fields are exactly the spoken day.
 */
export const spokenDateToCustomFieldDate = (value: string): string | null => {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (DATE_ONLY.test(trimmed)) return trimmed;
  const parsed = new Date(trimmed);
  if (Number.isNaN(parsed.getTime())) return null;
  return toCustomFieldDate(parsed);
};

/**
 * Format a stored DATE value for display. `dateFormat` is a date-fns pattern;
 * the default matches the rest of the scribe UI.
 */
export const formatCustomFieldDate = (
  value: string | null | undefined,
  dateFormat = "MM/dd/yyyy",
): string | null => {
  const parsed = parseCustomFieldDate(value);
  return parsed ? format(parsed, dateFormat) : null;
};
