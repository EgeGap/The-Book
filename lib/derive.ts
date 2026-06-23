import type { Session, Zone } from "./constants";

/**
 * Auto-derive the trading session from the entry time using ICT killzone
 * windows, in the device's LOCAL time. Pure + testable.
 *
 *   Asya     02:00–05:00
 *   Londra   10:00–13:00
 *   NY Sabah 15:30–18:00
 *   NY ÖS    18:00–21:00
 *   else     Diğer
 */
export function deriveSession(date: Date): Session {
  const minutes = date.getHours() * 60 + date.getMinutes();
  if (minutes >= 120 && minutes < 300) return "asia";
  if (minutes >= 600 && minutes < 780) return "london";
  if (minutes >= 930 && minutes < 1080) return "ny_am";
  if (minutes >= 1080 && minutes < 1260) return "ny_pm";
  return "other";
}

/**
 * Derive premium/discount/equilibrium from a dealing range and the entry price:
 * top third = premium, bottom third = discount, middle = equilibrium.
 * Returns null when no valid range is supplied (zone stays optional).
 */
export function deriveZone(
  rangeHigh: number,
  rangeLow: number,
  entry: number,
): Zone | null {
  const valid = [rangeHigh, rangeLow, entry].every(
    (n) => Number.isFinite(n) && !Number.isNaN(n),
  );
  if (!valid || rangeHigh <= rangeLow) return null;
  const third = (rangeHigh - rangeLow) / 3;
  if (entry >= rangeHigh - third) return "premium";
  if (entry <= rangeLow + third) return "discount";
  return "equilibrium";
}
