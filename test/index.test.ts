import { describe, it, expect } from "vitest";
import { parse } from "../src/index.js";

describe("aliases", () => {
  it.each([
    ["hourly", "0 * * * *"],
    ["daily", "0 0 * * *"],
    ["midnight", "0 0 * * *"],
    ["noon", "0 12 * * *"],
    ["weekly", "0 0 * * 0"],
    ["monthly", "0 0 1 * *"],
    ["yearly", "0 0 1 1 *"],
    ["annually", "0 0 1 1 *"],
  ])("%s → %s", (input, expected) => {
    expect(parse(input)?.cron).toBe(expected);
  });
});

describe("every N units", () => {
  it("every 5 minutes", () => {
    expect(parse("every 5 minutes")?.cron).toBe("*/5 * * * *");
  });
  it("every 1 minute", () => {
    expect(parse("every 1 minute")?.cron).toBe("*/1 * * * *");
  });
  it("every 2 hours", () => {
    expect(parse("every 2 hours")?.cron).toBe("0 */2 * * *");
  });
  it("every 3 days", () => {
    expect(parse("every 3 days")?.cron).toBe("0 0 */3 * *");
  });
  it("rejects out-of-range minute step", () => {
    expect(parse("every 60 minutes")).toBeNull();
  });
});

describe("every <unit>", () => {
  it.each([
    ["every minute", "* * * * *"],
    ["every hour", "0 * * * *"],
    ["every day", "0 0 * * *"],
    ["every week", "0 0 * * 0"],
    ["every month", "0 0 1 * *"],
    ["every year", "0 0 1 1 *"],
  ])("%s → %s", (input, expected) => {
    expect(parse(input)?.cron).toBe(expected);
  });
});

describe("named times", () => {
  it.each([
    ["every morning", "0 9 * * *"],
    ["every afternoon", "0 15 * * *"],
    ["every evening", "0 18 * * *"],
    ["every night", "0 22 * * *"],
  ])("%s → %s", (input, expected) => {
    expect(parse(input)?.cron).toBe(expected);
  });
});

describe("at <time>", () => {
  it("at 9am", () => {
    expect(parse("at 9am")?.cron).toBe("0 9 * * *");
  });
  it("at 9:30am", () => {
    expect(parse("at 9:30am")?.cron).toBe("30 9 * * *");
  });
  it("at 14:00", () => {
    expect(parse("at 14:00")?.cron).toBe("0 14 * * *");
  });
  it("at 3pm", () => {
    expect(parse("at 3pm")?.cron).toBe("0 15 * * *");
  });
  it("at 12am → midnight", () => {
    expect(parse("at 12am")?.cron).toBe("0 0 * * *");
  });
  it("at 12pm → noon", () => {
    expect(parse("at 12pm")?.cron).toBe("0 12 * * *");
  });
});

describe("day-of-week + time", () => {
  it("every monday at 3pm", () => {
    expect(parse("every monday at 3pm")?.cron).toBe("0 15 * * 1");
  });
  it("monday, wednesday and friday at 10:30", () => {
    expect(parse("monday, wednesday and friday at 10:30")?.cron).toBe("30 10 * * 1,3,5");
  });
  it("every weekday at 9am", () => {
    expect(parse("every weekday at 9am")?.cron).toBe("0 9 * * 1-5");
  });
  it("every weekend at 10am", () => {
    expect(parse("every weekend at 10am")?.cron).toBe("0 10 * * 0,6");
  });
  it("rejects unknown day name", () => {
    expect(parse("every blursday at 9am")).toBeNull();
  });
});

describe("day-of-month + month", () => {
  it("the 1st of january at 0:00", () => {
    expect(parse("the 1st of january at 0:00")?.cron).toBe("0 0 1 1 *");
  });
  it("the 15th of march at noon", () => {
    expect(parse("the 15th of march at noon")?.cron).toBe("0 12 15 3 *");
  });
  it("the 1st of jan, jun and dec at 9am", () => {
    expect(parse("the 1st of jan, jun and dec at 9am")?.cron).toBe("0 9 1 1,6,12 *");
  });
});

describe("invalid input", () => {
  it.each([
    "",
    "   ",
    "completely unrelated text",
    "at 25:00",
    "at 9:99am",
    "every 0 minutes",
    "at 13pm",
  ])("rejects %s", (input) => {
    expect(parse(input)).toBeNull();
  });
});
