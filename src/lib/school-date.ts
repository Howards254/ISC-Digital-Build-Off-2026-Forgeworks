import { getSchoolTimeZone } from "@/lib/time";

const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

type DateParts = {
  year: number;
  month: number;
  day: number;
};

type DateTimeParts = DateParts & {
  hour: number;
  minute: number;
  second: number;
};

function partsInTimeZone(
  value: Date,
  timeZone: string,
): DateTimeParts {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(value);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");

  return {
    year: get("year"),
    month: get("month"),
    day: get("day"),
    hour: get("hour"),
    minute: get("minute"),
    second: get("second"),
  };
}

function utcFromDateTime(parts: DateTimeParts, millisecond = 0) {
  return Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    millisecond,
  );
}

function offsetAt(value: Date, timeZone: string) {
  const parts = partsInTimeZone(value, timeZone);

  // formatToParts has whole-second precision; drop milliseconds before
  // comparing so an end-of-day value (…:59.999) does not shift the offset.
  return utcFromDateTime(parts) - Math.floor(value.getTime() / 1000) * 1000;
}

function zonedDateTimeToUtc(
  parts: DateParts,
  hour = 0,
  minute = 0,
  second = 0,
  millisecond = 0,
  timeZone = getSchoolTimeZone(),
) {
  const guess = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    hour,
    minute,
    second,
    millisecond,
  );
  let value = guess - offsetAt(new Date(guess), timeZone);
  const correctedOffset = offsetAt(new Date(value), timeZone);

  value = guess - correctedOffset;

  return new Date(value);
}

export function parseDateInput(value: string): DateParts | null {
  const match = DATE_INPUT_PATTERN.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const candidate = new Date(Date.UTC(year, month - 1, day));

  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function getSchoolDateInput(value = new Date()) {
  const parts = partsInTimeZone(value, getSchoolTimeZone());

  return `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(
    parts.day,
  ).padStart(2, "0")}`;
}

export function startOfSchoolDay(value: string): Date | null {
  const parts = parseDateInput(value);

  return parts ? zonedDateTimeToUtc(parts) : null;
}

export function endOfSchoolDay(value: string): Date | null {
  const parts = parseDateInput(value);

  return parts
    ? zonedDateTimeToUtc(parts, 23, 59, 59, 999)
    : null;
}

export function startOfNextSchoolDay(value: string): Date | null {
  const parts = parseDateInput(value);

  if (!parts) {
    return null;
  }

  const next = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + 1));

  return zonedDateTimeToUtc({
    year: next.getUTCFullYear(),
    month: next.getUTCMonth() + 1,
    day: next.getUTCDate(),
  });
}
