// Calendar days and wall-clock times in America/Santiago (docs/CLAUDE.md: the
// interface shows Santiago; the database stores UTC). Days are "YYYY-MM-DD".

const TZ = "America/Santiago";

/** Calendar day of an instant in Santiago. */
export const santiagoDay = (date: Date): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const parts = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  hourCycle: "h23",
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
});

/** Santiago's offset from UTC at an instant, in ms. */
const offsetAt = (instant: number): number => {
  const p = Object.fromEntries(
    parts.formatToParts(new Date(instant)).map((x) => [x.type, x.value]),
  );
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute) - instant;
};

/** The instant of a Santiago wall-clock time ("HH:MM") on a day. */
export const santiagoTime = (day: string, time: string): Date => {
  const [y, m, d] = day.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const asUtc = Date.UTC(y, m - 1, d, hh, mm);
  // Two passes: the offset at the guess may differ on a DST change day.
  return new Date(asUtc - offsetAt(asUtc - offsetAt(asUtc)));
};

export const addDays = (day: string, days: number): string => {
  const date = new Date(`${day}T12:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

/** ISO weekday: 1 = Monday … 7 = Sunday. */
export const isoWeekday = (day: string): number =>
  new Date(`${day}T12:00:00Z`).getUTCDay() || 7;

/** Next business day after today (Santiago) at a given time. */
export const nextBusinessDayAt = (
  now: Date,
  businessDays: number[],
  time: string,
): Date => {
  let day = addDays(santiagoDay(now), 1);
  for (let i = 0; i < 7 && !businessDays.includes(isoWeekday(day)); i++) {
    day = addDays(day, 1);
  }
  return santiagoTime(day, time);
};
