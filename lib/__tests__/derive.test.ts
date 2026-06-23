import { deriveSession, deriveZone } from "../derive";

const at = (h: number, m = 0) => {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

describe("deriveSession", () => {
  it("maps local time to the right killzone", () => {
    expect(deriveSession(at(3))).toBe("asia");
    expect(deriveSession(at(11))).toBe("london");
    expect(deriveSession(at(16))).toBe("ny_am");
    expect(deriveSession(at(19))).toBe("ny_pm");
    expect(deriveSession(at(7))).toBe("other");
    expect(deriveSession(at(23))).toBe("other");
  });

  it("respects window boundaries", () => {
    expect(deriveSession(at(15, 30))).toBe("ny_am");
    expect(deriveSession(at(18, 0))).toBe("ny_pm");
    expect(deriveSession(at(5, 0))).toBe("other"); // asia ends at 05:00
  });
});

describe("deriveZone", () => {
  it("splits the range into thirds", () => {
    expect(deriveZone(100, 70, 95)).toBe("premium");
    expect(deriveZone(100, 70, 75)).toBe("discount");
    expect(deriveZone(100, 70, 85)).toBe("equilibrium");
  });

  it("returns null for an invalid or missing range", () => {
    expect(deriveZone(NaN, 70, 85)).toBeNull();
    expect(deriveZone(70, 100, 85)).toBeNull(); // high below low
  });
});
