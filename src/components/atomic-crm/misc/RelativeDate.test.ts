import { formatRelativeDate } from "./RelativeDate";

describe("formatRelativeDate", () => {
  it("writes recent dates in spanish when the locale is es", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    expect(formatRelativeDate(yesterday, "es")).toMatch(
      /^ayer a las? \d{1,2}:\d{2}$/,
    );
  });

  it("keeps english for the en locale", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    expect(formatRelativeDate(yesterday, "en")).toMatch(/^yesterday at /);
  });
});
