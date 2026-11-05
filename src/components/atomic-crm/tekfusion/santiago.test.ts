import { nextBusinessDayAt, santiagoDay, santiagoTime } from "./santiago";

const WEEKDAYS = [1, 2, 3, 4, 5];

describe("Santiago time", () => {
  it("proposes the next business day at 10:00, skipping the weekend", () => {
    // Friday 6 Nov 2026, 15:00 in Santiago (UTC−3 in summer time)
    const friday = new Date("2026-11-06T18:00:00Z");

    expect(nextBusinessDayAt(friday, WEEKDAYS, "10:00").toISOString()).toBe(
      "2026-11-09T13:00:00.000Z",
    );
  });

  it("uses tomorrow when it is a business day, also late at night in UTC", () => {
    // Tuesday 10 Nov 2026, 22:30 in Santiago = Wednesday 01:30 UTC
    const tuesdayNight = new Date("2026-11-11T01:30:00Z");

    expect(santiagoDay(tuesdayNight)).toBe("2026-11-10");
    expect(
      nextBusinessDayAt(tuesdayNight, WEEKDAYS, "10:00").toISOString(),
    ).toBe("2026-11-11T13:00:00.000Z");
  });

  it("follows winter time (UTC−4)", () => {
    expect(santiagoTime("2026-07-15", "10:00").toISOString()).toBe(
      "2026-07-15T14:00:00.000Z",
    );
  });
});
