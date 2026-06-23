import {
  activeCount,
  convert,
  monthlyAmount,
  monthlyTotal,
  nextBillingDate,
  totalByCategory,
  upcomingPayments,
  yearlyTotal,
  type FxRates,
} from "../expenseAnalytics";
import type { Expense } from "../types";

const rates: FxRates = { usdToTry: 40, eurToTry: 45 };

let seq = 0;
function mkExp(p: Partial<Expense> = {}): Expense {
  seq += 1;
  return {
    id: `e${seq}`,
    name: "Sub",
    amount: 10,
    currency: "USD",
    category: "streaming",
    cycle: "monthly",
    billingDay: 15,
    paymentMethod: "",
    active: true,
    notes: "",
    startedAt: 0,
    createdAt: seq,
    ...p,
  };
}

describe("convert", () => {
  it("pivots through TRY", () => {
    expect(convert(10, "USD", rates, "TRY")).toBe(400);
    expect(convert(400, "TRY", rates, "USD")).toBe(10);
    expect(convert(10, "EUR", rates, "TRY")).toBe(450);
  });
  it("guards against a zero rate", () => {
    expect(convert(5, "USD", { usdToTry: 0, eurToTry: 0 }, "TRY")).toBe(5);
  });
});

describe("monthlyAmount", () => {
  it("normalizes yearly to /12 in base currency", () => {
    expect(monthlyAmount(mkExp({ amount: 10 }), rates, "TRY")).toBe(400);
    expect(monthlyAmount(mkExp({ amount: 120, cycle: "yearly" }), rates, "TRY")).toBe(400);
  });
});

describe("monthlyTotal / yearlyTotal", () => {
  const list = [
    mkExp({ amount: 10 }), // 400/mo
    mkExp({ amount: 120, cycle: "yearly" }), // 400/mo
    mkExp({ amount: 100, currency: "TRY", active: false }), // excluded
  ];
  it("sums active expenses only", () => {
    expect(monthlyTotal(list, rates, "TRY")).toBe(800);
  });
  it("yearly is monthly x12", () => {
    expect(yearlyTotal(list, rates, "TRY")).toBe(9600);
  });
  it("counts active subscriptions", () => {
    expect(activeCount(list)).toBe(2);
  });
});

describe("totalByCategory", () => {
  it("groups by category, biggest first", () => {
    const rows = totalByCategory(
      [
        mkExp({ amount: 10, category: "streaming" }), // 400
        mkExp({ amount: 5, category: "music" }), // 200
        mkExp({ amount: 5, category: "streaming" }), // 200 -> streaming 600
      ],
      rates,
      "TRY",
    );
    expect(rows[0]).toEqual({ category: "streaming", total: 600 });
    expect(rows[1]).toEqual({ category: "music", total: 200 });
  });
});

describe("nextBillingDate", () => {
  const from = new Date(2026, 0, 10); // 10 Jan 2026
  it("uses this month when the day hasn't passed", () => {
    expect(nextBillingDate(25, from).getDate()).toBe(25);
    expect(nextBillingDate(25, from).getMonth()).toBe(0);
  });
  it("rolls to next month when the day has passed", () => {
    expect(nextBillingDate(5, from).getMonth()).toBe(1);
  });
  it("clamps to the last day of short months", () => {
    const feb = new Date(2026, 1, 10); // Feb 2026 (28 days)
    expect(nextBillingDate(31, feb).getDate()).toBe(28);
  });
});

describe("upcomingPayments", () => {
  it("returns active payments within the window, soonest first", () => {
    const from = new Date(2026, 0, 10);
    const list = [
      mkExp({ name: "Soon", billingDay: 12 }), // 2 days
      mkExp({ name: "Far", billingDay: 25 }), // 15 days -> out
      mkExp({ name: "Paused", billingDay: 11, active: false }), // out
    ];
    const up = upcomingPayments(list, 7, from);
    expect(up).toHaveLength(1);
    expect(up[0].expense.name).toBe("Soon");
    expect(up[0].daysUntil).toBe(2);
  });
});
