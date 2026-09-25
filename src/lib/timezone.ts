const DEFAULT_TIME_ZONE = "UTC";

export function getDeviceTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIME_ZONE;
}

function partsInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== "literal") result[part.type] = part.value;
    return result;
  }, {});
}

function offsetMs(date: Date, timeZone: string) {
  const p = partsInTimeZone(date, timeZone);
  const asUtc = Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day), Number(p.hour), Number(p.minute), Number(p.second));
  return asUtc - date.getTime();
}

/** Converts a wall-clock time in an IANA timezone into the corresponding UTC instant. */
export function zonedTimeToUtc(localDate: string, localTime: string, timeZone: string) {
  const [year, month, day] = localDate.split("-").map(Number);
  const [hour, minute] = localTime.slice(0, 5).split(":").map(Number);
  let candidate = new Date(Date.UTC(year, month - 1, day, hour, minute));
  candidate = new Date(candidate.getTime() - offsetMs(candidate, timeZone));
  const correction = offsetMs(candidate, timeZone);
  return new Date(candidate.getTime() - correction);
}

export function formatInTimeZone(
  value: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = {},
) {
  return new Intl.DateTimeFormat(undefined, { timeZone, ...options }).format(new Date(value));
}

export function formatDateTimeInTimeZone(value: string | Date, timeZone: string) {
  return formatInTimeZone(value, timeZone, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function getZonedDateKey(date: Date, timeZone: string) {
  const p = partsInTimeZone(date, timeZone);
  return `${p.year}-${p.month}-${p.day}`;
}

export function getZonedDayOfWeek(date: Date, timeZone: string) {
  const p = partsInTimeZone(date, timeZone);
  return new Date(Date.UTC(Number(p.year), Number(p.month) - 1, Number(p.day))).getUTCDay();
}

export function getZonedParts(date: Date, timeZone: string) {
  return partsInTimeZone(date, timeZone);
}

export function getTimeZoneLabel(timeZone: string) {
  const offset = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(new Date()).find((part) => part.type === "timeZoneName")?.value;
  return offset ? `${timeZone} (${offset})` : timeZone;
}
