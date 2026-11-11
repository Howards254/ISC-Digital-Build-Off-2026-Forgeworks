const DEFAULT_TIME_ZONE = "Europe/London";

export function getSchoolTimeZone() {
  return process.env.SCHOOL_TIME_ZONE?.trim() || DEFAULT_TIME_ZONE;
}

export function formatClock(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: getSchoolTimeZone(),
  }).format(value);
}

export function formatClockWithSeconds(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: getSchoolTimeZone(),
  }).format(value);
}

export function formatDayLabel(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: getSchoolTimeZone(),
  }).format(value);
}

export function formatDayMonth(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    timeZone: getSchoolTimeZone(),
  }).format(value);
}

export function formatShortDate(value: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: getSchoolTimeZone(),
  }).format(value);
}

export function formatCsvDateTime(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: getSchoolTimeZone(),
  }).formatToParts(value);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get(
    "minute",
  )}`;
}

export function formatDuration(entryAt: Date, exitAt: Date | null) {
  if (!exitAt) {
    return "Inside";
  }

  const minutes = Math.max(
    0,
    Math.floor((exitAt.getTime() - entryAt.getTime()) / 60_000),
  );

  if (minutes < 1) {
    return "<1 min";
  }

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;

  return hours > 0 ? `${hours}h ${String(rest).padStart(2, "0")}m` : `${rest}m`;
}

export function getGreeting(value: Date) {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: getSchoolTimeZone(),
    }).format(value),
  );

  if (hour < 12) {
    return "Good morning";
  }

  if (hour < 18) {
    return "Good afternoon";
  }

  return "Good evening";
}

export function getFirstName(name: string | null | undefined, email: string) {
  const first = name?.trim().split(/\s+/)[0];

  return first || email.split("@")[0] || "there";
}
