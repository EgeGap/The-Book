import { plannedRR, pnlFromR, realizedRR, validateLevels } from "../rr";

describe("validateLevels", () => {
  it("rejects a long whose stop is above entry", () => {
    const v = validateLevels({
      direction: "long",
      entry: 100,
      stopLoss: 110,
      takeProfit: 130,
    });
    expect(v.ok).toBe(false);
    expect(v.errors.stopLoss).toMatch(/BELOW/);
  });

  it("rejects a short whose take profit is above entry", () => {
    const v = validateLevels({
      direction: "short",
      entry: 100,
      stopLoss: 110,
      takeProfit: 130,
    });
    expect(v.errors.takeProfit).toMatch(/BELOW/);
  });

  it("accepts a well-formed long", () => {
    expect(
      validateLevels({ direction: "long", entry: 100, stopLoss: 90, takeProfit: 130 })
        .ok,
    ).toBe(true);
  });
});

describe("plannedRR", () => {
  it("computes reward/risk for a long", () => {
    expect(
      plannedRR({ direction: "long", entry: 100, stopLoss: 90, takeProfit: 130 }),
    ).toBe(3);
  });

  it("computes reward/risk for a short", () => {
    expect(
      plannedRR({ direction: "short", entry: 100, stopLoss: 110, takeProfit: 70 }),
    ).toBe(3);
  });

  it("returns 0 for invalid (inverted) levels", () => {
    expect(
      plannedRR({ direction: "long", entry: 100, stopLoss: 110, takeProfit: 130 }),
    ).toBe(0);
  });
});

describe("realizedRR", () => {
  it("is positive for a long that ran in profit", () => {
    expect(
      realizedRR({ direction: "long", entry: 100, stopLoss: 90 }, 120),
    ).toBe(2);
  });

  it("is negative for a long stopped out", () => {
    expect(
      realizedRR({ direction: "long", entry: 100, stopLoss: 90 }, 90),
    ).toBe(-1);
  });
});

describe("pnlFromR", () => {
  it("translates R into account currency", () => {
    // 2R at 1% risk on a 10k account == $200
    expect(pnlFromR(2, 1, 10_000)).toBe(200);
  });
});
