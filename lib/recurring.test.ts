import { describe, expect, it } from "vitest";
import {
  buildStream,
  categoryBreakdown,
  datesBetween,
  occurrences,
  stepDate,
  totals,
  type StreamEdit,
  type StreamInput,
} from "./recurring";

const TODAY = "2026-11-08";

function input(overrides: Partial<StreamInput>): StreamInput {
  return {
    id: "s1",
    accountId: "a1",
    direction: "outflow",
    name: "Cursor",
    logoUrl: null,
    category: "SUBSCRIPTIONS",
    frequency: "MONTHLY",
    lastCents: 2000,
    lastDate: "2026-10-07",
    predictedNextDate: null,
    status: "MATURE",
    isActive: true,
    charges: [],
    ...overrides,
  };
}

const noEdit: StreamEdit = { name: null, category: null, amountCents: null, frequency: null, nextDate: null, hidden: false };

describe("stepDate", () => {
  it("keeps the anchor day across short months", () => {
    expect(stepDate("2026-01-31", "MONTHLY", 1)).toBe("2026-02-28");
    expect(stepDate("2026-01-31", "MONTHLY", 2)).toBe("2026-03-31");
  });

  it("alternates the two days of a semi-monthly stream", () => {
    expect(datesBetween("2026-11-14", "SEMI_MONTHLY", "2026-11-01", "2027-01-01")).toEqual([
      "2026-11-14",
      "2026-11-29",
      "2026-12-14",
      "2026-12-29",
    ]);
    expect(stepDate("2026-10-30", "SEMI_MONTHLY", 1)).toBe("2026-11-15");
  });

  it("steps weekly, biweekly and yearly", () => {
    expect(stepDate("2026-11-10", "WEEKLY", 2)).toBe("2026-11-24");
    expect(stepDate("2026-11-10", "BIWEEKLY", 1)).toBe("2026-11-24");
    expect(stepDate("2028-02-29", "ANNUALLY", 1)).toBe("2029-02-28");
    expect(stepDate("2026-11-10", "UNKNOWN", 1)).toBeNull();
  });
});

describe("buildStream", () => {
  it("rolls a stale predicted date forward to the next date from today", () => {
    const stream = buildStream(input({ lastDate: "2026-09-21", predictedNextDate: "2026-10-21" }), null, TODAY);
    expect(stream.nextDate).toBe("2026-11-21");
    expect(stream.state).toBe("active");
  });

  it("uses the last charge as the anchor when Plaid has no prediction", () => {
    const stream = buildStream(input({ lastDate: "2026-08-24", isActive: false }), null, TODAY);
    expect(stream.nextDate).toBe("2026-11-24");
    expect(stream.state).toBe("active");
  });

  it("marks a stream possibly inactive after three missed charges and ended after more", () => {
    expect(buildStream(input({ lastDate: "2026-08-07" }), null, TODAY).state).toBe("inactive");
    expect(buildStream(input({ lastDate: "2026-05-12" }), null, TODAY).state).toBe("ended");
    expect(buildStream(input({ status: "TOMBSTONED" }), null, TODAY).state).toBe("ended");
  });

  it("does not count a charge due today as missed", () => {
    const stream = buildStream(input({ lastDate: "2026-10-08" }), null, TODAY);
    expect(stream.nextDate).toBe("2026-11-08");
    expect(stream.state).toBe("active");
  });

  it("takes the amount, dates and price change from the charges", () => {
    const stream = buildStream(
      input({
        lastCents: 1,
        charges: [
          { id: "t1", date: "2026-08-06", amountCents: 10415 },
          { id: "t2", date: "2026-08-24", amountCents: 6438 },
        ],
      }),
      null,
      TODAY,
    );
    expect(stream.amountCents).toBe(6438);
    expect(stream.previousCents).toBe(10415);
    expect(stream.changeCents).toBe(6438 - 10415);
    expect(stream.lastDate).toBe("2026-08-24");
  });

  it("applies user edits over Plaid's values", () => {
    const stream = buildStream(
      input({ predictedNextDate: "2026-11-07" }),
      { ...noEdit, name: "Cursor Pro", category: "BILLS", amountCents: 4000, frequency: "ANNUALLY", nextDate: "2027-01-15" },
      TODAY,
    );
    expect(stream).toMatchObject({
      name: "Cursor Pro",
      category: "BILLS",
      amountCents: 4000,
      frequency: "ANNUALLY",
      nextDate: "2027-01-15",
      state: "active",
      edited: true,
    });
  });

  it("keeps the price change on real charges when the amount is edited", () => {
    const stream = buildStream(
      input({
        charges: [
          { id: "t1", date: "2026-08-06", amountCents: 10415 },
          { id: "t2", date: "2026-08-24", amountCents: 6438 },
        ],
      }),
      { ...noEdit, amountCents: 7000 },
      TODAY,
    );
    expect(stream.amountCents).toBe(7000);
    expect(stream.changeCents).toBe(6438 - 10415);
  });

  it("shows inflow amounts as positive", () => {
    expect(buildStream(input({ direction: "inflow", lastCents: -149587 }), null, TODAY).amountCents).toBe(149587);
  });
});

describe("summaries", () => {
  const streams = [
    buildStream(input({ id: "rh", name: "Robinhood", frequency: "WEEKLY", lastCents: 40000, lastDate: "2026-11-03", category: "SAVINGS" }), null, TODAY),
    buildStream(input({ id: "fee", name: "Fee", frequency: "ANNUALLY", lastCents: 32500, lastDate: "2026-10-22", category: "BILLS" }), null, TODAY),
    buildStream(
      input({ id: "pay", direction: "inflow", frequency: "SEMI_MONTHLY", lastCents: -149587, lastDate: "2026-10-30", predictedNextDate: "2026-11-14", category: "SALARY" }),
      null,
      TODAY,
    ),
    buildStream(input({ id: "old", lastDate: "2026-01-01" }), null, TODAY),
    buildStream(input({ id: "hidden" }), { ...noEdit, hidden: true }, TODAY),
  ];

  it("totals monthly in and out and leaves out ended and hidden streams", () => {
    expect(totals(streams)).toEqual({ inCents: 299174, outCents: 176041, yearlyOutCents: 2112500 });
  });

  it("lists past charges and projected dates in a range", () => {
    const withCharge = buildStream(
      input({ id: "c", lastDate: "2026-11-02", charges: [{ id: "t", date: "2026-11-02", amountCents: 2000 }] }),
      null,
      TODAY,
    );
    expect(occurrences([withCharge], "2026-11-01", "2026-12-31", TODAY).map((item) => [item.date, item.projected])).toEqual([
      ["2026-11-02", false],
      ["2026-12-02", true],
    ]);
  });

  it("breaks monthly cost down by category", () => {
    expect(categoryBreakdown(streams).map((item) => [item.category, item.cents])).toEqual([
      ["SAVINGS", 173333],
      ["BILLS", 2708],
    ]);
  });
});
